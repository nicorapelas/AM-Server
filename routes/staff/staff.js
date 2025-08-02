const express = require('express')
const mongoose = require('mongoose')
const nodemailer = require('nodemailer')
const hbs = require('nodemailer-express-handlebars')
const path = require('path')
const Staff = mongoose.model('Staff')
const User = mongoose.model('User')
const requireAuth = require('../../middlewares/requireAuth')
const keys = require('../../config/keys').keys
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
  host: 'smtp.zoho.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: keys.zoho?.authenticateUser || process.env.ZOHO_AUTH_USER || 'hello@arcademanager.app',
    pass: keys.zoho?.authenticatePassword || process.env.ZOHO_AUTH_PASSWORD,
  },
  headers: {
    'X-Entity-Ref-ID': 'arcademanager',
    'Reply-To': 'hello@arcademanager.app'
  },
  from: {
    name: 'Arcade Manager',
    address: 'hello@arcademanager.app'
  }
})

// Add the handlebars configuration
transporter.use('compile', hbs(handlebarOptions))

// Staff welcome email function
const sendStaffWelcomeEmail = (staffData) => {
  const mailOptions = {
    from: {
      name: 'Arcade Manager',
      address: 'hello@arcademanager.app'
    },
    to: staffData.email,
    subject: 'Arcade Manager - Welcome to the Team!',
    template: 'staffUserWelcomeTemplate',
    context: {
      firstName: staffData.firstName,
      lastName: staffData.lastName,
      username: staffData.username,
      pin: staffData.pin,
      position: staffData.position,
      startDate: staffData.startDate
    },
    headers: {
      'X-Entity-Ref-ID': 'arcademanager',
      'Reply-To': 'hello@arcademanager.app'
    }
  }

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending staff welcome email:', error)
    } else {
      console.log('Staff welcome email sent: ' + info.response)
    }
  })
}

router.post('/create-staff', requireAuth, async (req, res) => {
  const { storeId, firstName, lastName, email, phone, position, startDate, paymentTerms, paymentMethod, paymentValue, username, pin, editFinancialEnabled, deleteFinancialEnabled } = req.body
  const staff = new Staff({ _user: req.user._id, storeId, firstName, lastName, email, phone, position, startDate, paymentTerms, paymentMethod, paymentValue, username, pin, editFinancialEnabled, deleteFinancialEnabled })
  await staff.save() 
  const newUser = new User({
    username: username,
    email: username,
    password: pin,
    localId: true,
    recipients: { email: email },
    emailVerified: true,
    staffCreds: true,
    staffStore: storeId,
    created: Date.now(),
  })
  await newUser.save()
  
  // Send welcome email to new staff member
  try {
    sendStaffWelcomeEmail({
      firstName,
      lastName,
      email,
      username,
      pin,
      position,
      startDate
    })
  } catch (error) {
    console.error('Error sending welcome email:', error)
  }
  
  const staffs = await Staff.find({ storeId })
  res.json(staffs)
})

router.post('/fetch-store-staff', requireAuth, async (req, res) => { 
  const { storeId } = req.body
  const staffs = await Staff.find({ storeId })  
  console.log(staffs)
  res.json(staffs)
})

router.post('/edit-staff', requireAuth, async (req, res) => {
  const { _id, ...staffData } = req.body
  const staff = await Staff.findByIdAndUpdate(_id, staffData, { new: true })
  const { storeId } = staff
  const staffs = await Staff.find({ storeId })
  res.json(staffs)
})

router.post('/delete-staff', requireAuth, async (req, res) => {
  const { _id } = req.body
  const staff = await Staff.findByIdAndDelete(_id)
  const { storeId } = staff
  const staffs = await Staff.find({ storeId })
  res.json(staffs)
})  

router.post('/create-loan', requireAuth, async (req, res) => {
  try {
    const { staffId, amount, notes } = req.body

    // Validate required fields
    if (!staffId || !amount) {
      return res.status(400).json({ error: 'Staff ID and amount are required' })
    }

    // Find the staff member
    const staff = await Staff.findById(staffId)
    if (!staff) {
      return res.status(404).json({ error: 'Staff member not found' })
    }

    // Check if staff already has an active loan
    if (staff.loan && staff.loan.status === 'active') {
      return res.status(400).json({ error: 'Staff member already has an active loan' })
    }

    // Calculate due date (30 days from now)
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 30)

    // Create new loan
    const newLoan = {
      amount: Number(amount),
      dateIssued: new Date(),
      dueDate,
      status: 'active',
      notes: notes || '',
      payments: []
    }

    // Update staff with new loan
    staff.loan = newLoan
    await staff.save()
    const staffs = await Staff.find({ storeId: staff.storeId })
    res.json(staffs)
  } catch (error) {
    console.error('Error creating loan:', error)
    res.status(500).json({ error: 'Error creating loan' })
  }
})

router.post('/add-loan-payment', requireAuth, async (req, res) => {
  try {
    const { staffId, amount, notes } = req.body

    // Validate required fields
    if (!staffId || !amount) {
      return res.status(400).json({ error: 'Staff ID and amount are required' })
    }

    // Find the staff member
    const staff = await Staff.findById(staffId)
    if (!staff) {
      return res.status(404).json({ error: 'Staff member not found' })
    }

    // Check if staff has an active loan
    if (!staff.loan || staff.loan.status !== 'active') {
      return res.status(400).json({ error: 'No active loan found for this staff member' })
    }

    // Create new payment
    const payment = {
      amount: Number(amount),
      date: new Date(),
      notes: notes || ''
    }

    // Add payment to loan's payments array
    staff.loan.payments.push(payment)

    // Calculate total payments
    const totalPayments = staff.loan.payments.reduce((sum, payment) => sum + payment.amount, 0)

    // Update loan status if fully paid
    if (totalPayments >= staff.loan.amount) {
      staff.loan.status = 'paid'
    }

    // Save the updated staff document
    await staff.save()

    // Return updated staff list
    const staffs = await Staff.find({ storeId: staff.storeId })
    res.json(staffs)
  } catch (error) {
    console.error('Error adding loan payment:', error)
    res.status(500).json({ error: 'Error adding loan payment' })
  }
})

router.post('/check-username-availability', requireAuth, async (req, res) => {
  const { username } = req.body
  const staff = await Staff.findOne({ username })
  res.json({ available: !staff })
})


module.exports = router
