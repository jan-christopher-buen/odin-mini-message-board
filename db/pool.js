import pg from 'pg'

if (!process.env.DATABASE_URL && !process.env.PGDATABASE) {
  throw new Error(
    'Set PGDATABASE for local PostgreSQL or DATABASE_URL for hosted PostgreSQL.',
  )
}

const options = { connectionTimeoutMillis: 5000 }
if (process.env.DATABASE_URL) {
  let url
  try {
    url = new URL(process.env.DATABASE_URL)
    if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error()
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection URL.')
  }
  // Hosted connections always verify the server certificate and hostname.
  url.searchParams.set('sslmode', 'verify-full')
  options.connectionString = url.toString()
}

const pool = new pg.Pool(options)
pool.on('error', (error) => {
  console.error(
    'Idle database connection failed:',
    error.code ?? 'DATABASE_ERROR',
  )
})
export default pool
