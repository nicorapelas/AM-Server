const express = require('express')
const router = express.Router()
const axios = require('axios')
const nodemailer = require('nodemailer')
const path = require('path')
const hbs = require('nodemailer-express-handlebars')
const requireAuth = require('../../middlewares/requireAuth')
const mongoose = require('mongoose')

// Import configuration based on environment
const { keys } = require('../../config/keys')

// PayPal API configuration
const PAYPAL_CLIENT_ID = keys.paypal.clientId
const PAYPAL_CLIENT_SECRET = keys.paypal.clientSecret
const PAYPAL_BASE_URL = keys.paypal.baseUrl
const FRONTEND_URL = keys.paypal.frontendUrl
const PAYPAL_PRODUCT_NAME = keys.paypal.productName
const PAYPAL_BRAND_NAME = keys.paypal.brandName

// Nodemailer Handlebars
const handlebarOptions = {
  viewEngine: {
    extName: '.handlebars',
    partialsDir: path.resolve('./templates/mailTemplates'),
    defaultLayout: false,
  },
  viewPath: path.resolve('./templates/mailTemplates'),
  extName: '.handlebars',
}
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: keys.google?.authenticateUser || process.env.GOOGLE_AUTH_USER,
    pass: keys.google?.authenticatePassword || process.env.GOOGLE_AUTH_PASSWORD,
  },
  headers: {
    'X-Entity-Ref-ID': 'arcademanager',
    'Reply-To': 'billing@arcademanager.app'
  },
  from: {
    name: 'Arcade Manager',
    address: 'billing@arcademanager.app'
  }
})

// Add the handlebars configuration
transporter.use('compile', hbs(handlebarOptions))

// Add DKIM and SPF settings
transporter.verify(function(error, success) {
  if (error) {
    console.log(error);
  } else {
    console.log("Server is ready to take our messages");
  }
});

// Register mailer options
mailManBillingSuccessfullSubscription = (email, id) => {
  const mailOptionsRegister = {
    from: {
      name: 'Arcade Manager',
      address: 'billing@arcademanager.app'
    },
    to: email,
    subject: 'Arcade Manager - Billing Successfull Subscription',
    template: 'billingSuccessfullSubscriptionTemplate',
    context: {
      id
    },
    headers: {
      'X-Entity-Ref-ID': 'arcademanager',
      'Reply-To': 'billing@arcademanager.app'
    }
  }
  transporter.sendMail(mailOptionsBillingSuccessfullSubscription, (error, info) => {
    if (error) {
      console.log(error)
    } else {
      console.log('Email sent: ' + info.response)
    }
  })
}


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
      name: PAYPAL_PRODUCT_NAME,
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
          name: PAYPAL_PRODUCT_NAME,
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
      name: PAYPAL_PRODUCT_NAME,
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
    console.log('=== PAYPAL SUBSCRIPTION CREATION ===')
    console.log('User:', req.user.email)
    console.log('Store Name:', storeName)
    console.log('Store Data:', storeData)
    
    const accessToken = await getPayPalAccessToken()
    console.log('✅ PayPal Access Token obtained')

    // First, ensure we have a plan
    let planId = keys.paypal.planId
    console.log('Current plan ID:', planId)
    
    if (!planId) {
      console.log('⚠️ No plan ID found, creating plan automatically')
      // Create a plan automatically
      const planResponse = await axios.post(
        `${PAYPAL_BASE_URL}/v1/billing/plans`,
        {
          product_id: keys.paypal.productId || await createProduct(accessToken),
          name: PAYPAL_PRODUCT_NAME,
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
      console.log('✅ Created plan with ID:', planId)
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
        brand_name: PAYPAL_BRAND_NAME,
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

    console.log('📝 Creating subscription with data:', {
      planId: subscriptionData.plan_id,
      startTime: subscriptionData.start_time,
      subscriber: subscriptionData.subscriber,
      returnUrl: subscriptionData.application_context.return_url,
      cancelUrl: subscriptionData.application_context.cancel_url
    })

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

    const subscriptionId = response.data.id
    const approvalUrl = response.data.links.find(link => link.rel === 'approve').href

    console.log('✅ Subscription created successfully')
    console.log('Subscription ID:', subscriptionId)
    console.log('Subscription Status:', response.data.status)
    console.log('Approval URL:', approvalUrl)

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

    console.log('✅ Pending subscription data stored')
    console.log('=== SUBSCRIPTION CREATION COMPLETE ===')

    res.json({ 
      success: true, 
      subscription: response.data,
      approvalUrl: approvalUrl,
      subscriptionId: subscriptionId
    })
  } catch (error) {
    console.error('❌ Error creating PayPal subscription:', error)
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
      name: PAYPAL_PRODUCT_NAME,
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
    const { subscriptionId, tierSelected } = req.body
    console.log('=== PAYPAL SUBSCRIPTION STATUS CHECK ===')
    console.log('User:', req.user.email)
    console.log('Subscription ID:', subscriptionId)
    console.log('Tier Selected:', tierSelected)
    
    const accessToken = await getPayPalAccessToken()
    console.log('PayPal Access Token obtained:', !!accessToken)

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
    console.log('PayPal Subscription Status:', subscription.status)
    console.log('PayPal Subscription Details:', {
      id: subscription.id,
      status: subscription.status,
      start_time: subscription.start_time,
      billing_info: subscription.billing_info,
      subscriber: subscription.subscriber
    })

    // Handle different subscription statuses
    switch (subscription.status) {
      case 'ACTIVE':
        console.log('✅ Subscription is ACTIVE - Proceeding with store creation')
        // Subscription is active - create the store automatically
        try {
          const pendingData = global.pendingSubscriptions?.get(subscriptionId)
          
          if (pendingData && pendingData.userId.toString() === req.user._id.toString()) {
            console.log('✅ Found pending subscription data, creating store...')
            
            // Import the Store model
            const Store = mongoose.model('Store')
            const User = mongoose.model('User')
            
            // Check if store name is unique for this user
            const existingStore = await Store.findOne({ 
              _user: req.user._id, 
              storeName: pendingData.storeData.storeName.trim() 
            })
            
            if (existingStore) {
              console.log('❌ Store name already exists:', pendingData.storeData.storeName)
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
            console.log('✅ Generated staff credentials for store:', pendingData.storeData.storeName)
            
            // Create store
            const newStore = new Store({
              _user: req.user._id,
              storeName: pendingData.storeData.storeName.trim(),
              address: pendingData.storeData.address?.trim() || '',
              notes: pendingData.storeData.notes?.trim() || '',
              username: staffCreds.username,
              password: staffCreds.password,
              paymentStatus: 'ACTIVE',
              tier: 'PAID_HIGH_SCORE_HERO', // TODO: Change to tierSelected
              subscriptionId: subscriptionId,
            })
            await newStore.save()
            console.log('✅ Store created successfully:', newStore.storeName, 'Store ID:', newStore._id)

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
            console.log('✅ Staff user created:', staffCreds.username)

            // Update store with staffUserId
            newStore.staffUserId = staffUser._id
            await newStore.save()

            // Create initial PaymentHistory record for subscription creation
            const PaymentHistory = mongoose.model('PaymentHistory')
            const initialPaymentRecord = new PaymentHistory({
              _user: req.user._id,
              _store: newStore._id,
              subscriptionId: subscriptionId,
              paymentId: `subscription_created_${Date.now()}`,
              amount: 7.00, // $7 monthly subscription
              currency: 'USD',
              status: 'SUCCESS',
              paymentMethod: 'PayPal',
              billingCycle: 'MONTHLY',
              metadata: {
                subscriptionStatus: subscription.status,
                storeCreated: true,
                initialSetup: true,
                paypalSubscriptionId: subscriptionId,
                paypalSubscriptionStatus: subscription.status,
                paypalBillingInfo: subscription.billing_info,
                paypalSubscriber: subscription.subscriber
              },
              processedAt: new Date()
            })
            await initialPaymentRecord.save()
            console.log('✅ PaymentHistory record created for subscription:', subscriptionId)
            console.log('Payment Details:', {
              amount: initialPaymentRecord.amount,
              currency: initialPaymentRecord.currency,
              status: initialPaymentRecord.status,
              paymentMethod: initialPaymentRecord.paymentMethod,
              processedAt: initialPaymentRecord.processedAt
            })

            // Clean up pending subscription data
            global.pendingSubscriptions.delete(subscriptionId)
            console.log('✅ Pending subscription data cleaned up')
            
            console.log('=== STORE CREATION COMPLETE ===')
            console.log('Store Name:', newStore.storeName)
            console.log('Store ID:', newStore._id)
            console.log('Subscription ID:', subscriptionId)
            console.log('Payment Status: ACTIVE')
            console.log('Staff Username:', staffCreds.username)
            
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
            console.log('⚠️ No pending data found, but subscription is active')
            // No pending data found, but subscription is active
            res.json({ 
              success: true, 
              subscription: subscription,
              status: 'ACTIVE',
              message: 'Subscription is active and ready to use'
            })
          }
        } catch (storeError) {
          console.error('❌ Error creating store:', storeError)
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
        console.log('⏳ Subscription is APPROVAL_PENDING - User needs to complete payment')
        // Subscription is still pending approval
        res.json({ 
          success: false, 
          subscription: subscription,
          status: 'APPROVAL_PENDING',
          message: 'Subscription is still pending approval. Please complete the payment process on PayPal.'
        })
        break
      
      case 'APPROVED':
        console.log('✅ Subscription is APPROVED - Should be active soon')
        // Subscription is approved but not yet active (should be rare)
        res.json({ 
          success: true, 
          subscription: subscription,
          status: 'APPROVED',
          message: 'Subscription is approved and should be active soon'
        })
        break
      
      case 'CANCELLED':
        console.log('❌ Subscription was CANCELLED')
        // Subscription was cancelled
        res.json({ 
          success: false, 
          subscription: subscription,
          status: 'CANCELLED',
          message: 'Subscription was cancelled'
        })
        break
      
      case 'EXPIRED':
        console.log('❌ Subscription has EXPIRED')
        // Subscription has expired
        res.json({ 
          success: false, 
          subscription: subscription,
          status: 'EXPIRED',
          message: 'Subscription has expired'
        })
        break
      
      default:
        console.log('❓ Unknown subscription status:', subscription.status)
        // Unknown status
        res.json({ 
          success: false, 
          subscription: subscription,
          status: subscription.status,
          message: `Subscription status: ${subscription.status}`
        })
    }
  } catch (error) {
    console.error('❌ Error checking subscription status:', error)
    console.error('Error response:', error.response?.data)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Keep the old activate route for backward compatibility but mark it as deprecated
router.post('/activate-subscription', requireAuth, async (req, res) => {
  try {
    const { subscriptionId } = req.body
    
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
    console.log('=== PAYPAL WEBHOOK EVENT RECEIVED ===')
    console.log('Event Type:', event.event_type)
    console.log('Event ID:', event.id)
    console.log('Event Time:', event.create_time)
    console.log('Resource Type:', event.resource_type)
    console.log('Resource ID:', event.resource?.id)

    switch (event.event_type) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
        console.log('✅ SUBSCRIPTION ACTIVATED:', event.resource.id)
        console.log('Subscription Details:', {
          id: event.resource.id,
          status: event.resource.status,
          start_time: event.resource.start_time,
          billing_info: event.resource.billing_info
        })
        // Handle subscription activation
        break
      
      case 'BILLING.SUBSCRIPTION.CANCELLED':
        console.log('❌ SUBSCRIPTION CANCELLED:', event.resource.id)
        console.log('Cancellation Details:', {
          id: event.resource.id,
          status: event.resource.status,
          reason: event.resource.status_change_note
        })
        // Handle subscription cancellation
        await handleSubscriptionCancellation(event.resource.id, event.resource)
        break
      
      case 'BILLING.SUBSCRIPTION.SUSPENDED':
        console.log('⚠️ SUBSCRIPTION SUSPENDED:', event.resource.id)
        console.log('Suspension Details:', {
          id: event.resource.id,
          status: event.resource.status,
          reason: event.resource.status_change_note
        })
        // Handle subscription suspension (usually due to payment failures)
        await handleSubscriptionSuspension(event.resource.id, event.resource)
        break
      
      case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED':
        console.log('❌ SUBSCRIPTION PAYMENT FAILED:', event.resource.id)
        console.log('Payment Failure Details:', {
          subscriptionId: event.resource.id,
          failureReason: event.resource.failure_reason,
          amount: event.resource.amount,
          currency: event.resource.currency_code
        })
        // Handle payment failure
        await handlePaymentFailure(event.resource.id, event.resource)
        break
      
      case 'PAYMENT.SALE.COMPLETED':
        console.log('✅ PAYMENT SALE COMPLETED:', event.resource.id)
        console.log('Payment Success Details:', {
          paymentId: event.resource.id,
          amount: event.resource.amount,
          currency: event.resource.currency_code,
          billingAgreementId: event.resource.billing_agreement_id,
          paymentMethod: event.resource.payment_instruction?.payment_method_type
        })
        // Handle successful payment
        await handlePaymentSuccess(event.resource.id, event.resource)
        break
      
      case 'PAYMENT.SALE.DENIED':
        console.log('❌ PAYMENT SALE DENIED:', event.resource.id)
        console.log('Payment Denied Details:', {
          paymentId: event.resource.id,
          reason: event.resource.reason,
          amount: event.resource.amount,
          currency: event.resource.currency_code
        })
        // Handle denied payment
        await handlePaymentDenied(event.resource.id, event.resource)
        break
      
      default:
        console.log('❓ UNHANDLED WEBHOOK EVENT:', event.event_type)
        console.log('Event Data:', JSON.stringify(event, null, 2))
    }

    console.log('=== WEBHOOK PROCESSING COMPLETE ===')
    res.json({ success: true })
  } catch (error) {
    console.error('❌ Error processing webhook:', error)
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
    console.log('=== PAYMENT FAILURE HANDLER ===')
    console.log('Subscription ID:', subscriptionId)
    console.log('Payment Failure Data:', {
      failureReason: paymentData.failure_reason,
      amount: paymentData.amount,
      currency: paymentData.currency_code,
      status: paymentData.status
    })
    
    const Store = mongoose.model('Store')
    const User = mongoose.model('User')
    const PaymentHistory = mongoose.model('PaymentHistory')
    
    // Find the store with this subscription ID
    const store = await Store.findOne({ subscriptionId })
    
    if (store) {
      console.log('✅ Found store for failed payment:', store.storeName)
      
      // Update payment failure tracking
      store.paymentStatus = 'FAILED'
      store.paymentFailureCount += 1
      store.lastPaymentFailure = new Date()
      store.paymentFailureReason = paymentData.failure_reason || 'Payment failed'
      await store.save()
      console.log('✅ Store payment status updated to FAILED')
      console.log('Failure Count:', store.paymentFailureCount)
      console.log('Failure Reason:', store.paymentFailureReason)
      
      // Record payment failure in history
      const paymentRecord = new PaymentHistory({
        _user: store._user,
        _store: store._id,
        subscriptionId: subscriptionId,
        paymentId: paymentData.id || `failed_${Date.now()}`,
        amount: paymentData.amount?.value || 7.00,
        currency: paymentData.amount?.currency_code || 'USD',
        status: 'FAILED',
        paymentMethod: 'PayPal',
        billingCycle: 'MONTHLY',
        failureReason: paymentData.failure_reason || 'Payment failed',
        metadata: {
          ...paymentData,
          paypalSubscriptionId: subscriptionId,
          paypalFailureReason: paymentData.failure_reason,
          paypalPaymentStatus: paymentData.status
        },
        processedAt: new Date()
      })
      await paymentRecord.save()
      console.log('✅ PaymentHistory record created for failed payment')
      console.log('Payment Failure Record Details:', {
        amount: paymentRecord.amount,
        currency: paymentRecord.currency,
        status: paymentRecord.status,
        failureReason: paymentRecord.failureReason,
        processedAt: paymentRecord.processedAt
      })
      
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
        console.log(`❌ Payment failed for user ${user.email} store ${store.storeName}`)
        // Here you could send an email notification about the payment failure
      }
    } else {
      console.log('⚠️ No store found for subscription ID:', subscriptionId)
    }
    
    console.log('=== PAYMENT FAILURE HANDLER COMPLETE ===')
  } catch (error) {
    console.error('❌ Error handling payment failure:', error)
  }
}

// Handle payment success
const handlePaymentSuccess = async (paymentId, paymentData) => {
  try {
    console.log('=== PAYMENT SUCCESS HANDLER ===')
    console.log('Payment ID:', paymentId)
    console.log('Payment Data:', {
      amount: paymentData.amount,
      currency: paymentData.currency_code,
      billingAgreementId: paymentData.billing_agreement_id,
      paymentMethod: paymentData.payment_instruction?.payment_method_type,
      status: paymentData.state
    })
    
    // This might be for a subscription payment
    console.log(`✅ Payment successful: ${paymentId}`)
    
    // If this is a subscription payment, update the store
    if (paymentData.billing_agreement_id) {
      console.log('🔍 Found billing agreement ID, updating store...')
      const Store = mongoose.model('Store')
      const PaymentHistory = mongoose.model('PaymentHistory')
      const store = await Store.findOne({ subscriptionId: paymentData.billing_agreement_id })
      
      if (store) {
        console.log('✅ Found store for subscription:', store.storeName)
        
        store.paymentStatus = 'ACTIVE'
        store.lastPaymentDate = new Date()
        store.paymentFailureCount = 0 // Reset failure count on successful payment
        store.paymentFailureReason = null
        await store.save()
        console.log('✅ Store payment status updated to ACTIVE')
        
        // Record successful payment in history
        const paymentRecord = new PaymentHistory({
          _user: store._user,
          _store: store._id,
          subscriptionId: paymentData.billing_agreement_id,
          paymentId: paymentId,
          amount: paymentData.amount?.value || 7.00,
          currency: paymentData.amount?.currency_code || 'USD',
          status: 'SUCCESS',
          paymentMethod: 'PayPal',
          billingCycle: 'MONTHLY',
          metadata: {
            ...paymentData,
            paypalPaymentId: paymentId,
            paypalBillingAgreementId: paymentData.billing_agreement_id,
            paypalPaymentState: paymentData.state,
            paypalPaymentMethod: paymentData.payment_instruction?.payment_method_type
          },
          processedAt: new Date()
        })
        await paymentRecord.save()
        console.log('✅ PaymentHistory record created for successful payment')
        console.log('Payment Record Details:', {
          amount: paymentRecord.amount,
          currency: paymentRecord.currency,
          status: paymentRecord.status,
          paymentMethod: paymentRecord.paymentMethod,
          processedAt: paymentRecord.processedAt
        })
        
        console.log(`✅ Payment successful for store ${store.storeName}`)
      } else {
        console.log('⚠️ No store found for billing agreement ID:', paymentData.billing_agreement_id)
      }
    } else {
      console.log('⚠️ No billing agreement ID found in payment data')
    }
    
    console.log('=== PAYMENT SUCCESS HANDLER COMPLETE ===')
    // You could update payment records or send confirmation emails here
  } catch (error) {
    console.error('❌ Error handling payment success:', error)
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