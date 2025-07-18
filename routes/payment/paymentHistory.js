const express = require('express')
const mongoose = require('mongoose')
const PaymentHistory = mongoose.model('PaymentHistory')
const Store = mongoose.model('Store')
const requireAuth = require('../../middlewares/requireAuth')

const router = express.Router()

// Get payment history for a user (all stores)
router.get('/user-payment-history', requireAuth, async (req, res) => {
  console.log('PaymentHistory: GET /user-payment-history called for user:', req.user._id)
  try {
    const paymentHistory = await PaymentHistory.find({ _user: req.user._id })
      .populate('_store', 'storeName tierAnchorDate')
      .sort({ processedAt: -1 })
      .limit(50)

    console.log('PaymentHistory: Found payment history records:', paymentHistory.length)
    res.json(paymentHistory)
  } catch (error) {
    console.error('PaymentHistory: Error fetching user payment history:', error)
    res.status(500).json({ error: 'Failed to fetch payment history' })
  }
})

// Get payment history for a specific store
router.get('/store-payment-history/:storeId', requireAuth, async (req, res) => {
  const { storeId } = req.params
  console.log('PaymentHistory: GET /store-payment-history called for store:', storeId, 'user:', req.user._id)
  try {
    // Verify user owns this store
    const store = await Store.findOne({ _id: storeId, _user: req.user._id })
    if (!store) {
      console.log('PaymentHistory: Store not found or user does not own it')
      return res.status(404).json({ error: 'Store not found' })
    }

    const paymentHistory = await PaymentHistory.find({ _store: storeId })
      .populate('_store', 'storeName tierAnchorDate')
      .sort({ processedAt: -1 })
      .limit(50)

    console.log('PaymentHistory: Found store payment history records:', paymentHistory.length)
    res.json(paymentHistory)
  } catch (error) {
    console.error('PaymentHistory: Error fetching store payment history:', error)
    res.status(500).json({ error: 'Failed to fetch payment history' })
  }
})

// Get payment summary for a user
router.get('/payment-summary', requireAuth, async (req, res) => {
  console.log('PaymentHistory: GET /payment-summary called for user:', req.user._id)
  try {
    const stores = await Store.find({ _user: req.user._id })
    console.log('PaymentHistory: Found stores for user:', stores.length)
    
    const activeStores = stores.filter(s => s.paymentStatus === 'ACTIVE')
    const failedStores = stores.filter(s => s.paymentStatus === 'FAILED')
    const suspendedStores = stores.filter(s => s.paymentStatus === 'SUSPENDED')
    
    const summary = {
      totalStores: stores.length,
      activeSubscriptions: activeStores.length,
      failedPayments: failedStores.length,
      suspendedStores: suspendedStores.length,
      totalPaymentFailures: stores.reduce((sum, store) => sum + (store.paymentFailureCount || 0), 0),
      storesWithIssues: stores.filter(s => s.paymentFailureCount > 0 || s.paymentStatus === 'FAILED').length,
      totalMonthlyCost: activeStores.length * 7.00, // $7 per store
      billingInfo: {
        nextBillingDates: [],
        upcomingBillingCount: 0,
        nextBillingRange: null
      }
    }

    // Calculate billing information for active stores
    if (activeStores.length > 0) {
      const now = new Date()
      const billingDates = []
      
      activeStores.forEach(store => {
        if (store.tierAnchorDate) {
          const anchorDate = new Date(store.tierAnchorDate)
          let nextBilling = new Date(anchorDate)
          
          // Calculate the next billing date
          while (nextBilling <= now) {
            nextBilling.setMonth(nextBilling.getMonth() + 1)
          }
          
          billingDates.push({
            storeName: store.storeName,
            nextBilling: nextBilling,
            daysUntil: Math.ceil((nextBilling - now) / (1000 * 60 * 60 * 24))
          })
        }
      })
      
      // Sort by next billing date
      billingDates.sort((a, b) => a.nextBilling - b.nextBilling)
      
      summary.billingInfo.nextBillingDates = billingDates
      summary.billingInfo.upcomingBillingCount = billingDates.filter(b => b.daysUntil <= 30).length
      
      // Calculate billing range
      if (billingDates.length > 0) {
        const earliest = billingDates[0]
        const latest = billingDates[billingDates.length - 1]
        
        if (earliest.daysUntil <= 7) {
          summary.billingInfo.nextBillingRange = `Next billing in ${earliest.daysUntil} days (${earliest.storeName})`
        } else if (earliest.daysUntil <= 30) {
          summary.billingInfo.nextBillingRange = `${earliest.daysUntil} days (${earliest.storeName})`
        } else {
          summary.billingInfo.nextBillingRange = `${earliest.daysUntil} days (${earliest.storeName})`
        }
      }
    }

    console.log('PaymentHistory: Payment summary:', summary)
    res.json(summary)
  } catch (error) {
    console.error('PaymentHistory: Error fetching payment summary:', error)
    res.status(500).json({ error: 'Failed to fetch payment summary' })
  }
})

// Get recent payment activity
router.get('/recent-payments', requireAuth, async (req, res) => {
  try {
    const recentPayments = await PaymentHistory.find({ _user: req.user._id })
      .populate('_store', 'storeName tierAnchorDate')
      .sort({ processedAt: -1 })
      .limit(10)

    res.json(recentPayments)
  } catch (error) {
    console.error('Error fetching recent payments:', error)
    res.status(500).json({ error: 'Failed to fetch recent payments' })
  }
})

router.get('/all-users-billing-history', requireAuth, async (req, res) => {
  const allUsersBillingHistory = await PaymentHistory.find({ _user: req.user._id })
  res.json(allUsersBillingHistory)
})

module.exports = router