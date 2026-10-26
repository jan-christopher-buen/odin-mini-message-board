import { Router } from 'express'
import { getMessages, getMessage, createMessage } from '../db/queries.js'

const indexRouter = Router()
const limits = { user: 80, text: 2000 }

indexRouter.get('/', async (req, res) => {
  const messages = await getMessages()
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
indexRouter.post('/new', async (req, res) => {
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
  await createMessage(values.user.trim(), values.text.trim())
  res.redirect(303, '/')
})
indexRouter.get('/messages/:messageId', async (req, res) => {
  const message = await getMessage(req.params.messageId)
  if (!message) {
    return res.status(404).render('404', {
      title: 'Message not found',
      message:
        'This message could not be found. Check the link or return to the board.',
    })
  }
  res.render('message', { title: `Message from ${message.user}`, message })
})

export default indexRouter
