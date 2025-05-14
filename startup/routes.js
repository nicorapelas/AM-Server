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
  app.use(cors())

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
