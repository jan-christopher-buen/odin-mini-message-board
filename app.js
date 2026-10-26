import express from 'express'
import { fileURLToPath } from 'node:url'
import indexRouter from './routes/indexRouter.js'

const app = express()
app.set('view engine', 'ejs')
app.set('views', fileURLToPath(new URL('./views', import.meta.url)))
app.locals.formatDate = (date) =>
  new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(date) + ' UTC'

app.use(express.static(fileURLToPath(new URL('./public', import.meta.url))))
app.use(express.urlencoded({ extended: true }))
app.use('/', indexRouter)
app.use((req, res) => {
  res.status(404).render('404', {
    title: 'Page not found',
    message: 'This page could not be found.',
  })
})
app.use((error, req, res, next) => {
  console.error(error)
  if (res.headersSent) return next(error)
  // Body-parser failures are client errors, rather than unexpected server failures.
  const status = error.status >= 400 && error.status < 500 ? error.status : 500
  res.status(status).render('error', {
    title:
      status === 500 ? 'Something went wrong' : 'Request could not be read',
    message:
      status === 500
        ? 'We could not complete your request. Please try again.'
        : 'Please submit a smaller, valid form and try again.',
  })
})

const port = process.env.PORT ?? 3000
const server = app.listen(port)
server.on('listening', () => {
  console.log(
    `Mini Message Board is listening on http://localhost:${server.address().port}`,
  )
})
server.on('error', (error) => {
  console.error('Unable to start Mini Message Board:', error.message)
  process.exitCode = 1
})
