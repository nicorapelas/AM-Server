const { keys } = require('./config/keys')

console.log('=== PAYPAL CONFIGURATION TEST ===')
console.log('Environment:', process.env.NODE_ENV || 'development')

// Check PayPal configuration
console.log('\nPayPal Configuration:')
console.log('Client ID:', keys.paypal.clientId ? 'SET' : 'NOT SET')
console.log('Client Secret:', keys.paypal.clientSecret ? 'SET' : 'NOT SET')
console.log('Base URL:', keys.paypal.baseUrl)
console.log('Mode:', keys.paypal.mode)
console.log('Product Name:', keys.paypal.productName)
console.log('Brand Name:', keys.paypal.brandName)
console.log('Frontend URL:', keys.paypal.frontendUrl)

// Check if we're using environment variables
console.log('\nEnvironment Variables:')
console.log('PAYPAL_CLIENT_ID:', process.env.PAYPAL_CLIENT_ID ? 'SET' : 'NOT SET')
console.log('PAYPAL_CLIENT_SECRET:', process.env.PAYPAL_CLIENT_SECRET ? 'SET' : 'NOT SET')
console.log('PAYPAL_BASE_URL:', process.env.PAYPAL_BASE_URL || 'NOT SET')
console.log('PAYPAL_MODE:', process.env.PAYPAL_MODE || 'NOT SET')
console.log('FRONTEND_URL:', process.env.FRONTEND_URL || 'NOT SET')

console.log('\n=== CONFIGURATION TEST COMPLETE ===') 