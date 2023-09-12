import React from 'react'
import { Configuration, StageApi } from 'stage-typescript'

import './App.css'
import Cookies from 'js-cookie'

const SERVER_URL = 'http://localhost:3001'

const stageApi = new StageApi(
  new Configuration({
    // The read-only key is safe to use in your frontend react application.
    // Do not use a read-write key on the frontend application.
    // Update this in the project .env file
    accessToken: process.env.REACT_APP_STAGE_READ_ONLY_API_KEY,
    basePath: 'https://api.heystage.com/sdk-api',
    baseOptions: {
      headers: {
        accept: 'application/vnd.heystage.v1+json',
        origin: window.location.href, // for browser integrations
      },
    },
  }),
)

// Simple fetch wrappers
function get(path) {
  return fetch(`${SERVER_URL}/${path}`, {
    method: 'GET',
    mode: 'cors',
    credentials: 'include',
  })
}
function post(path, body) {
  return fetch(`${SERVER_URL}/${path}`, {
    method: 'POST',
    mode: 'cors',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}

function App() {
  // stage
  const [userInfo, setUserInfo] = React.useState()
  const [plans, setPlans] = React.useState()
  const [subscribedPlan, setSubscribedPlan] = React.useState()

  // basic user registration
  const [showRegister, setShowRegister] = React.useState(false)
  const [username, setUsername] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [confPassword, setConfPassword] = React.useState('')
  const [isLoggedIn, setIsLoggedIn] = React.useState(false)

  // Fake loading
  const [loading, setLoading] = React.useState(true)

  const handleRegister = async () => {
    post('register', { username, password })
      .then(() => {
        setPassword('')
        setConfPassword('')
        setShowRegister(false)
      })
      .catch((err) => console.error(err))
  }

  const handleLogin = async () => {
    post('login', { username, password })
      .then((resp) => {
        if (resp.status !== 200) {
          return alert('Invalid Username or Password')
        }
        setIsLoggedIn(true)
        setLoading(false)
        fetchSubscriptionAndPlans()
      })
      .catch((err) => {
        console.error(err)
      })
  }

  const handleLogout = async () => {
    get('logout').then(() => {
      return window.location.reload()
    })
  }

  // Passes the plan identifier of the plan we want to purchase to our server side `checkout` controller
  // which will then tell Stage to create a Stripe checkout session and hand us back the URL for that checkout.
  // Then all we need to do is forward the demo user to that Stripe url.
  const handlePlanCheckout = async (planId) => {
    post('checkout', { planIdentifier: planId })
      .then((resp) => {
        if (resp.status !== 200) {
          return alert('An error occurred attempting to create the checkout session.')
        }
        return resp.json()
      })
      .then((data) => {
        // forward to the Stripe checkout url provided by Stage
        return (window.location.href = data.url)
      })
  }

  // Get the users current Subscription information and available plans they can choose from.
  // We then use this data to generate our plan & pricing page.
  async function fetchSubscriptionAndPlans() {
    const userSessionData = Cookies.get('user')
    if (userSessionData) {
      const userPlanData = (await stageApi.getUserPlans(JSON.parse(userSessionData).username)).data
      setSubscribedPlan(userPlanData.planIdentifier)
      setPlans(userPlanData?.plans?.items.filter((p) => !p.draft))
      setUserInfo(JSON.parse(userSessionData))
    }
  }

  // Every time we refresh the page we want to check that our demo user still has a session,
  // this is needed because once the demo user finishes the stripe checkout, stripe will forward
  // them back to this demo application and we don't want to display the log in screen.
  React.useEffect(() => {
    get('isLoggedIn').then((resp) => {
      if (resp.status === 200) {
        fetchSubscriptionAndPlans()
        setIsLoggedIn(true)
      } else {
        setIsLoggedIn(false)
      }
    })
  }, [])

  React.useEffect(() => {
    if (isLoggedIn) {
      // faked loading to give Stage a second sync the new subscription from stripe
      setTimeout(() => {
        fetchSubscriptionAndPlans()
        setLoading(false)
      }, [2500])
    }
  }, [isLoggedIn])

  // The Login and Register components
  const renderLoginOrRegister = () => {
    if (showRegister)
      return (
        <div className="login-container">
          <input
            type="text"
            value={username}
            placeholder="Choose username"
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="password"
            value={password}
            placeholder="Choose password"
            onChange={(e) => setPassword(e.target.value)}
          />
          <input
            type="password"
            value={confPassword}
            placeholder="Confirm password"
            onChange={(e) => setConfPassword(e.target.value)}
          />
          <button disabled={!password || !confPassword || password !== confPassword} onClick={handleRegister}>
            Register
          </button>
          <div className="register-link" onClick={() => setShowRegister(false)}>
            login with demo account
          </div>
        </div>
      )
    return (
      <div className="login-container">
        <input type="text" value={username} placeholder="Username" onChange={(e) => setUsername(e.target.value)} />
        <input type="password" value={password} placeholder="Password" onChange={(e) => setPassword(e.target.value)} />
        <button disabled={!username || !password} onClick={handleLogin}>
          Login
        </button>
        <div className="register-link" onClick={() => setShowRegister(true)}>
          register demo account
        </div>
      </div>
    )
  }
  // The Plan and Pricing page component
  const renderPlans = () => {
    return (
      <>
        {plans && (
          <>
            <div className="welcome">
              You are logged in as <span>{userInfo?.username}</span>
            </div>
            <div className="subtitle" style={{ fontStyle: 'italic' }}>
              Purchase a plan to try out the Stage checkout process
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
            <div className="title-separator" style={{ marginBottom: 50 }} />
          </>
        )}
        <div className="plan-container">
          {!plans && (
            <div className="lds-ellipsis">
              <div></div>
              <div></div>
              <div></div>
              <div></div>
            </div>
          )}
          {plans &&
            plans.map((plan) => (
              <div key={plan.identifier} className="plan-item">
                <div className="plan-name">{plan.name}</div>
                <div className="plan-divider" />
                <div className="plan-description">{plan.description}</div>
                <div className="plan-divider" />
                <div className="plan-features">
                  {plan.features.items.map((feature) => (
                    <div key={feature.identifier} className="plan-feature">
                      <div style={{ fontSize: 15 }}>{feature.name}</div>
                      <div style={{ fontSize: 13, fontWeight: 'bold' }}>
                        {feature.limit ? ` x ${feature.limit}` : `∞`}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="plan-divider" />
                <div className="plan-pricing">
                  {plan.monthlyUnitAmount === 0 ? (
                    <div style={{ fontSize: 32, fontWeight: 'bold' }}>Free</div>
                  ) : (
                    <>
                      <div style={{ fontWeight: 'bold' }}>${plan.monthlyUnitAmount / 100} / month</div>
                      {plan.yearlyUnitAmount > 0 && (
                        <div style={{ fontWeight: 'bold' }}>${plan.yearlyUnitAmount / 100} / year</div>
                      )}
                    </>
                  )}
                </div>
                {plan.identifier === subscribedPlan ? (
                  <button disabled className="plan-purchase-btn">
                    Currently Subscribed
                  </button>
                ) : (
                  <button
                    disabled={loading && isLoggedIn}
                    className="plan-purchase-btn"
                    onClick={() => handlePlanCheckout(plan.identifier)}
                  >
                    {loading && isLoggedIn ? (
                      <div className="lds-ellipsis">
                        <div></div>
                        <div></div>
                        <div></div>
                        <div></div>
                      </div>
                    ) : (
                      'Purchase'
                    )}
                  </button>
                )}
              </div>
            ))}
        </div>
      </>
    )
  }

  // If the demo user is logged in, render our Plan & Pricing page.
  // Else, render the Login / Register component
  return (
    <div className="App">
      <header className="App-header">
        <div className="title">Stage Demo Application</div>
        <div className="title-separator" />
        {isLoggedIn ? (
          renderPlans()
        ) : (
          <>
            <div className="subtitle">
              Renders a Plan & Pricing page powered by <span>Stage</span>
            </div>
            <div className="subtitle">
              Subscribe a demo user to a plan powered by <span>Stripe & Stage</span>
            </div>
            <div className="title-separator" style={{ marginBottom: 50 }} />
            {renderLoginOrRegister()}
          </>
        )}
      </header>
    </div>
  )
}

export default App
