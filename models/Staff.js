const mongoose = require('mongoose')
const Schema = mongoose.Schema

const LoanSchema = new Schema({
  amount: {
    type: Number,
    required: true,
  },
  dateIssued: {
    type: Date,
    default: Date.now,
  },
  dueDate: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'paid', 'overdue'],
    default: 'active',
  },
  notes: {
    type: String,
  },
  payments: [{
    amount: {
      type: Number,
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
    }
  }]
})

const StaffSchema = new Schema({
  _user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  storeId: {
    type: String,
    required: true,
    trim: true,
  },
  username: {
    type: String,
    required: true,
    trim: true,
  },
  pin: {
    type: String,
  },
  firstName: {
    type: String,
    required: true,
    trim: true,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
  },
  phone: {
    type: String,
  },
  position: {
    type: String,
  },
  startDate: {
    type: Date,
  },
  paymentTerms: {
    type: String,
  },
  paymentValue: {
    type: Number,
  },
  paymentMethod: {
    type: String,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  loan: {
    type: LoanSchema,
  },
  editFinancialEnabled: {
    type: Boolean,
    default: false,
  },
  deleteFinancialEnabled: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

module.exports = mongoose.model('Staff', StaffSchema)
