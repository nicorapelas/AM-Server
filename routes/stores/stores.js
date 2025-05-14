const express = require('express')
const mongoose = require('mongoose')
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
    
    // Generate staff credentials
    const staffCreds = await generateStaffCredentials(storeName)
    
    // Create store first (without staffUserId)
    const newStore = new Store({
      _user: req.user._id,
      storeName,
      address,
      notes,
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
    res.status(422).send({ error: 'Error creating store and staff account' })
  }
})

router.get('/user-stores', requireAuth, async (req, res) => {
  const stores = await Store.find({ _user: req.user._id })
  res.json(stores)
})

router.post('/edit-store', requireAuth, async (req, res) => {
  console.log('req.body @edit-store', req.body)
  const { _id, storeName, address, notes } = req.body
  await Store.findByIdAndUpdate(_id, { storeName, address, notes })
  const stores = await Store.find({ _user: req.user._id })
  res.json(stores)
})

router.post('/delete-store', requireAuth, async (req, res) => {
  const { _id } = req.body
  await Game.deleteMany({ _store: _id })
  await Financial.deleteMany({ _store: _id })
  await Store.findByIdAndDelete(_id)
  const stores = await Store.find({ _user: req.user._id })
  res.json(stores)
})

router.post('/fetch-store', requireAuth, async (req, res) => {
  const { storeId } = req.body
  const store = await Store.findById(storeId)
  res.json(store)
})

module.exports = router
