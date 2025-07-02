const keys = {
  mongo: {
    url: function () {
      return process.env.MONGO_URI
    },
    options: {
      useNewUrlParser: true,
    },
  },
  JWT: {
    secret: process.env.SECRET_OR_KEY,
  },
  yoco: {
    publicKey: process.env.YOCO_PUBLIC_KEY,
    secretKey: process.env.YOCO_SECRET_KEY,
    frontendUrl: process.env.FRONTEND_URL,
    backendUrl: process.env.BACKEND_URL,
    apiUrl: process.env.YOCO_API_URL,
  },
  payfast: {
    merchantId: process.env.PAYFAST_MERCHANT_ID,
    merchantKey: process.env.PAYFAST_MERCHANT_KEY,
    passPhrase: process.env.PAYFAST_PASS_PHRASE,
    frontendUrl: process.env.FRONTEND_URL,
    backendUrl: process.env.BACKEND_URL,
  },
  paypal: {
    clientId: process.env.PAYPAL_CLIENT_ID,
    clientSecret: process.env.PAYPAL_CLIENT_SECRET,
    productId: process.env.PAYPAL_PRODUCT_ID, // Will be created automatically
    planId: process.env.PAYPAL_PLAN_ID, // Will be created automatically
    frontendUrl: process.env.FRONTEND_URL,
    baseUrl: 'https://api-m.paypal.com', // Live URL
  },
  managment: {
    id: process.env.MANAGMENT_ID,
  },
  latestAppVersion: {
    v: process.env.LATEST_APP_VERSION,
  },
}

exports.keys = keys
