const express = require('express')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const passport = require('passport')
const path = require('path')
const nodemailer = require('nodemailer')
const hbs = require('nodemailer-express-handlebars')
const User = mongoose.model('User')
const keys = require('../../config/keys').keys
const requireAuth = require('../../middlewares/requireAuth')
const validateRegisterInput = require('../../validation/register')

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
    user: keys.google.authenticateUser,
    pass: keys.google.authenticatePassword,
  },
})
transporter.use('compile', hbs(handlebarOptions))
// Register mailer options
mailManRegister = (email, id) => {
  const mailOptionsRegister = {
    from: 'nicorapelas@cvcloud.com',
    to: email,
    subject: 'CV Cloud - User authentication',
    template: 'verifyEmailTemplate',
    context: {
      id,
    },
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
    from: 'nicorapelas@cvcloud.com',
    to: email,
    subject: 'CV Cloud - User authentication',
    template: 'resetPasswordTemplate',
    context: {
      token,
    },
  }
  transporter.sendMail(mailOptionsForgotPassword, (error, info) => {
    if (error) {
      console.log(error)
    } else {
      console.log('Email sent: ' + info.response)
    }
  })
}

// // Forgot password mailer options
// mailManForgotPassword = (email, token) => {
//   const mailOptionsForgotPassword = {
//     from: 'nicorapelas@cvcloud.com',
//     to: email,
//     subject: 'CV Cloud - User authentication',
//     template: 'resetPasswordTemplate',
//     context: {
//       token,
//     },
//   }
//   transporter.sendMail(mailOptionsForgotPassword, (error, info) => {
//     if (error) {
//       console.log(error)
//     } else {
//       console.log('Email sent: ' + info.response)
//     }
//   })
// }

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
// router.post('/register', async (req, res) => {
//   // Validation check
//   // Check if User exists
//   const userCheck = await User.findOne({ email: req.body.email })
//   console.log(`userCheck`, userCheck)
//   if (userCheck) {
//     errors.email = 'Email already in use'
//     res.json({ error: errors })
//     return
//   }
//   const { email, password } = req.body
//   try {
//     // Create user
//     const newUser = new User({
//       username: email,
//       email,
//       password,
//       bossCreds: true,
//       created: Date.now(),
//     })
//     // Send verification email
//     await newUser.save()
//     return res.send({
//       success: `An 'email verification' email has been sent to you. Please open the email and follow the provided instructions.`,
//     })
//   } catch (err) {
//     return res.send(err.message)
//   }
// })

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

const signToken = (userID) => {
  return jwt.sign(
    {
      iss: 'NoobCoder',
      sub: userID,
    },
    'NoobCoder',
    { expiresIn: '1h' }
  )
}

// @route  POST /auth/user/login-web
// @desc   Login a user and respond with JWT
// @access public
router.post(
  '/login-web',
  passport.authenticate('local', { session: false }),
  (req, res) => {
    if (req.isAuthenticated()) {
      const { _id, username, role } = req.user
      const token = signToken(_id)
      res.cookie('access_token', token, { httpOnly: true, sameSite: true })
      res.status(200).json({ isAuthenticated: true, user: { username, role } })
    }
  }
)

module.exports = router
