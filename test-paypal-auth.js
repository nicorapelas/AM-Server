const axios = require('axios')

// PayPal Sandbox credentials from your config
const PAYPAL_CLIENT_ID = 'AQy2EhSe71GYOHSeaFlnhK91LlWZKAK6ifoYmdggh-vVS-0ET-VnWgKmLOFYLFQ1KZ9sm3JTEt5e85FS'
const PAYPAL_CLIENT_SECRET = 'ELN5SuuOKroX0xu67hfZ5ql3uLiQDhOW4GXZ3yt2eOtoVZVrhqDdlAAQno7-_WZd9zKyMMqdsnMGfOPx'
const PAYPAL_BASE_URL = 'https://api-m.sandbox.paypal.com'

async function testPayPalAuth() {
  try {
    console.log('=== TESTING PAYPAL SANDBOX AUTHENTICATION ===')
    console.log('Client ID:', PAYPAL_CLIENT_ID ? 'SET' : 'NOT SET')
    console.log('Client Secret:', PAYPAL_CLIENT_SECRET ? 'SET' : 'NOT SET')
    console.log('Base URL:', PAYPAL_BASE_URL)
    
    // Create Basic Auth header
    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64')
    
    console.log('\nAttempting to get PayPal access token...')
    
    const response = await axios.post(`${PAYPAL_BASE_URL}/v1/oauth2/token`, 
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    )
    
    console.log('✅ SUCCESS: PayPal authentication working!')
    console.log('Access Token:', response.data.access_token ? 'RECEIVED' : 'NOT RECEIVED')
    console.log('Token Type:', response.data.token_type)
    console.log('Expires In:', response.data.expires_in, 'seconds')
    
  } catch (error) {
    console.log('❌ ERROR: PayPal authentication failed!')
    console.log('Error Status:', error.response?.status)
    console.log('Error Message:', error.response?.data?.error_description || error.message)
    console.log('Full Error:', error.response?.data)
  }
}

testPayPalAuth() 