const mongoose = require('mongoose')
const Schema = mongoose.Schema

const GameSchema = new Schema({
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
  gameName: {
    type: String,
    required: true,
    trim: true,
  },
  quantity: {
    type: Number,
  },
  commission: {
    type: Number,
  },
  repName: {
    type: String,
  },
  repPhone: {
    type: String,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

module.exports = mongoose.model('Game', GameSchema)
