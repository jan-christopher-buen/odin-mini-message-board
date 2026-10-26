import pool from '../db/pool.js'

try {
  // Fixed sample IDs make this explicit seed command safe to repeat.
  await pool.query(`INSERT INTO messages (id, author, text) VALUES
    ('00000000-0000-4000-8000-000000000001', 'Amando', 'Hi there! Welcome to our little corner of the internet.'),
    ('00000000-0000-4000-8000-000000000002', 'Charles', 'Hello World! Leave a thought, a greeting, or something that made you smile today.')
    ON CONFLICT (id) DO NOTHING`)
  console.log('Sample messages are ready.')
} catch (error) {
  console.error('Seeding failed:', error.code ?? 'DATABASE_ERROR')
  process.exitCode = 1
} finally {
  await pool.end()
}
