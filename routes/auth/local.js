const express = require('express')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const passport = require('passport')
const path = require('path')
const nodemailer = require('nodemailer')
const hbs = require('nodemailer-express-handlebars')
const async = require('async')
const crypto = require('crypto')
const User = mongoose.model('User')
const keys = require('../../config/keys').keys
const requireAuth = require('../../middlewares/requireAuth')
const validateRegisterInput = require('../../validation/register')
const  validateEmailInput  = require('../../validation/email')
const validatePasswordReset = require('../../validation/passwordReset')


const router = express.Router()

// Nodemailer Handlebars
const handlebarOptions = {
  viewEngine: {
    extName: '.handlebars',
    partialsDir: path.resolve('./templates/mailTemplates'),
    defaultLayout: false,
  },
  viewPath: path.resolve('./templates/mailTemplates'),
  extName: '.handlebars',
}
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: keys.google?.authenticateUser || process.env.GOOGLE_AUTH_USER,
    pass: keys.google?.authenticatePassword || process.env.GOOGLE_AUTH_PASSWORD,
  },
  headers: {
    'X-Entity-Ref-ID': 'arcademanager',
    'Reply-To': 'auth@arcademanager.app'
  },
  from: {
    name: 'Arcade Manager',
    address: 'auth@arcademanager.app'
  }
})

// Add the handlebars configuration
transporter.use('compile', hbs(handlebarOptions))

// Add DKIM and SPF settings
transporter.verify(function(error, success) {
  if (error) {
    console.log(error);
  } else {
    console.log("Server is ready to take our messages");
  }
});

// Register mailer options
mailManRegister = (email, id) => {
  const mailOptionsRegister = {
    from: {
      name: 'Arcade Manager',
      address: 'auth@arcademanager.app'
    },
    to: email,
    subject: 'Arcade Manager - User authentication',
    template: 'verifyEmailTemplate',
    context: {
      id
    },
    headers: {
      'X-Entity-Ref-ID': 'arcademanager',
      'Reply-To': 'auth@arcademanager.app'
    }
  }
  transporter.sendMail(mailOptionsRegister, (error, info) => {
    if (error) {
      console.log(error)
    } else {
      console.log('Email sent: ' + info.response)
    }
  })
}

// Forgot password mailer options
mailManForgotPassword = (email, token) => {
  const mailOptionsForgotPassword = {
    from: {
      name: 'Arcade Manager',
      address: 'auth@arcademanager.app'
    },
    to: email,
    subject: 'Arcade Manager - User authentication',
    template: 'resetPasswordTemplate',
    context: {
      token,
    },
    headers: {
      'X-Entity-Ref-ID': 'arcademanager',
      'Reply-To': 'auth@arcademanager.app'
    }
  }
  transporter.sendMail(mailOptionsForgotPassword, (error, info) => {
    if (error) {
      console.log(error)
    } else {
      console.log('Email sent: ' + info.response)
    }
  })
}

// Email update mailer options
mailManEmailUpdate = (email, pin) => {
  const mailOptionsEmailUpdate = {
    from: {
      name: 'Arcade Manager',
      address: 'auth@arcademanager.app'
    },
    to: email,
    subject: `Arcade Manager - Email Update Verification PIN: ${pin}`,
    template: 'emailUpdateTemplate',
    context: {
      pin,
    },
    headers: {
      'X-Entity-Ref-ID': 'arcademanager',
      'Reply-To': 'auth@arcademanager.app'
    }
  }
  transporter.sendMail(mailOptionsEmailUpdate, (error, info) => {
    if (error) {
      console.log(error)
    } else {
      console.log('Email sent: ' + info.response)
    }
  })
}

// @route  POST /auth/user/fetch-user
// @desc   Fetch current user
// @access public
router.get('/fetch-user', requireAuth, (req, res) => {
  try {
    const user = req.user
    if (!user) {
      res.json({ error: 'no user' })
      return
    } else {
      res.json(user)
      return
    }
  } catch (error) {
    console.log(error)
    res.status(500).json({ error: 'Server error' })
  }
})

// @route  POST /auth/user/register
// @desc   Register a user and respond with JWT
// @access public
router.post('/register', async (req, res) => {
  // Validation check
  const { errors, isValid } = validateRegisterInput(req.body)
  if (!isValid) {
    res.json({ error: errors })
    return
  }
  // Check if User exists
  const userCheck = await User.findOne({ email: req.body.email })
  if (userCheck) {
    errors.email = 'Email already in use'
    res.json({ error: errors })
    return
  }
  const { email, password, affiliatceIntroCode } = req.body
  try {
    const newUser = new User({
      username: email,
      email,
      password,
      affiliatceIntroCode,
      localId: true,
      recipients: { email },
      created: Date.now(),
    })
    // Send verification email
    mailManRegister(email, newUser._id)
    await newUser.save()
    return res.send({
      success: `An 'email verification' email has been sent to you. Please open the email and follow the provided instructions.`,
    })
  } catch (err) {
    return res.send(err.message)
  }
})

// @route  POST /auth/user/resend-verification-email
// @desc   Resend verification email
// @access public
router.post('/resend-verification-email', async (req, res) => {
  const { email } = req.body
  const user = await User.findOne({ email })
  if (!user) {
    let errors = { email: 'Email address not found' }
    return res.send({ error: errors })
  }
  mailManRegister(email, user._id)
  return res.send({ success: 'Verification email sent' })
})

// @route  GET /auth/user/login
// @desc   Login a user and respond with JWT
// @access public
router.post('/login', async (req, res) => {
  // Validation check
  const errors = {}
  const { email, password } = req.body
  // Check if user with email registered
  const user = await User.findOne({ email })
  if (!user) {
    errors.email = 'Invalid username or password'
    res.json({ error: errors })
    return
  }
  // Check if users email verified
  if (!user.emailVerified) {
    res.json({
      error: { notVerified: 'Email address not yet verified' },
    })
    return
  }
  try {
    await user.comparePassword(password)
    const token = jwt.sign({ userId: user._id }, keys.JWT.secret)
    res.json({ token })
  } catch (err) {
    errors.password = 'Invalid username or password'
    res.json({ error: errors })
    return
  }
})

// @route  POST /auth/user/email-verified
// @desc   Verify email
// @access public
router.post('/email-verified', (req, res) => {
  const { _id } = req.body
  User.findOne({ _id }, (err, user) => {
    if (err) {
      res.json({ error: err })
    } else {
      user.emailVerified = true
      user.save((err) => {
        if (err) {
          res.json({ error: err })
        } else {
          res.json(user)
        }
      })
    }
  })
})

// @route  POST /auth/user/forgot
// @desc   Post to forgot password
// @access public
router.post('/forgot', (req, res) => {
  const { email } = req.body
  async.waterfall([
    (done) => {
      crypto.randomBytes(20, (err, buf) => {
        const token = buf.toString('hex')
        done(err, token)
      })
    },
    (token, done) => {
      const { errors, isValid } = validateEmailInput(email)
      if (!isValid) {
        res.json({ error: errors })
        return
      }
      User.findOne({ email }, (err, user) => {
        if (!user) {
          errors.email = 'Email address not registered'
          res.json({ error: errors })
          return
        }
        if (user.googleId) {
          res.json({
            error: {
              warn: `You've previously registered using Google, please login using Google`,
            },
          })
          return
        }
        if (user.facebookId) {
          res.json({
            error: {
              warn: `You've previously registered using Facebook, please login using Facebook`,
            },
          })
          return
        }
        user.recipients = { email }
        user.resetPasswordToken = token
        user.resetPasswordExpires = Date.now() + 3600000
        user.save((err) => {
          done(err, token, user)
        })
      })
    },
    async (token) => {
      // Send email for verification and save user
      try {
        await mailManForgotPassword(email, token)
        res.json({
          success: `A "password reset" email was sent to you. Please view the email and click on the provided "Reset password"
        link, within the email.`,
        })
        return
      } catch (err) {
        res.json(err)
        console.log(err)
        return
      }
    },
  ])
})

// @route  GET /auth/user/reset/:token
// @desc   Reset password
// @access public
router.get('/reset/:token', (req, res) => {
  User.findOne(
    {
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() },
    },
    (err, user) => {
      if (!user) {
        res.json(err)
        return
      }
      res.redirect(`http://localhost:3000/reset-password/${req.params.token}`)
      return
    }
  )
})

// @route  POST /auth/user/reset
// @desc   Reset password
// @access public
router.post('/reset', (req, res) => {
  const { password, token } = req.body
  async.waterfall(
    [
      (done) => {
        User.findOne(
          {
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() },
          },
          (err, user) => {
            if (!user) {
              res.json({
                error: {
                  token:
                    'Reset token has expired, please try reseting your password again',
                },
              })
              return
            }
            // Validation check
            const { errors, isValid } = validatePasswordReset(req.body)
            if (!isValid) {
              console.log(errors)
              res.json({ error: errors })
              return
            }
            user.password = password
            user.resetPasswordToken = undefined
            user.resetPasswordExpires = undefined
            user
              .save()
              .then(res.json({ success: 'Password reset succefull' }))
              .catch((err) => err)
            return
          }
        )
      },
    ],
    (err) => {
      res.json(err)
      console.log(err)
      return
    }
  )
})

// @route  POST /auth/user/update-user-profile
// @desc   Update user profile
// @access protected
router.patch('/update-user-profile', requireAuth, async (req, res) => {
  console.log('req.body @ update-user-profile', req.body)
  const { email, name } = req.body

  // Validate email
  const { errors, isValid } = validateEmailInput(email)
  if (!isValid) {
    return res.json({ error: errors })
  }

  try {
    const user = await User.findById(req.user._id)
    
    // If email is the same as current user's email
    if (email === user.email) {
      // Only update name if provided
      if (name) {
        user.name = name
        await user.save()
      }
      return res.json({
        success: 'Name updated successfully'
      })
    }

    // Check if email is already in use by another user
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.json({ error: { email: 'Email already in use' } })
    }

    // Generate 6-digit PIN
    const pin = Math.floor(100000 + Math.random() * 900000).toString()
    
    // Set expiration time (5 minutes from now)
    const emailUpdatePinExpires = Date.now() + 5 * 60 * 1000

    // Update user document
    user.emailUpdatePin = pin
    user.emailUpdatePinExpires = emailUpdatePinExpires
    user.pendingEmailUpdate = email // Store the new email
    if (name) {
      user.name = name
    }
    await user.save()

    // Send email with PIN
    await mailManEmailUpdate(email, pin)

    return res.json({
      success: 'A verification PIN has been sent to your new email address. Please enter the PIN within 5 minutes to complete the update.'
    })

  } catch (err) {
    console.error('Error in update-user-profile:', err)
    return res.status(500).json({ error: 'Server error' })
  }
})

// @route  POST /auth/user/verify-email-update-pin
// @desc   Verify email update PIN
// @access protected
router.post('/verify-email-update-pin', requireAuth, async (req, res) => {
  try {
    const { emailUpdatePin, email } = req.body
    const user = await User.findById(req.user._id)

    // Check if PIN exists and hasn't expired
    if (!user.emailUpdatePin || !user.emailUpdatePinExpires) {
      return res.json({ error: { pin: 'No pending email update request' }})
    }

    // Check if PIN has expired (5 minutes after creation)
    const currentTime = Date.now()
    const pinExpirationTime = user.emailUpdatePinExpires
    const timeRemaining = pinExpirationTime - currentTime

    if (timeRemaining <= 0) {
      // Clear expired PIN data
      user.emailUpdatePin = undefined
      user.emailUpdatePinExpires = undefined
      await user.save()
      
        return res.json({ error: { pin: 'PIN has expired. Please request a new PIN.' }})
      }

    // Verify PIN
    if (user.emailUpdatePin !== emailUpdatePin) {
      return res.json({error: { pin: 'Invalid PIN' }})
    }

    // Update user's email
    user.email = email
    user.username = email
    user.recipients = { email }
    
    // Clear PIN and expiration
    user.emailUpdatePin = undefined
    user.emailUpdatePinExpires = undefined
    user.pendingEmailUpdate = undefined

    // Save the updated user
    await user.save()
    const updatedUser = await User.findById(req.user._id)
    return res.json(updatedUser)

  } catch (err) {
    console.error('Error in verify-email-update-pin:', err)
    return res.status(500).json({ error: 'Server error' })
  }
})

// @route  POST /auth/user/update-password-via-profile
// @desc   Update user password via profile
// @access protected
router.patch('/update-password-via-profile', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body
    const user = await User.findById(req.user._id)

    // Validate current password
    try {
      await user.comparePassword(currentPassword)
    } catch (err) {
      return res.json({ error: { currentPassword: 'Current password is incorrect' } })
    }

    // Validate new password
    const { errors, isValid } = validatePasswordReset({
      password: newPassword,
      password2: confirmPassword
    })

    if (!isValid) {
      return res.json({ error: errors })
    }

    // Update password
    user.password = newPassword
    await user.save()

    return res.json({
      success: 'Password updated successfully'
    })

  } catch (err) {
    console.error('Error in update-password-via-profile:', err)
    return res.status(500).json({ error: 'Server error' })
  }
})

// @route  POST /auth/user/delete-account
// @desc   Delete account
// @access protected
router.delete('/delete-account', requireAuth, async (req, res) => {
  console.log('Goodbuy')
  const user = await User.findById(req.user._id)
  await user.remove()
  return res.json({ success: 'Account deleted successfully' })
})

module.exports = router
