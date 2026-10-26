import { readFile } from 'node:fs/promises'
import pool from '../db/pool.js'

try {
  await pool.query(
    await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8'),
  )
  console.log('Message schema is ready.')
} catch (error) {
  console.error('Schema setup failed:', error.code ?? 'DATABASE_ERROR')
  process.exitCode = 1
} finally {
  await pool.end()
}
