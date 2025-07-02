const mongoose = require('mongoose')
const Schema = mongoose.Schema

const StoreSchema = new Schema({
  _user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  staffUserId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  storeName: {
    type: String,
    required: true,
    trim: true,
  },
  address: {
    type: String,
    required: true,
    trim: true,
  },
  notes: {
    type: String,
  },
  description: {
    type: String,
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  subscriptionId: {
    type: String,
    trim: true,
  },
  // Payment status tracking
  paymentStatus: {
    type: String,
    enum: ['ACTIVE', 'FAILED', 'SUSPENDED', 'CANCELLED', 'PENDING'],
    default: 'PENDING'
  },
  lastPaymentDate: {
    type: Date,
  },
  nextPaymentDate: {
    type: Date,
  },
  paymentFailureCount: {
    type: Number,
    default: 0
  },
  lastPaymentFailure: {
    type: Date,
  },
  paymentFailureReason: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  username: {
    type: String,
  },
  password: {
    type: String,
  },
  tier: {
    type: String,
    default: 'free-tier',
  },
  tierAnchorDate: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
})

module.exports = mongoose.model('Store', StoreSchema)
