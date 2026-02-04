import crypto from 'node:crypto'

function base64Url(input: string) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

async function getAccessToken() {
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n')
  const now = Math.floor(Date.now() / 1000)

  if (!clientEmail || !privateKey) {
    throw new Error('Google Sheets credentials are not configured.')
  }

  const header = { alg: 'RS256', typ: 'JWT' }
  const claims = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }

  const unsignedToken = `${base64Url(JSON.stringify(header))}.${base64Url(
    JSON.stringify(claims),
  )}`
  const signature = crypto
    .createSign('RSA-SHA256')
    .update(unsignedToken)
    .sign(privateKey, 'base64')
  const jwt = `${unsignedToken}.${signature
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')}`

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  if (!tokenRes.ok) {
    throw new Error('Unable to fetch Google access token.')
  }

  const tokenData = await tokenRes.json()
  return tokenData.access_token as string
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const { email, source } = req.body ?? {}
  if (!email || typeof email !== 'string') {
    res.status(400).json({ error: 'Email is required.' })
    return
  }

  const sheetId = process.env.GOOGLE_SHEETS_SHEET_ID
  const sheetTab = process.env.GOOGLE_SHEETS_TAB_NAME || 'Sheet1'

  if (!sheetId) {
    res.status(500).json({ error: 'Sheet ID is not configured.' })
    return
  }

  try {
    const accessToken = await getAccessToken()
    const now = new Date().toISOString()
    const values = [[now, email, source || 'coming-soon', req.headers['user-agent'] || '']]

    const appendRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(
        sheetTab,
      )}!A:D:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values }),
      },
    )

    if (!appendRes.ok) {
      throw new Error('Unable to write to Google Sheet.')
    }

    res.status(200).json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to store email.' })
  }
}
