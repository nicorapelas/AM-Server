const express = require('express')
const mongoose = require('mongoose')
const axios = require('axios')
const User = mongoose.model('User')
const Store = mongoose.model('Store')
const Game = mongoose.model('Game')
const Financial = mongoose.model('Financial')
const requireAuth = require('../../middlewares/requireAuth')
const { keys } = require('../../config/keys')

const router = express.Router()

const generateStaffCredentials = async (storeName) => {
  const User = mongoose.model('User')
  
  // Create username from store name (first 4 chars + 4 random digits)
  const baseUsername = storeName.slice(0, 4).toLowerCase().replace(/\s+/g, '')
  let username = `${baseUsername}${Math.floor(1000 + Math.random() * 9000)}`
  
  // Ensure username is unique
  while (await User.findOne({ username })) {
    username = `${baseUsername}${Math.floor(1000 + Math.random() * 9000)}`
  }
  
  // Generate 8-char password
  const password = Math.random().toString(36).slice(-8).toUpperCase()
  
  return { username, password }
}

router.post('/create-store', requireAuth, async (req, res) => {
  try {
    const { storeName, address, notes } = req.body
    
    // Check if store name is unique for this user
    const existingStore = await Store.findOne({ 
      _user: req.user._id, 
      storeName: storeName.trim() 
    })
    
    if (existingStore) {
      return res.status(422).send({ 
        error: 'A store with this name already exists. Please choose a different name.' 
      })
    }
    
    // Generate staff credentials
    const staffCreds = await generateStaffCredentials(storeName)
    
    // Create store first (without staffUserId)
    const newStore = new Store({
      _user: req.user._id,
      storeName: storeName.trim(),
      address: address?.trim() || '',
      notes: notes?.trim() || '',
      username: staffCreds.username,
      password: staffCreds.password,
    })
    await newStore.save()

    // Create staff user with store reference
    const User = mongoose.model('User')
    const staffUser = new User({
      email: staffCreds.username,
      username: staffCreds.username,
      password: staffCreds.password,
      staffCreds: true,
      emailVerified: true,
      staffStore: newStore._id
    })
    await staffUser.save()

    // Now update store with staffUserId
    newStore.staffUserId = staffUser._id
    await newStore.save()

    // Get updated stores list
    const stores = await Store.find({ _user: req.user._id })
    
    res.json({
      stores,
      staffCredentials: {
        username: staffCreds.username,
        password: staffCreds.password,
        storeId: newStore._id
      }
    })
  } catch (error) {
    console.error('Error creating store:', error)
    res.status(422).send({ error: 'Error creating store and staff account' })
  }
})

router.get('/user-stores', requireAuth, async (req, res) => {
  const stores = await Store.find({ _user: req.user._id })
  res.json(stores)
})

router.post('/edit-store', requireAuth, async (req, res) => {
  try {
    console.log('req.body @edit-store', req.body)
    const { _id, storeName, address, notes } = req.body
    
    // Check if store name is unique for this user (excluding the current store being edited)
    const existingStore = await Store.findOne({ 
      _user: req.user._id, 
      storeName: storeName.trim(),
      _id: { $ne: _id } // Exclude the current store being edited
    })
    
    if (existingStore) {
      return res.status(422).send({ 
        error: 'A store with this name already exists. Please choose a different name.' 
      })
    }
    
    await Store.findByIdAndUpdate(_id, { 
      storeName: storeName.trim(), 
      address: address?.trim() || '', 
      notes: notes?.trim() || '' 
    })
    const stores = await Store.find({ _user: req.user._id })
    res.json(stores)
  } catch (error) {
    console.error('Error editing store:', error)
    res.status(422).send({ error: 'Error updating store' })
  }
})

router.post('/delete-store', requireAuth, async (req, res) => {
  try {
    const { storeId } = req.body
    
    // Find the store to get the subscription ID
    const store = await Store.findById(storeId)
    
    if (!store) {
      return res.status(404).json({ error: 'Store not found' })
    }
    
    // Check if user owns this store
    if (store._user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to delete this store' })
    }
    
    let paypalCancellationResult = null
    
    // If store has a subscription ID, cancel the PayPal subscription
    if (store.subscriptionId) {
      try {
        const { keys } = require('../../config/keys')
        
        // Get PayPal access token
        const getPayPalAccessToken = async () => {
          const auth = Buffer.from(`${keys.paypal.clientId}:${keys.paypal.clientSecret}`).toString('base64')
          const response = await axios.post(
            `${keys.paypal.baseUrl}/v1/oauth2/token`,
            'grant_type=client_credentials',
            {
              headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded'
              }
            }
          )
          return response.data.access_token
        }
        
        const accessToken = await getPayPalAccessToken()
        
        // First, get the current subscription status to verify it exists
        const subscriptionCheck = await axios.get(
          `${keys.paypal.baseUrl}/v1/billing/subscriptions/${store.subscriptionId}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        )
        
        // Cancel the subscription
        const cancellationResponse = await axios.post(
          `${keys.paypal.baseUrl}/v1/billing/subscriptions/${store.subscriptionId}/cancel`,
          { reason: 'Store deleted by user' },
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        )
        
        paypalCancellationResult = {
          success: true,
          subscriptionId: store.subscriptionId,
          previousStatus: subscriptionCheck.data.status,
          cancellationResponse: cancellationResponse.data
        }
        
      } catch (paypalError) {
        paypalCancellationResult = {
          success: false,
          subscriptionId: store.subscriptionId,
          error: paypalError.message,
          errorDetails: paypalError.response?.data
        }
        
        // Continue with store deletion even if PayPal cancellation fails
        // This prevents a PayPal error from blocking store deletion
      }
    }
    
    // Delete related data
    await Game.deleteMany({ _store: storeId })
    await Financial.deleteMany({ _store: storeId })
    
    // Delete the store
    await Store.findByIdAndDelete(storeId)
    
    // Get updated stores list
    const stores = await Store.find({ _user: req.user._id })
    
    // Return the result with PayPal cancellation info
    res.json({
      stores,
      paypalCancellation: paypalCancellationResult
    })
  } catch (error) {
    console.error('Error deleting store:', error)
    res.status(500).json({ error: 'Error deleting store' })
  }
})

router.post('/fetch-store', requireAuth, async (req, res) => {
  const { storeId } = req.body
  const store = await Store.findById(storeId)
  res.json(store)
})

module.exports = router
