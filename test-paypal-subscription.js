const axios = require('axios')

// PayPal Sandbox credentials
const PAYPAL_CLIENT_ID = 'AQy2EhSe71GYOHSeaFlnhK91LlWZKAK6ifoYmdggh-vVS-0ET-VnWgKmLOFYLFQ1KZ9sm3JTEt5e85FS'
const PAYPAL_CLIENT_SECRET = 'ELN5SuuOKroX0xu67hfZ5ql3uLiQDhOW4GXZ3yt2eOtoVZVrhqDdlAAQno7-_WZd9zKyMMqdsnMGfOPx'
const PAYPAL_BASE_URL = 'https://api-m.sandbox.paypal.com'

async function testPayPalSubscription() {
  try {
    console.log('=== TESTING PAYPAL SUBSCRIPTION CREATION ===')
    
    // Step 1: Get access token
    console.log('\n1. Getting PayPal access token...')
    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64')
    
    const tokenResponse = await axios.post(`${PAYPAL_BASE_URL}/v1/oauth2/token`, 
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    )
    
    const accessToken = tokenResponse.data.access_token
    console.log('✅ Access token received')
    
    // Step 2: Create a product
    console.log('\n2. Creating PayPal product...')
    const productData = {
      name: 'Arcade Manager Store Subscription',
      description: 'Monthly subscription for additional arcade stores',
      type: 'SERVICE',
      category: 'SOFTWARE',
      home_url: 'https://arcademanager.app'
    }
    
    const productResponse = await axios.post(
      `${PAYPAL_BASE_URL}/v1/catalogs/products`,
      productData,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    )
    
    const productId = productResponse.data.id
    console.log('✅ Product created with ID:', productId)
    
    // Step 3: Create a plan
    console.log('\n3. Creating PayPal plan...')
    const planData = {
      product_id: productId,
      name: 'Arcade Manager Store Subscription',
      description: 'Monthly subscription for additional arcade stores',
      status: 'ACTIVE',
      billing_cycles: [
        {
          frequency: {
            interval_unit: 'MONTH',
            interval_count: 1
          },
          tenure_type: 'REGULAR',
          sequence: 1,
          total_cycles: 0,
          pricing_scheme: {
            fixed_price: {
              value: '7.00',
              currency_code: 'USD'
            }
          }
        }
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee: {
          value: '0.00',
          currency_code: 'USD'
        },
        setup_fee_failure_action: 'CONTINUE',
        payment_failure_threshold: 3
      }
    }
    
    const planResponse = await axios.post(
      `${PAYPAL_BASE_URL}/v1/billing/plans`,
      planData,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    )
    
    const planId = planResponse.data.id
    console.log('✅ Plan created with ID:', planId)
    
    // Step 4: Create subscription
    console.log('\n4. Creating PayPal subscription...')
    const subscriptionData = {
      plan_id: planId,
      start_time: new Date(Date.now() + 60000).toISOString(),
      subscriber: {
        name: {
          given_name: 'Test User'
        },
        email_address: 'test@example.com'
      },
      application_context: {
        brand_name: 'Arcade Manager',
        locale: 'en-US',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'SUBSCRIBE_NOW',
        payment_method: {
          payer_selected: 'PAYPAL',
          payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED'
        },
        return_url: 'http://localhost:3000/billing/success',
        cancel_url: 'http://localhost:3000/billing/cancel'
      }
    }
    
    const subscriptionResponse = await axios.post(
      `${PAYPAL_BASE_URL}/v1/billing/subscriptions`,
      subscriptionData,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    )
    
    console.log('✅ Subscription created successfully!')
    console.log('Subscription ID:', subscriptionResponse.data.id)
    console.log('Status:', subscriptionResponse.data.status)
    console.log('Approval URL:', subscriptionResponse.data.links.find(link => link.rel === 'approve')?.href)
    
  } catch (error) {
    console.log('❌ ERROR in PayPal subscription creation:')
    console.log('Error Status:', error.response?.status)
    console.log('Error Message:', error.response?.data?.error_description || error.message)
    console.log('Full Error Response:', JSON.stringify(error.response?.data, null, 2))
  }
}

testPayPalSubscription() 