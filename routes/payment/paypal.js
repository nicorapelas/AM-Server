const express = require('express')
const router = express.Router()
const axios = require('axios')
const requireAuth = require('../../middlewares/requireAuth')
const mongoose = require('mongoose')

// Import configuration based on environment
const { keys } = require('../../config/keys')

// PayPal API configuration
const PAYPAL_CLIENT_ID = keys.paypal.clientId
const PAYPAL_CLIENT_SECRET = keys.paypal.clientSecret
const PAYPAL_BASE_URL = keys.paypal.baseUrl
const FRONTEND_URL = keys.paypal.frontendUrl

// Get PayPal access token
const getPayPalAccessToken = async () => {
  try {
    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64')
    const response = await axios.post(`${PAYPAL_BASE_URL}/v1/oauth2/token`, 
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    )
    return response.data.access_token
  } catch (error) {
    console.error('Error getting PayPal access token:', error)
    throw error
  }
}

// Create PayPal product
router.post('/create-product', requireAuth, async (req, res) => {
  try {
    const accessToken = await getPayPalAccessToken()
    
    const productData = {
      name: 'High Score Hero Store Subscription',
      description: 'Monthly subscription for additional arcade stores',
      type: 'SERVICE',
      category: 'SOFTWARE',
      image_url: 'https://example.com/logo.png', // Optional
      home_url: FRONTEND_URL || 'https://arcademanager.app'
    }

    const response = await axios.post(
      `${PAYPAL_BASE_URL}/v1/catalogs/products`,
      productData,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    )

    res.json({ success: true, product: response.data })
  } catch (error) {
    console.error('Error creating PayPal product:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Create subscription plan
router.post('/create-plan', requireAuth, async (req, res) => {
  try {
    const accessToken = await getPayPalAccessToken()
    
    // First, create a product if we don't have one
    let productId = keys.paypal.productId
    
    if (!productId) {
      const productResponse = await axios.post(
        `${PAYPAL_BASE_URL}/v1/catalogs/products`,
        {
          name: 'High Score Hero Store Subscription',
          description: 'Monthly subscription for additional arcade stores',
          type: 'SERVICE',
          category: 'SOFTWARE'
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      )
      productId = productResponse.data.id
    }
    
    const planData = {
      product_id: productId,
      name: 'High Score Hero Store Subscription',
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
          total_cycles: 0, // 0 means unlimited
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

    const response = await axios.post(
      `${PAYPAL_BASE_URL}/v1/billing/plans`,
      planData,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    )

    res.json({ 
      success: true, 
      plan: response.data,
      productId: productId
    })
  } catch (error) {
    console.error('Error creating PayPal plan:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Create subscription with automatic plan creation
router.post('/create-subscription', requireAuth, async (req, res) => {
  try {
    const { storeName, storeData } = req.body
    console.log('Creating subscription for store:', storeName)
    console.log('Store data:', storeData)
    console.log('User:', req.user)
    
    const accessToken = await getPayPalAccessToken()
    console.log('Got PayPal access token')

    // First, ensure we have a plan
    let planId = keys.paypal.planId
    console.log('Current plan ID:', planId)
    
    if (!planId) {
      console.log('No plan ID found, creating plan automatically')
      // Create a plan automatically
      const planResponse = await axios.post(
        `${PAYPAL_BASE_URL}/v1/billing/plans`,
        {
          product_id: keys.paypal.productId || await createProduct(accessToken),
          name: 'High Score Hero Store Subscription',
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
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      )
      planId = planResponse.data.id
      console.log('Created plan with ID:', planId)
    }

    const subscriptionData = {
      plan_id: planId,
      start_time: new Date(Date.now() + 60000).toISOString(), // Start 1 minute from now
      subscriber: {
        name: {
          given_name: req.user.name
        },
        email_address: req.user.email
      },
      application_context: {
        brand_name: 'High Score Hero',
        locale: 'en-US',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'SUBSCRIBE_NOW',
        payment_method: {
          payer_selected: 'PAYPAL',
          payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED'
        },
        return_url: `${FRONTEND_URL}/billing/success`,
        cancel_url: `${FRONTEND_URL}/billing/cancel`
      }
    }

    console.log('Creating subscription with data:', subscriptionData)

    const response = await axios.post(
      `${PAYPAL_BASE_URL}/v1/billing/subscriptions`,
      subscriptionData,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    )

    console.log('PayPal subscription created successfully:', response.data)

    const subscriptionId = response.data.id
    const approvalUrl = response.data.links.find(link => link.rel === 'approve').href

    // Store the subscription data temporarily (in production, you'd use a database)
    // For now, we'll store it in memory (this will be lost on server restart)
    if (!global.pendingSubscriptions) {
      global.pendingSubscriptions = new Map()
    }
    
    global.pendingSubscriptions.set(subscriptionId, {
      userId: req.user._id,
      storeData: storeData || { storeName, address: '', notes: '' },
      createdAt: new Date()
    })

    res.json({ 
      success: true, 
      subscription: response.data,
      approvalUrl: approvalUrl,
      subscriptionId: subscriptionId
    })
  } catch (error) {
    console.error('Error creating PayPal subscription:', error)
    console.error('Error response:', error.response?.data)
    console.error('Error status:', error.response?.status)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Helper function to create a product
const createProduct = async (accessToken) => {
  const productResponse = await axios.post(
    `${PAYPAL_BASE_URL}/v1/catalogs/products`,
    {
      name: 'High Score Hero Store Subscription',
      description: 'Monthly subscription for additional arcade stores',
      type: 'SERVICE',
      category: 'SOFTWARE'
    },
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  )
  return productResponse.data.id
}

// Check subscription status (instead of manual activation)
router.post('/check-subscription-status', requireAuth, async (req, res) => {
  try {
    const { subscriptionId } = req.body
    const accessToken = await getPayPalAccessToken()

    console.log('Checking subscription status for:', subscriptionId)

    const response = await axios.get(
      `${PAYPAL_BASE_URL}/v1/billing/subscriptions/${subscriptionId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    )

    const subscription = response.data
    console.log('Subscription status:', subscription.status)

    // Handle different subscription statuses
    switch (subscription.status) {
      case 'ACTIVE':
        // Subscription is active - create the store automatically
        try {
          const pendingData = global.pendingSubscriptions?.get(subscriptionId)
          
          if (pendingData && pendingData.userId.toString() === req.user._id.toString()) {
            console.log('Creating store for active subscription:', subscriptionId)
            
            // Import the Store model
            const Store = mongoose.model('Store')
            const User = mongoose.model('User')
            
            // Check if store name is unique for this user
            const existingStore = await Store.findOne({ 
              _user: req.user._id, 
              storeName: pendingData.storeData.storeName.trim() 
            })
            
            if (existingStore) {
              console.log('Store name already exists:', pendingData.storeData.storeName)
              res.json({ 
                success: true, 
                subscription: subscription,
                status: 'ACTIVE',
                message: 'Subscription is active but a store with this name already exists. Please contact support.',
                storeError: 'Store name already exists'
              })
              return
            }
            
            // Generate staff credentials
            const generateStaffCredentials = async (storeName) => {
              const baseUsername = storeName.slice(0, 4).toLowerCase().replace(/\s+/g, '')
              let username = `${baseUsername}${Math.floor(1000 + Math.random() * 9000)}`
              
              while (await User.findOne({ username })) {
                username = `${baseUsername}${Math.floor(1000 + Math.random() * 9000)}`
              }
              
              const password = Math.random().toString(36).slice(-8).toUpperCase()
              return { username, password }
            }
            
            const staffCreds = await generateStaffCredentials(pendingData.storeData.storeName)
            
            // Create store
            const newStore = new Store({
              _user: req.user._id,
              storeName: pendingData.storeData.storeName.trim(),
              address: pendingData.storeData.address?.trim() || '',
              notes: pendingData.storeData.notes?.trim() || '',
              username: staffCreds.username,
              password: staffCreds.password,
              subscriptionId: subscriptionId,
            })
            await newStore.save()

            // Create staff user
            const staffUser = new User({
              email: staffCreds.username,
              username: staffCreds.username,
              password: staffCreds.password,
              staffCreds: true,
              emailVerified: true,
              staffStore: newStore._id
            })
            await staffUser.save()

            // Update store with staffUserId
            newStore.staffUserId = staffUser._id
            await newStore.save()

            // Clean up pending subscription data
            global.pendingSubscriptions.delete(subscriptionId)
            
            console.log('Store created successfully:', newStore.storeName)
            
            res.json({ 
              success: true, 
              subscription: subscription,
              status: 'ACTIVE',
              message: 'Subscription is active and store has been created successfully!',
              storeCreated: true,
              store: {
                id: newStore._id,
                name: newStore.storeName,
                staffCredentials: {
                  username: staffCreds.username,
                  password: staffCreds.password
                }
              }
            })
          } else {
            // No pending data found, but subscription is active
            res.json({ 
              success: true, 
              subscription: subscription,
              status: 'ACTIVE',
              message: 'Subscription is active and ready to use'
            })
          }
        } catch (storeError) {
          console.error('Error creating store:', storeError)
          res.json({ 
            success: true, 
            subscription: subscription,
            status: 'ACTIVE',
            message: 'Subscription is active but there was an error creating the store. Please contact support.',
            storeError: storeError.message
          })
        }
        break
      
      case 'APPROVAL_PENDING':
        // Subscription is still pending approval
        res.json({ 
          success: false, 
          subscription: subscription,
          status: 'APPROVAL_PENDING',
          message: 'Subscription is still pending approval. Please complete the payment process on PayPal.'
        })
        break
      
      case 'APPROVED':
        // Subscription is approved but not yet active (should be rare)
        res.json({ 
          success: true, 
          subscription: subscription,
          status: 'APPROVED',
          message: 'Subscription is approved and should be active soon'
        })
        break
      
      case 'CANCELLED':
        // Subscription was cancelled
        res.json({ 
          success: false, 
          subscription: subscription,
          status: 'CANCELLED',
          message: 'Subscription was cancelled'
        })
        break
      
      case 'EXPIRED':
        // Subscription has expired
        res.json({ 
          success: false, 
          subscription: subscription,
          status: 'EXPIRED',
          message: 'Subscription has expired'
        })
        break
      
      default:
        // Unknown status
        res.json({ 
          success: false, 
          subscription: subscription,
          status: subscription.status,
          message: `Subscription status: ${subscription.status}`
        })
    }
  } catch (error) {
    console.error('Error checking subscription status:', error)
    console.error('Error response:', error.response?.data)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Keep the old activate route for backward compatibility but mark it as deprecated
router.post('/activate-subscription', requireAuth, async (req, res) => {
  try {
    const { subscriptionId } = req.body
    console.log('DEPRECATED: Manual activation attempted for subscription:', subscriptionId)
    
    // Instead of trying to activate, check the status
    const accessToken = await getPayPalAccessToken()
    
    const response = await axios.get(
      `${PAYPAL_BASE_URL}/v1/billing/subscriptions/${subscriptionId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    )

    const subscription = response.data
    
    if (subscription.status === 'ACTIVE') {
      res.json({ 
        success: true, 
        subscription: subscription,
        message: 'Subscription is already active'
      })
    } else {
      res.json({ 
        success: false, 
        subscription: subscription,
        message: `Subscription status is ${subscription.status}. Manual activation is not required for PayPal subscriptions.`
      })
    }
  } catch (error) {
    console.error('Error checking subscription status:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get subscription details
router.get('/subscription/:subscriptionId', requireAuth, async (req, res) => {
  try {
    const { subscriptionId } = req.params
    const accessToken = await getPayPalAccessToken()

    const response = await axios.get(
      `${PAYPAL_BASE_URL}/v1/billing/subscriptions/${subscriptionId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    )

    res.json({ success: true, subscription: response.data })
  } catch (error) {
    console.error('Error getting subscription details:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Cancel subscription
router.post('/cancel-subscription', requireAuth, async (req, res) => {
  try {
    const { subscriptionId, reason } = req.body
    const accessToken = await getPayPalAccessToken()

    const response = await axios.post(
      `${PAYPAL_BASE_URL}/v1/billing/subscriptions/${subscriptionId}/cancel`,
      { reason: reason || 'User requested cancellation' },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    )

    res.json({ success: true, subscription: response.data })
  } catch (error) {
    console.error('Error canceling subscription:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Webhook handler for subscription events
router.post('/webhook', async (req, res) => {
  try {
    const event = req.body
    
    // Verify webhook signature (recommended for production)
    // const isValid = verifyWebhookSignature(req.headers, req.body)
    // if (!isValid) {
    //   return res.status(400).json({ error: 'Invalid webhook signature' })
    // }

    console.log('PayPal webhook received:', event.event_type, 'for subscription:', event.resource?.id)

    switch (event.event_type) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
        // Handle subscription activation
        console.log('Subscription activated:', event.resource.id)
        break
      
      case 'BILLING.SUBSCRIPTION.CANCELLED':
        // Handle subscription cancellation
        console.log('Subscription cancelled:', event.resource.id)
        await handleSubscriptionCancellation(event.resource.id, event.resource)
        break
      
      case 'BILLING.SUBSCRIPTION.SUSPENDED':
        // Handle subscription suspension (usually due to payment failures)
        console.log('Subscription suspended due to payment issues:', event.resource.id)
        await handleSubscriptionSuspension(event.resource.id, event.resource)
        break
      
      case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED':
        // Handle payment failure
        console.log('Payment failed for subscription:', event.resource.id)
        await handlePaymentFailure(event.resource.id, event.resource)
        break
      
      case 'PAYMENT.SALE.COMPLETED':
        // Handle successful payment
        console.log('Payment completed:', event.resource.id)
        await handlePaymentSuccess(event.resource.id, event.resource)
        break
      
      case 'PAYMENT.SALE.DENIED':
        // Handle denied payment
        console.log('Payment denied:', event.resource.id)
        await handlePaymentDenied(event.resource.id, event.resource)
        break
      
      default:
        console.log('Unhandled webhook event:', event.event_type)
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    res.status(500).json({ error: 'Webhook processing failed' })
  }
})

// Handle subscription cancellation
const handleSubscriptionCancellation = async (subscriptionId, subscriptionData) => {
  try {
    const Store = mongoose.model('Store')
    const User = mongoose.model('User')
    
    // Find the store with this subscription ID
    const store = await Store.findOne({ subscriptionId })
    
    if (store) {
      console.log(`Store ${store.storeName} subscription cancelled`)
      
      // Update store status to reflect cancelled subscription
      store.isActive = false
      store.paymentStatus = 'CANCELLED'
      await store.save()
      
      // Optionally notify the user
      const user = await User.findById(store._user)
      if (user) {
        console.log(`User ${user.email} subscription cancelled for store ${store.storeName}`)
        // Here you could send an email notification
      }
    }
  } catch (error) {
    console.error('Error handling subscription cancellation:', error)
  }
}

// Handle subscription suspension
const handleSubscriptionSuspension = async (subscriptionId, subscriptionData) => {
  try {
    const Store = mongoose.model('Store')
    const User = mongoose.model('User')
    
    // Find the store with this subscription ID
    const store = await Store.findOne({ subscriptionId })
    
    if (store) {
      console.log(`Store ${store.storeName} subscription suspended due to payment issues`)
      
      // Update store status to reflect suspended subscription
      store.isActive = false
      store.paymentStatus = 'SUSPENDED'
      await store.save()
      
      // Notify the user about the suspension
      const user = await User.findById(store._user)
      if (user) {
        console.log(`User ${user.email} subscription suspended for store ${store.storeName}`)
        // Here you could send an email notification about payment issues
      }
    }
  } catch (error) {
    console.error('Error handling subscription suspension:', error)
  }
}

// Handle payment failure
const handlePaymentFailure = async (subscriptionId, paymentData) => {
  try {
    const Store = mongoose.model('Store')
    const User = mongoose.model('User')
    
    // Find the store with this subscription ID
    const store = await Store.findOne({ subscriptionId })
    
    if (store) {
      console.log(`Payment failed for store ${store.storeName}`)
      
      // Update payment failure tracking
      store.paymentStatus = 'FAILED'
      store.paymentFailureCount += 1
      store.lastPaymentFailure = new Date()
      store.paymentFailureReason = paymentData.failure_reason || 'Payment failed'
      await store.save()
      
      // Log the payment failure details
      console.log('Payment failure details:', {
        subscriptionId,
        storeName: store.storeName,
        failureReason: paymentData.failure_reason,
        amount: paymentData.amount,
        currency: paymentData.currency_code,
        failureCount: store.paymentFailureCount
      })
      
      // Notify the user about the payment failure
      const user = await User.findById(store._user)
      if (user) {
        console.log(`Payment failed for user ${user.email} store ${store.storeName}`)
        // Here you could send an email notification about the payment failure
      }
    }
  } catch (error) {
    console.error('Error handling payment failure:', error)
  }
}

// Handle payment success
const handlePaymentSuccess = async (paymentId, paymentData) => {
  try {
    // This might be for a subscription payment
    console.log(`Payment successful: ${paymentId}`)
    
    // If this is a subscription payment, update the store
    if (paymentData.billing_agreement_id) {
      const Store = mongoose.model('Store')
      const store = await Store.findOne({ subscriptionId: paymentData.billing_agreement_id })
      
      if (store) {
        store.paymentStatus = 'ACTIVE'
        store.lastPaymentDate = new Date()
        store.paymentFailureCount = 0 // Reset failure count on successful payment
        store.paymentFailureReason = null
        await store.save()
        
        console.log(`Payment successful for store ${store.storeName}`)
      }
    }
    
    // You could update payment records or send confirmation emails here
  } catch (error) {
    console.error('Error handling payment success:', error)
  }
}

// Handle payment denied
const handlePaymentDenied = async (paymentId, paymentData) => {
  try {
    console.log(`Payment denied: ${paymentId}`)
    
    // Handle denied payment (similar to payment failure)
    // You might want to log this or notify users
  } catch (error) {
    console.error('Error handling payment denied:', error)
  }
}

// Check authentication status
router.get('/auth-check', requireAuth, async (req, res) => {
  try {
    res.json({ 
      success: true, 
      message: 'User is authenticated',
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email
      }
    })
  } catch (error) {
    res.status(401).json({ 
      success: false, 
      error: 'Authentication failed'
    })
  }
})

// Test PayPal credentials
router.get('/test', requireAuth, async (req, res) => {
  try {
    console.log('Testing PayPal credentials...')
    console.log('Client ID:', PAYPAL_CLIENT_ID)
    console.log('Base URL:', PAYPAL_BASE_URL)
    
    const accessToken = await getPayPalAccessToken()
    console.log('Successfully got access token:', accessToken ? 'YES' : 'NO')
    
    res.json({ 
      success: true, 
      message: 'PayPal credentials are working',
      hasAccessToken: !!accessToken
    })
  } catch (error) {
    console.error('PayPal test failed:', error)
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: error.response?.data
    })
  }
})

module.exports = router 