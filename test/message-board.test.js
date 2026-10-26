import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import pg from 'pg'
import { randomUUID } from 'node:crypto'

const testEnv = {
  ...process.env,
  DATABASE_URL: '',
  PGHOST: '/var/run/postgresql',
  PGPORT: '5432',
  PGUSER: process.env.TEST_PGUSER ?? process.env.USER,
  PGDATABASE: 'odin_mini_message_board_test',
}
const schema = 'qa_' + randomUUID().replaceAll('-', '')
testEnv.PGOPTIONS = `-c search_path=${schema}`

const appPath = fileURLToPath(new URL('../app.js', import.meta.url))

async function startServer(t, port = '0', overrides = {}) {
  // A different cwd also checks that view and static paths use the module location.
  const child = spawn(process.execPath, [appPath], {
    cwd: '/tmp',
    env: { ...testEnv, PORT: port, ...overrides },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let output = ''
  let diagnostics = ''
  child.stderr.on('data', (chunk) => {
    diagnostics += chunk
  })
  const ready = new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error('Server startup timed out')),
      10000,
    )
    child.stdout.on('data', (chunk) => {
      output += chunk
      const match = output.match(/http:\/\/localhost:(\d+)/)
      if (match) {
        clearTimeout(timeout)
        resolve(`http://localhost:${match[1]}`)
      }
    })
    child.once('error', (error) => {
      clearTimeout(timeout)
      reject(error)
    })
    child.once('exit', () => {
      clearTimeout(timeout)
      reject(new Error(diagnostics))
    })
  })
  const stop = async () => {
    if (child.exitCode !== null || child.signalCode !== null) return
    const exited = once(child, 'exit')
    child.kill()
    await exited
  }
  t.after(stop)
  return { url: await ready, stop }
}

function messageLinks(html) {
  return [...html.matchAll(/href="(\/messages\/[^"]+)"/g)].map(
    (match) => match[1],
  )
}

const escaped = (value) =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

test('message board PostgreSQL behavior and process lifecycle', async (t) => {
  const admin = new pg.Pool({
    host: '/var/run/postgresql',
    user: testEnv.PGUSER,
    database: 'odin_mini_message_board_test',
  })
  await admin.query(`CREATE SCHEMA ${schema}`)
  const db = new pg.Pool({
    host: '/var/run/postgresql',
    user: testEnv.PGUSER,
    database: 'odin_mini_message_board_test',
    options: `-c search_path=${schema}`,
  })
  t.after(async () => {
    await db.end()
    await admin.query(`DROP SCHEMA ${schema} CASCADE`)
    await admin.end()
  })
  const runScript = async (name) => {
    const child = spawn(
      process.execPath,
      [fileURLToPath(new URL(`../scripts/${name}.js`, import.meta.url))],
      { env: testEnv, stdio: 'pipe' },
    )
    const [code] = await once(child, 'exit')
    assert.equal(code, 0, `${name} succeeded`)
  }
  await runScript('setup')
  await t.test('empty database starts without automatic seeding', async () => {
    const empty = await startServer(t)
    const html = await (await fetch(empty.url)).text()
    assert.equal(messageLinks(html).length, 0)
    assert.match(html, /The board is quiet/)
    await empty.stop()
  })
  await runScript('seed')
  await runScript('setup')
  await runScript('seed')
  assert.equal(
    (await db.query('SELECT count(*)::int AS count FROM messages')).rows[0]
      .count,
    2,
  )
  const server = await startServer(t)
  const get = (path) => fetch(server.url + path)
  const post = (
    body,
    headers = { 'Content-Type': 'application/x-www-form-urlencoded' },
  ) =>
    fetch(server.url + '/new', {
      method: 'POST',
      headers,
      body,
      redirect: 'manual',
    })
  let seededLinks
  let createdLink

  await t.test('seeded board, form, styles and favicon', async () => {
    const response = await get('/')
    assert.equal(response.status, 200)
    const html = await response.text()
    assert.match(html, /Amando/)
    assert.match(html, /Charles/)
    seededLinks = messageLinks(html)
    assert.equal(seededLinks.length, 2)
    assert.equal(new Set(seededLinks).size, 2)
    assert.match(html, /<time datetime="[^"]+">/)
    const form = await get('/new')
    assert.equal(form.status, 200)
    assert.match(await form.text(), /method="POST" action="\/new"/)
    for (const [path, type] of [
      ['/styles.css', 'text/css'],
      ['/favicon.svg', 'image/svg+xml'],
    ]) {
      const asset = await get(path)
      assert.equal(asset.status, 200)
      assert.ok(asset.headers.get('content-type').includes(type))
    }
  })

  await t.test(
    'valid post trims, redirects with 303, escapes and preserves newlines',
    async () => {
      const user = "QA O'Brien-José <script>author</script>"
      const text =
        'Line one\n<script>alert("test")</script>\n' +
        "'); DROP TABLE messages; --" +
        'x'.repeat(1000)
      const before = Date.now()
      const response = await post(
        new URLSearchParams({ user: `  ${user}  `, text: `  ${text}  ` }),
      )
      assert.equal(response.status, 303)
      assert.equal(response.headers.get('location'), '/')
      const html = await (await get('/')).text()
      const links = messageLinks(html)
      assert.equal(links.length, 3)
      assert.deepEqual(links.slice(0, 2), seededLinks)
      createdLink = links.at(-1)
      assert.ok(html.includes(escaped(user).replaceAll("'", '&#39;')))
      assert.ok(
        html.includes(
          escaped(text).replaceAll('"', '&#34;').replaceAll("'", '&#39;'),
        ),
      )
      assert.ok(!html.includes('<script>'))
      const detail = await get(createdLink)
      assert.equal(detail.status, 200)
      const detailHtml = await detail.text()
      assert.ok(detailHtml.includes(escaped(user).replaceAll("'", '&#39;')))
      assert.ok(detailHtml.includes('Line one\n'))
      assert.ok(!detailHtml.includes('<script>'))
      const date = detailHtml.match(/datetime="([^"]+)"/)[1]
      assert.ok(Date.parse(date) >= before)
      assert.equal(messageLinks(await (await get('/')).text()).length, 3)
    },
  )

  await t.test(
    'invalid and malformed fields return 400 and add nothing',
    async () => {
      const invalid = [
        '',
        'user=&text=',
        'user=+++&text=+++',
        new URLSearchParams({
          user: 'a'.repeat(81),
          text: 'Preserved message',
        }),
        new URLSearchParams({
          user: 'Preserved Author',
          text: 'x'.repeat(2001),
        }),
        'user[]=one&user[]=two&text=Preserved',
        'user[name]=object&text=Preserved',
        'user=Preserved&text[]=one&text[]=two',
        'user=Preserved&text[nested]=object',
        'user=one&user=two&text=Preserved',
      ]
      for (const body of invalid) {
        const response = await post(body)
        assert.equal(response.status, 400, String(body).slice(0, 100))
        assert.match(await response.text(), /Please check your message/)
      }
      const response = await post(
        new URLSearchParams({ user: '  Keep <me>  ', text: '  ' }),
      )
      const html = await response.text()
      assert.ok(html.includes('value="  Keep &lt;me&gt;  "'))
      assert.match(html, /Message is required/)
      const unsupported = await post('{"user":"test"}', {
        'Content-Type': 'application/json',
      })
      assert.equal(unsupported.status, 400)
      assert.equal(messageLinks(await (await get('/')).text()).length, 3)
    },
  )

  await t.test('length boundaries are accepted', async () => {
    assert.equal(
      (
        await post(
          new URLSearchParams({ user: 'a'.repeat(80), text: 'b'.repeat(2000) }),
        )
      ).status,
      303,
    )
    assert.equal(messageLinks(await (await get('/')).text()).length, 4)
  })

  await t.test('custom 404s and oversized request handling', async () => {
    for (const path of [
      '/missing',
      '/messages/unknown-id',
      `/messages/${randomUUID()}`,
    ]) {
      const response = await get(path)
      assert.equal(response.status, 404)
      assert.match(await response.text(), /Back to the board/)
    }
    const response = await post('user=QA&text=' + 'x'.repeat(110000))
    assert.equal(response.status, 413)
    const html = await response.text()
    assert.match(html, /Please submit a smaller, valid form/)
    assert.ok(!html.includes('PayloadTooLargeError'))
  })

  await t.test(
    'separate processes and restarts retain messages without automatic seeding',
    async () => {
      const other = await startServer(t)
      assert.equal(
        messageLinks(await (await fetch(other.url)).text()).length,
        4,
      )
      await other.stop()
      await server.stop()
      const restarted = await startServer(t)
      const html = await (await fetch(restarted.url)).text()
      assert.equal(messageLinks(html).length, 4)
      assert.equal((await fetch(restarted.url + createdLink)).status, 200)
    },
  )
  await t.test(
    'schema and seed preserve existing messages and enforce constraints',
    async () => {
      await runScript('setup')
      await runScript('seed')
      assert.equal(
        (await db.query('SELECT count(*)::int AS count FROM messages')).rows[0]
          .count,
        4,
      )
      for (const [author, text] of [
        ['', 'valid'],
        ['a'.repeat(81), 'valid'],
        ['valid', ''],
        ['valid', 'b'.repeat(2001)],
        [null, 'valid'],
      ]) {
        await assert.rejects(
          db.query(
            'INSERT INTO messages (id, author, text) VALUES ($1, $2, $3)',
            [randomUUID(), author, text],
          ),
        )
      }
    },
  )
  await t.test(
    'database failures return generic 500 without leaking diagnostics',
    async () => {
      const unavailable = await startServer(t, '0', {
        PGHOST: '127.0.0.1',
        PGPORT: '1',
      })
      const response = await fetch(unavailable.url)
      assert.equal(response.status, 500)
      const html = await response.text()
      assert.match(html, /We could not complete your request/)
      assert.ok(!/ECONNREFUSED|postgresql:|stack|password/i.test(html))
      const write = await fetch(unavailable.url + '/new', {
        method: 'POST',
        body: new URLSearchParams({
          user: 'QA',
          text: 'Must not fall back to memory',
        }),
      })
      assert.equal(write.status, 500)
      const missing = await fetch(unavailable.url + '/messages/not-a-uuid')
      assert.equal(missing.status, 404)
      await unavailable.stop()
    },
  )
})
