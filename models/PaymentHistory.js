const mongoose = require('mongoose')
const Schema = mongoose.Schema

const PaymentHistorySchema = new Schema({
  _user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  _store: {
    type: Schema.Types.ObjectId,
    ref: 'Store',
    required: true,
  },
  subscriptionId: {
    type: String,
    required: true,
  },
  paymentId: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: 'USD',
  },
  status: {
    type: String,
    enum: ['SUCCESS', 'FAILED', 'PENDING', 'CANCELLED', 'REFUNDED'],
    required: true,
  },
  paymentMethod: {
    type: String,
    enum: ['PayPal', 'Free Tier', 'Credit Card', 'Bank Transfer'],
    default: 'PayPal',
  },
  billingCycle: {
    type: String,
    enum: ['MONTHLY', 'YEARLY', 'N/A'],
    default: 'MONTHLY',
  },
  failureReason: {
    type: String,
  },
  metadata: {
    type: Object,
  },
  processedAt: {
    type: Date,
    default: Date.now,
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

// Index for efficient queries
PaymentHistorySchema.index({ _user: 1, _store: 1, processedAt: -1 })
PaymentHistorySchema.index({ subscriptionId: 1 })
PaymentHistorySchema.index({ status: 1 })

module.exports = mongoose.model('PaymentHistory', PaymentHistorySchema) 