const mongoose = require('mongoose')
const Schema = mongoose.Schema

const SupportSchema = new Schema({
  // User reference
  _user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  // Form type (support or feature)
  formType: {
    type: String,
    enum: ['support', 'feature'],
    required: true,
  },

  // Contact information
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },

  // Support request fields
  category: {
    type: String,
    enum: ['Technical', 'Billing', 'Account', 'Bug', 'General'],
    required: function() { return this.formType === 'support'; },
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Urgent'],
    required: function() { return this.formType === 'support'; },
  },
  subject: {
    type: String,
    required: function() { return this.formType === 'support'; },
    trim: true,
  },
  message: {
    type: String,
    required: function() { return this.formType === 'support'; },
    trim: true,
  },

  // Feature suggestion fields
  featureName: {
    type: String,
    required: function() { return this.formType === 'feature'; },
    trim: true,
  },
  featureDescription: {
    type: String,
    required: function() { return this.formType === 'feature'; },
    trim: true,
  },
  useCase: {
    type: String,
    required: function() { return this.formType === 'feature'; },
    trim: true,
  },
  impact: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    required: function() { return this.formType === 'feature'; },
  },

  // Status tracking
  status: {
    type: String,
    enum: ['Open', 'In Progress', 'Resolved', 'Closed'],
    default: 'Open',
  },

  // Admin response
  adminResponse: {
    type: String,
    trim: true,
  },
  adminResponseDate: {
    type: Date,
  },
  adminResponder: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
})

// Update the updatedAt field before saving
SupportSchema.pre('save', function(next) {
  this.updatedAt = Date.now()
  next()
})

// Virtual for getting the title based on form type
SupportSchema.virtual('title').get(function() {
  if (this.formType === 'support') {
    return this.subject || 'Support Request'
  } else {
    return this.featureName || 'Feature Suggestion'
  }
})

// Virtual for getting the description based on form type
SupportSchema.virtual('description').get(function() {
  if (this.formType === 'support') {
    return this.message
  } else {
    return this.featureDescription
  }
})

// Ensure virtuals are included when converting to JSON
SupportSchema.set('toJSON', { virtuals: true })
SupportSchema.set('toObject', { virtuals: true })

module.exports = mongoose.model('Support', SupportSchema)
