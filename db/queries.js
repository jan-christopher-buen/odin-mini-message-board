import { randomUUID } from 'node:crypto'
import pool from './pool.js'

export async function getMessages() {
  const { rows } = await pool.query(
    'SELECT id, author AS "user", text, added FROM messages ORDER BY added ASC, id ASC',
  )
  return rows
}

export async function getMessage(id) {
  // Invalid UUIDs are unknown URLs, rather than database errors.
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  )
    return undefined
  const { rows } = await pool.query(
    'SELECT id, author AS "user", text, added FROM messages WHERE id = $1',
    [id],
  )
  return rows[0]
}

export async function createMessage(user, text) {
  await pool.query(
    'INSERT INTO messages (id, author, text) VALUES ($1, $2, $3)',
    [randomUUID(), user, text],
  )
}
