const axios = require('axios')

async function testLocalSubscription() {
  try {
    console.log('=== TESTING LOCAL SERVER SUBSCRIPTION ENDPOINT ===')
    
    // Test data
    const testData = {
      storeName: 'Test Store',
      storeData: {
        storeName: 'Test Store',
        address: '123 Test Street',
        notes: 'Test subscription'
      }
    }
    
    console.log('Sending request to: http://localhost:5000/payment/paypal/create-subscription')
    console.log('Test data:', testData)
    
    // Note: This will fail because it requires authentication
    // But it will show us if the server is responding
    const response = await axios.post(
      'http://localhost:5000/payment/paypal/create-subscription',
      testData,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )
    
    console.log('✅ SUCCESS! Server responded:')
    console.log('Status:', response.status)
    console.log('Data:', response.data)
    
  } catch (error) {
    console.log('❌ ERROR:')
    console.log('Status:', error.response?.status)
    console.log('Message:', error.response?.data?.error || error.message)
    
    if (error.response?.status === 401) {
      console.log('✅ This is expected - authentication required')
      console.log('The server is working, just needs authentication')
    }
  }
}

testLocalSubscription() 