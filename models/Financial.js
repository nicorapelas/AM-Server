const mongoose = require('mongoose')
const Schema = mongoose.Schema

// Create a sub-schema for game finances
const GameFinanceSchema = new Schema({
  gameId: {
    type: Schema.Types.ObjectId,
    ref: 'Game',
    required: true,
  },
  gameName: {
    type: String,
    required: true,
  },
  sum: {
    type: Number,
    required: true,
  },
})

// Create a sub-schema for expenses
const ExpenseSchema = new Schema({
  description: {
    type: String,
    required: true,
    trim: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  category: {
    type: String,
    enum: ['Utilities', 'Maintenance', 'Supplies', 'Payroll', 'Other'],
    default: 'Other',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

const FinancialSchema = new Schema({
  _user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  storeId: {
    type: Schema.Types.ObjectId,
    ref: 'Store',
    required: true,
  },
  createdBy: {
    type: String,
  },
  updatedBy: {
    type: String,
  },
  date: {
    type: Date,
    required: true,
  },
  gameFinances: [GameFinanceSchema],
  totalMoneyIn: {
    type: Number,
  },
  totalMoneyOut: {
    type: Number,
  },
  expenses: [ExpenseSchema],
  dailyProfit: {
    type: Number,
  },
  cash: {
    type: Number,
    default: 0,
    required: true,
  },
  actualCashCount: {
    type: Number,
    default: 0,
  },
  notes: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,  
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
})

// Add pre-save middleware to calculate totals
FinancialSchema.pre('save', function (next) {
  // Calculate total from game finances sums
  const gameFinancesTotal = this.gameFinances.reduce(
    (total, game) => total + game.sum,
    0
  )

  // Calculate expenses total
  const expensesTotal = this.expenses.reduce(
    (total, expense) => total + expense.amount,
    0
  )

  // Update totals
  this.totalMoneyIn = gameFinancesTotal > 0 ? gameFinancesTotal : 0
  this.totalMoneyOut = gameFinancesTotal < 0 ? Math.abs(gameFinancesTotal) : 0
  this.totalMoneyOut += expensesTotal

  // Calculate daily profit
  this.dailyProfit = this.totalMoneyIn - this.totalMoneyOut

  // Update cash amount
  if (this.isNew) {
    // For new entries, cash is the daily profit
    this.cash = this.dailyProfit
  } else {
    // For existing entries, we need to find the previous entry's cash amount
    // This will be handled in the route handler since we need to query the database
  }

  next()
})

module.exports = mongoose.model('Financial', FinancialSchema)
