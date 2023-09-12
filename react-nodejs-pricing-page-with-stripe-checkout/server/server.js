const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const { StageApi, Configuration } = require('stage-typescript')
const Database = require('./database')
require('dotenv').config()

const stageApi = new StageApi(
  new Configuration({
    accessToken: process.env.STAGE_READ_WRITE_API_KEY,
    basePath: 'https://api.heystage.com/sdk-api',
    baseOptions: {
      headers: {
        accept: 'application/vnd.heystage.v1+json',
      },
    },
  }),
)

const app = express()
const port = 3001
const database = new Database()

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
)
app.use(express.json())
app.use(cookieParser())

app.get('/', async (req, res) => {
  const data = await database.getAllUsers()
  res.json(data)
})

app.post('/register', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) return res.status(400).send('a username and password are required')

  // create our user in our in-memory database
  await database.createUser(username, username, password)

  // register user with stage and give it some identifier so that we can refence it
  // in the future. This identifier needs to be unique, such as an email address,
  // username, or randomly generated uuid. You just need a way to reference it from
  // your own systems. For this example, we'll simply use the username.
  stageApi.createUser({
    identifier: username,
  })

  res.status(200).send('ok')
})

app.post('/login', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) return res.status(400).send('a username and password are required')

  const user = await database.getUser(username)
  if (!user) return res.status(401).send('invalid username or password')

  // As this is a simple sample application, I'm storying the password as plain text.
  if (password !== user.password) return res.status(401).send('invalid username or password')

  // Create a basic session cookie
  res.cookie('session', 'normallyAJwtTokenMightGoHere', { maxAge: 15 * 60 * 1000, httpOnly: true })

  // At this point, normally you would create a session cookie. As this is an example, I'm simply
  // returning a 200 to which our sample frontend will see and consider the login successful along with
  // a cookie containing our users info
  res.cookie('user', JSON.stringify({ id: user.id, username: user.username })).sendStatus(200)
})

app.post('/checkout', async (req, res) => {
  const { planIdentifier } = req.body
  if (!req.cookies.session) return res.status(401).send('you must be logged in to checkout')
  if (!planIdentifier) return res.status(400).send('a Stage plan identifier is required')

  // fetch the plan we are attempting to checkout with
  const planData = (await stageApi.getPlansForUsers()).data

  // check that our plan is available for purchase and not in a draft state
  const planIsAvailable = (planData?.items?.filter((p) => !p.draft && p.identifier === planIdentifier)).length === 1
  if (!planIsAvailable) res.status(409).send(`plan with ${planIdentifier} is not available or not found.`)

  // get our current user sessions uuid
  const userIdentifier = JSON.parse(req.cookies.user).username

  // create the checkout session with Stage and send the checkout URL to our frontend, the frontend will
  // then redirect the user to that url to complete the checkout process with Stripe
  const checkoutUrl = (
    await stageApi.createUserCheckoutSession(userIdentifier, planIdentifier, {
      successUrl: req.get('origin'),
      cancelUrl: req.get('origin'),
      billingInterval: 'MONTH',
    })
  ).data

  res.status(200).json(checkoutUrl)
})

// Delete the sessionc cookie
app.get('/logout', async (req, res) => {
  res.clearCookie('session')
  res.clearCookie('user')
  return res.sendStatus(200)
})

// If the session cookie exists, assume we are logged in still.
app.get('/isLoggedIn', async (req, res) => {
  if (req.cookies.session) return res.sendStatus(200)
  return res.sendStatus(401)
})

if (!process.env.STAGE_READ_WRITE_API_KEY) {
  console.log('The STAGE_READ_WRITE_API_KEY is unset in your required .env file.')
} else {
  app.listen(port, () => {
    console.log(`Server is listening on port ${port}`)
  })
}
