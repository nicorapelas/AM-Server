const express = require('express')
const cors = require('cors')
const root = require('../routes/root/root')
const stores = require('../routes/stores/stores')
const games = require('../routes/games/games')
const financials = require('../routes/financials/financials')
const staff = require('../routes/staff/staff')
// Import authentication routes
const user = require('../routes/auth/local')
// Import payment routes
// const yoco = require('../routes/payment/yoco')

module.exports = (app) => {
  // Express middleware
  app.use(express.urlencoded({ extended: true }))
  app.use(express.json())
  
  // CORS configuration
  const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.FRONTEND_URL  // Your Vercel domain
      : ['http://localhost:3000', 'http://localhost:5000'],  // Local development
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Authorization']
  }
  app.use(cors(corsOptions))

  app.use('/', root)
  app.use('/stores', stores)
  app.use('/games', games)
  app.use('/financials', financials)
  app.use('/staff', staff)
  // Use authentication routes
  app.use('/auth/user', user)
  // Use payment routes
  // app.use('/payment', yoco)
}
