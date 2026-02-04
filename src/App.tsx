import './App.css'
import { logosmbbg } from './asserts'
import { useEffect, useMemo, useState } from 'react'

type Countdown = {
  days: number
  hours: number
  minutes: number
  seconds: number
}

function getCountdown(target: Date): Countdown {
  const now = Date.now()
  const diff = Math.max(0, target.getTime() - now)
  const totalSeconds = Math.floor(diff / 1000)
  const days = Math.floor(totalSeconds / (60 * 60 * 24))
  const hours = Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60))
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60)
  const seconds = totalSeconds % 60
  return { days, hours, minutes, seconds }
}

function App() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const targetDate = useMemo(() => new Date('2026-05-12T00:00:00'), [])
  const [countdown, setCountdown] = useState<Countdown>(() => getCountdown(targetDate))

  useEffect(() => {
    const id = setInterval(() => {
      setCountdown(getCountdown(targetDate))
    }, 1000)
    return () => clearInterval(id)
  }, [targetDate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const endpoint =
      (import.meta.env.VITE_EMAIL_ENDPOINT as string | undefined) || '/api/subscribe'
    const token = import.meta.env.VITE_EMAIL_TOKEN as string | undefined
    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedEmail) {
      setError('Please enter a valid email.')
      return
    }

    if (!endpoint) {
      setError('Email endpoint is not configured yet.')
      return
    }

    const stored = localStorage.getItem('entru_emails')
    const seen = stored ? (JSON.parse(stored) as string[]) : []
    if (seen.includes(normalizedEmail)) {
      setError('This email is already on the list.')
      return
    }

    try {
      const isExternal = endpoint.startsWith('http')
      const res = await fetch(endpoint, {
        method: 'POST',
        mode: isExternal ? 'no-cors' : 'cors',
        headers: isExternal
          ? { 'Content-Type': 'text/plain' }
          : {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : null),
            },
        body: JSON.stringify({ email: normalizedEmail, source: 'coming-soon' }),
      })

      if (!isExternal && !res.ok) {
        throw new Error('Request failed')
      }

      const next = [...seen, normalizedEmail].slice(-200)
      localStorage.setItem('entru_emails', JSON.stringify(next))
      setSubmitted(true)
      setEmail('')
    } catch {
      setError('Could not submit. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-paper text-slate-900">
      <div className="page">
        <header className="header">
          <div className="brand">
            <img src={logosmbbg} alt="Entru" className="logo" />
          </div>
          <span className="pill">Private beta</span>
        </header>

        <main className="card">
          <div className="card-body">
            <span className="eyebrow">Coming soon</span>
            <h1 className="title">The modern event registration platform.</h1>
            <p className="subtitle">
              A single app and web experience for public and private events with flexible forms, payments,
              approvals, and wallet passes.
            </p>

            <div className="countdown">
              <div>
                <p className="count-value">{countdown.days}</p>
                <p className="count-label">Days</p>
              </div>
              <div>
                <p className="count-value">{countdown.hours}</p>
                <p className="count-label">Hours</p>
              </div>
              <div>
                <p className="count-value">{countdown.minutes}</p>
                <p className="count-label">Minutes</p>
              </div>
              <div>
                <p className="count-value">{countdown.seconds}</p>
                <p className="count-label">Seconds</p>
              </div>
            </div>

            {!submitted ? (
              <form onSubmit={handleSubmit} className="form">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="input"
                  required
                />
                <button type="submit" className="button">
                  Request access
                </button>
              </form>
            ) : (
              <div className="success">Thanks. You are on the early access list.</div>
            )}

            {error ? <p className="error">{error}</p> : null}
          </div>
        </main>

        <footer className="footer">
          <div className="footer-links">
            <a href="#" className="link">
              Twitter
            </a>
            <a href="https://www.instagram.com/entru.xyz/" className="link" rel="noreferrer">
              Instagram
            </a>
            <a href="#" className="link">
              LinkedIn
            </a>
          </div>
          <p>Launch date: May 12, 2026</p>
        </footer>
      </div>
    </div>
  )
}

export default App
