const mongoose = require('mongoose')
const bcrypt = require('bcrypt')

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  email: {
    type: String,
  },
  password: {
    type: String,
  },
  name: {
    type: String,
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  emailUpdatePin: {
    type: String,
  },
  emailUpdatePinExpires: {
    type: Date,
  },
  resetPasswordToken: {
    type: String,
  },
  resetPasswordExpires: {
    type: Date,
  },
  avatar: {
    type: String,
    default: '',
  },
  bossCreds: {
    type: Boolean,
    default: false,
  },
  staffCreds: {
    type: Boolean,
    default: false,
  },
  staffStore: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
  },
  created: {
    type: Date,
    default: Date.now,
  },
})

userSchema.pre('save', function (next) {
  const user = this
  if (!user.isModified('password')) {
    return next()
  }
  bcrypt.genSalt(10, (err, salt) => {
    if (err) {
      return next(err)
    }
    bcrypt.hash(user.password, salt, (err, hash) => {
      if (err) {
        return next(err)
      }
      user.password = hash
      next()
    })
  })
})

userSchema.methods.comparePassword = function (candidatePassword) {
  const user = this

  return new Promise((resolve, reject) => {
    bcrypt.compare(candidatePassword, user.password, (err, isMatch) => {
      if (err) {
        return reject(err)
      }
      if (!isMatch) {
        return reject(false)
      }
      resolve(true)
    })
  })
}

mongoose.model('User', userSchema)
