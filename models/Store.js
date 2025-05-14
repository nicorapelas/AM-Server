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
  updatedAt: {
    type: Date,
    default: Date.now,
  },
})

module.exports = mongoose.model('Store', StoreSchema)
