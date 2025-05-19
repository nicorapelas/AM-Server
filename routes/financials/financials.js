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
      notes,
      actualCashCount,  
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

    // Calculate daily profit
    const dailyProfit = gameFinancesTotal - totalExpenses

    // Find the most recent financial entry for this store
    const previousFinancial = await Financial.findOne({ storeId })
      .sort({ date: -1 })
      .select('cash')

    // Calculate cash amount based on previous entry
    const previousCash = previousFinancial ? previousFinancial.cash : 0
    const cash = previousCash + dailyProfit

    const newFinancial = new Financial({
      _user: req.user._id,
      storeId,
      date: new Date(date),
      gameFinances: formattedGameFinances,
      expenses: formattedExpenses,
      totalMoneyIn: gameFinancesTotal > 0 ? gameFinancesTotal : 0,
      totalMoneyOut: gameFinancesTotal < 0 ? Math.abs(gameFinancesTotal) : 0,
      dailyProfit,
      cash,
      actualCashCount,
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
  console.log(`@ edit-financial`);
  console.log('Request body:', req.body);
  
  try {
    const {
      _id,
      date,
      storeId,
      gameFinances,
      expenses,
      gameFinancesTotal,
      totalExpenses,
      moneyBalance,
      notes,
      actualCashCount,
      updatedBy,
    } = req.body

    // Find the financial record to update
    const financialToUpdate = await Financial.findById(_id)
    console.log('financialToUpdate before:', financialToUpdate)
    console.log('actualCashCount from request:', actualCashCount)
    
    if (!financialToUpdate) {
      console.log('Financial record not found')
      return res.status(404).json({ error: 'Financial record not found' })
    }

    // Find the previous financial entry
    const previousFinancial = await Financial.findOne({
      storeId,
      date: { $lt: new Date(date) },
    })
      .sort({ date: -1 })
      .select('cash')

    // Calculate new cash amount based on the previous entry's cash
    const previousCash = previousFinancial ? previousFinancial.cash : 0
    const cash = previousCash + moneyBalance

    // Update the financial record
    const updateData = {
      date,
      storeId,
      gameFinances,
      expenses,
      totalMoneyIn: gameFinancesTotal,
      totalMoneyOut: totalExpenses,
      dailyProfit: moneyBalance,
      cash,
      actualCashCount,
      notes,
      updatedBy,
      updatedAt: Date.now(),
    }
    console.log('Update data:', updateData)

    const updatedFinancial = await Financial.findByIdAndUpdate(
      _id,
      updateData,
      { new: true, runValidators: true }
    )
    console.log('updatedFinancial after:', updatedFinancial)

    // Update all subsequent financial records' cash amounts
    const subsequentFinancials = await Financial.find({
      storeId,
      date: { $gt: new Date(date) },
    }).sort({ date: 1 })

    let runningCash = cash
    for (const financial of subsequentFinancials) {
      runningCash += financial.dailyProfit
      await Financial.findByIdAndUpdate(financial._id, { cash: runningCash })
    }

    // Fetch all financials for the user
    const financials = await Financial.find({ storeId })
      .sort({ date: -1 })
      .populate('storeId', 'storeName')

    res.json(financials)
  } catch (err) {
    console.error('Error in edit-financial:', err)
    res.status(500).json({ error: 'Error updating financial record' })
  }
})

router.post('/fetch-store-financials', requireAuth, async (req, res) => {
  const { storeId } = req.body
  const financials = await Financial.find({ storeId })
  res.json(financials)
})

router.post('/delete-financial', requireAuth, async (req, res) => {
  try {
    const { _id } = req.body
    const financialToDelete = await Financial.findById(_id)
    if (!financialToDelete) {
      return res.status(404).json({ error: 'Financial record not found' })
    }

    const { storeId, date } = financialToDelete

    // Delete the financial record
    await Financial.findByIdAndDelete(_id)

    // Recalculate cash amounts for all subsequent entries
    const subsequentFinancials = await Financial.find({
      storeId,
      date: { $gt: date },
    }).sort({ date: 1 })

    // Find the new previous entry
    const newPreviousFinancial = await Financial.findOne({
      storeId,
      date: { $lt: date },
    })
      .sort({ date: -1 })
      .select('cash')

    let runningCash = newPreviousFinancial ? newPreviousFinancial.cash : 0
    for (const financial of subsequentFinancials) {
      runningCash += financial.dailyProfit
      await Financial.findByIdAndUpdate(financial._id, { cash: runningCash })
    }

    const financials = await Financial.find({ storeId })
    res.json(financials)
  } catch (err) {
    res.status(500).json({ error: 'Error deleting financial record' })
  }
})

module.exports = router
