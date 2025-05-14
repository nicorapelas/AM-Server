const express = require('express')
const mongoose = require('mongoose')
const Game = mongoose.model('Game')
const requireAuth = require('../../middlewares/requireAuth')

const router = express.Router()

router.post('/create-game', requireAuth, async (req, res) => {
  const { gameName, storeId, quantity, commission, repName, repPhone } =
    req.body
  const newGame = new Game({
    _user: req.user._id,
    storeId,
    gameName,
    quantity,
    commission,
    repName,
    repPhone,
  })
  await newGame.save()
  const games = await Game.find({ storeId })
  res.json(games)
})

router.post('/fetch-store-games', requireAuth, async (req, res) => {
  const { storeId } = req.body
  const games = await Game.find({ storeId })
  res.json(games)
})

router.get('/user-games', requireAuth, async (req, res) => {
  const games = await Game.find({ _user: req.user._id })
  res.json(games)
})

router.post('/edit-game', requireAuth, async (req, res) => {
  const { _id, gameName, quantity, commission, repName, repPhone, storeId } =
    req.body
  await Game.findByIdAndUpdate(_id, {
    gameName,
    quantity,
    commission,
    repName,
    repPhone,
  })
  const games = await Game.find({ storeId })
  res.json(games)
})

router.post('/delete-game', requireAuth, async (req, res) => {
  const { _id, storeId } = req.body
  await Game.findByIdAndDelete(_id)
  const games = await Game.find({ storeId })
  res.json(games)
})

module.exports = router
