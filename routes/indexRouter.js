import { Router } from 'express'
import { randomUUID } from 'node:crypto'

const messages = [
  {
    id: randomUUID(),
    text: 'Hi there! Welcome to our little corner of the internet.',
    user: 'Amando',
    added: new Date(),
  },
  {
    id: randomUUID(),
    text: 'Hello World! Leave a thought, a greeting, or something that made you smile today.',
    user: 'Charles',
    added: new Date(),
  },
]
const indexRouter = Router()
const limits = { user: 80, text: 2000 }

indexRouter.get('/', (req, res) => {
  res.render('index', { title: 'Message board', messages })
})
indexRouter.get('/new', (req, res) => {
  res.render('form', {
    title: 'New message',
    values: { user: '', text: '' },
    errors: {},
    limits,
  })
})
indexRouter.post('/new', (req, res) => {
  const values = {}
  const errors = {}
  for (const field of ['user', 'text']) {
    const value = req.body?.[field]
    const label = field === 'user' ? 'Author' : 'Message'
    values[field] = typeof value === 'string' ? value : ''
    if (typeof value !== 'string')
      errors[field] = `${label} must be a single text value.`
    else if (!value.trim()) errors[field] = `${label} is required.`
    else if (value.trim().length > limits[field])
      errors[field] = `${label} must be ${limits[field]} characters or fewer.`
  }
  if (Object.keys(errors).length) {
    return res
      .status(400)
      .render('form', { title: 'Check your message', values, errors, limits })
  }
  messages.push({
    id: randomUUID(),
    text: values.text.trim(),
    user: values.user.trim(),
    added: new Date(),
  })
  res.redirect(303, '/')
})
indexRouter.get('/messages/:messageId', (req, res) => {
  const message = messages.find(
    (message) => message.id === req.params.messageId,
  )
  if (!message) {
    return res.status(404).render('404', {
      title: 'Message not found',
      message:
        'This message could not be found. It may have disappeared when the server restarted.',
    })
  }
  res.render('message', { title: `Message from ${message.user}`, message })
})

export default indexRouter
