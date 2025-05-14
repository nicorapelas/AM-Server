const express = require('express')
const mongoose = require('mongoose')
const Staff = mongoose.model('Staff')
const requireAuth = require('../../middlewares/requireAuth')
const router = express.Router()

router.post('/create-staff', requireAuth, async (req, res) => {
  const { storeId, firstName, lastName, email, phone, position, startDate, paymentTerms, paymentMethod, paymentValue, username, pin } = req.body
  const staff = new Staff({ _user: req.user._id, storeId, firstName, lastName, email, phone, position, startDate, paymentTerms, paymentMethod, paymentValue, username, pin })
  await staff.save()
  const staffs = await Staff.find({ storeId })
  res.json(staffs)
})

router.post('/fetch-store-staff', requireAuth, async (req, res) => {
  const { storeId } = req.body
  const staffs = await Staff.find({ storeId })
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


module.exports = router
