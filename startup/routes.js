const express = require('express')
const cors = require('cors')
const root = require('../routes/root/root')
const stores = require('../routes/stores/stores')
const games = require('../routes/games/games')
const financials = require('../routes/financials/financials')
const staff = require('../routes/staff/staff')
const support = require('../routes/support/support')
// Import authentication routes
const user = require('../routes/auth/local')
// Import payment routes
// const yoco = require('../routes/payment/yoco')
const paypal = require('../routes/payment/paypal')
const paymentHistory = require('../routes/payment/paymentHistory')

module.exports = (app) => {
  // Express middleware
  app.use(express.urlencoded({ extended: true }))
  app.use(express.json())
  
  // CORS configuration
  const corsOptions = {
    origin: function (origin, callback) {
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:5000',
        'https://arcade-manager.vercel.app',
        'https://arcademanager.app',
        'https://www.arcademanager.app'
      ];
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Authorization']
  }
  
  app.use(cors(corsOptions))

  // Add cache control middleware for auth routes
  app.use('/auth', (req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
    next();
  });

  app.use('/', root)
  app.use('/stores', stores)
  app.use('/games', games)
  app.use('/financials', financials)
  app.use('/staff', staff)
  app.use('/support', support)
  // Use authentication routes
  app.use('/auth/user', user)
  // Use payment routes
  // app.use('/payment', yoco)
  app.use('/payment/paypal', paypal)
  app.use('/payment', paymentHistory)
}
