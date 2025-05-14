const express = require('express')
const mongoose = require('mongoose')
const User = mongoose.model('User')
const Financial = mongoose.model('Financial')
const requireAuth = require('../../middlewares/requireAuth')
const { keys } = require('../../config/keys')

const router = express.Router()

router.post('/create-financial', requireAuth, async (req, res) => {
  try {
    const {
      date,
      storeId,
      gameFinances,
      expenses,
      gameFinancesTotal,
      totalExpenses,
      moneyBalance,
      notes,
      createdBy,
    } = req.body

    // Validate and format expenses
    const formattedExpenses = expenses.map((expense) => ({
      description: expense.description,
      amount: Number(expense.amount),
      category: expense.category,
    }))

    // Validate and format game finances
    const formattedGameFinances = gameFinances.map((game) => ({
      gameId: game.gameId,
      gameName: game.gameName,
      sum: Number(game.sum),
    }))

    const newFinancial = new Financial({
      _user: req.user._id,
      storeId,
      date: new Date(date),
      gameFinances: formattedGameFinances,
      expenses: formattedExpenses,
      totalMoneyIn: gameFinancesTotal > 0 ? gameFinancesTotal : 0,
      totalMoneyOut: gameFinancesTotal < 0 ? Math.abs(gameFinancesTotal) : 0,
      moneyBalance: Number(moneyBalance),
      dailyProfit: gameFinancesTotal - totalExpenses,
      notes,
      createdBy,
    })
    await newFinancial.save()
    const financials = await Financial.find({ storeId })
    res.json(financials)
  } catch (err) {
    res.status(422).send({ error: err.message })
  }
})

router.get('/user-financials', requireAuth, async (req, res) => {
  const financials = await Financial.find({ _user: req.user._id })
  res.json(financials)
})

router.patch('/edit-financial', requireAuth, async (req, res) => {
  try {
    const {
      _id,
      date,
      storeId,
      gameFinances,
      expenses,
      totalMoneyIn,
      totalMoneyOut,
      moneyBalance,
      dailyProfit,
      notes,
      updatedBy,
    } = req.body

    // Update the financial record
    const updatedFinancial = await Financial.findByIdAndUpdate(
      _id,
      {
        date,
        storeId,
        gameFinances,
        expenses,
        totalMoneyIn,
        totalMoneyOut,
        moneyBalance,
        dailyProfit,
        notes,
        updatedBy,
        updatedAt: Date.now(),
      },
      { new: true, runValidators: true }
    )
    if (!updatedFinancial) {
      return res.status(404).json({ error: 'Financial record not found' })
    }

    // Fetch all financials for the user
    const financials = await Financial.find({ storeId })
      .sort({ date: -1 })
      .populate('storeId', 'storeName')

    res.json(financials)
  } catch (err) {
    res.status(500).json({ error: 'Error updating financial record' })
  }
})

router.post('/fetch-store-financials', requireAuth, async (req, res) => {
  const { storeId } = req.body
  const financials = await Financial.find({ storeId })
  res.json(financials)
})

router.post('/delete-financial', requireAuth, async (req, res) => {
  const { _id } = req.body
  const financialToDeltet = await Financial.findByIdAndDelete(_id)
  const { storeId } = financialToDeltet
  const financials = await Financial.find({ storeId })
  res.json(financials)
})  

module.exports = router
