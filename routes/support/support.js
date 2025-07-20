const express = require('express')
const mongoose = require('mongoose')
const nodemailer = require('nodemailer')
const path = require('path')
const hbs = require('nodemailer-express-handlebars')
const Support = mongoose.model('Support')
const requireAuth = require('../../middlewares/requireAuth')
const { keys } = require('../../config/keys')
const router = express.Router()

// Nodemailer Handlebars configuration
const handlebarOptions = {
  viewEngine: {
    extName: '.handlebars',
    partialsDir: path.resolve('./templates/mailTemplates'),
    defaultLayout: false,
  },
  viewPath: path.resolve('./templates/mailTemplates'),
  extName: '.handlebars',
}

// Create transporter for support emails
const supportTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: keys.google?.authenticateUser || process.env.GOOGLE_AUTH_USER,
    pass: keys.google?.authenticatePassword || process.env.GOOGLE_AUTH_PASSWORD,
  },
  headers: {
    'X-Entity-Ref-ID': 'arcademanager',
    'Reply-To': 'support@arcademanager.app'
  },
  from: {
    name: 'Arcade Manager Support',
    address: 'authenticator@cvcloud.app'
  }
})

// Add the handlebars configuration
supportTransporter.use('compile', hbs(handlebarOptions))

// Support email function
const sendSupportEmail = (supportData) => {
  const mailOptions = {
    from: {
      name: 'Arcade Manager Support',
      address: 'authenticator@cvcloud.app'
    },
    to: 'nicorapelas@gmail.com',
    subject: `Arcade Manager - ${supportData.formType === 'support' ? 'Support Request' : 'Feature Suggestion'} from ${supportData.name}`,
    template: 'contactSupportTemplate',
    context: {
      ...supportData,
      isSupportRequest: supportData.formType === 'support',
      timestamp: new Date().toLocaleString()
    },
    headers: {
      'X-Entity-Ref-ID': 'arcademanager',
      'Reply-To': 'support@arcademanager.app'
    }
  }

  supportTransporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending support email:', error)
    } else {
      console.log('Support email sent: ' + info.response)
    }
  })
}

// @route  POST /support/create-support-request
// @desc   Create a new support request or feature suggestion
// @access private
router.post('/create-support-request', requireAuth, async (req, res) => {
  try {
    const {
      formType,
      name,
      email,
      category,
      priority,
      subject,
      message,
      featureName,
      featureDescription,
      useCase,
      impact
    } = req.body

    // Validate required fields based on form type
    if (!formType || !name || !email) {
      return res.status(400).json({ error: 'Form type, name, and email are required' })
    }

    if (formType === 'support') {
      if (!category || !priority || !subject || !message) {
        return res.status(400).json({ error: 'All support fields are required' })
      }
    } else if (formType === 'feature') {
      if (!featureName || !featureDescription || !useCase || !impact) {
        return res.status(400).json({ error: 'All feature suggestion fields are required' })
      }
    } else {
      return res.status(400).json({ error: 'Invalid form type' })
    }

    // Create support request
    const supportRequest = new Support({
      _user: req.user._id,
      formType,
      name,
      email,
      category,
      priority,
      subject,
      message,
      featureName,
      featureDescription,
      useCase,
      impact,
      status: 'Open'
    })

    await supportRequest.save()

    // Send email notification to support team
    try {
      sendSupportEmail({
        formType,
        name,
        email,
        category,
        priority,
        subject,
        message,
        featureName,
        featureDescription,
        useCase,
        impact
      })
    } catch (emailError) {
      console.error('Error sending support email:', emailError)
      // Don't fail the request if email fails
    }

    // Return the created support request
    res.json({
      success: true,
      message: formType === 'support' 
        ? 'Support request submitted successfully' 
        : 'Feature suggestion submitted successfully',
      supportRequest
    })

  } catch (error) {
    console.error('Error creating support request:', error)
    res.status(500).json({ error: 'Error creating support request' })
  }
})

// @route  POST /support/fetch-user-support-requests
// @desc   Fetch all support requests for the current user
// @access private
router.post('/fetch-user-support-requests', requireAuth, async (req, res) => {
  try {
    const supportRequests = await Support.find({ _user: req.user._id })
      .sort({ createdAt: -1 })
      .populate('_user', 'username email')

    res.json(supportRequests)
  } catch (error) {
    console.error('Error fetching user support requests:', error)
    res.status(500).json({ error: 'Error fetching support requests' })
  }
})

// @route  POST /support/fetch-all-support-requests
// @desc   Fetch all support requests (admin only)
// @access private
router.post('/fetch-all-support-requests', requireAuth, async (req, res) => {
  try {
    // Check if user has admin privileges (you may need to adjust this based on your user model)
    if (!req.user.bossCreds) {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' })
    }

    const supportRequests = await Support.find({})
      .sort({ createdAt: -1 })
      .populate('_user', 'username email')
      .populate('adminResponder', 'username email')

    res.json(supportRequests)
  } catch (error) {
    console.error('Error fetching all support requests:', error)
    res.status(500).json({ error: 'Error fetching support requests' })
  }
})

// @route  POST /support/fetch-support-request
// @desc   Fetch a specific support request by ID
// @access private
router.post('/fetch-support-request', requireAuth, async (req, res) => {
  try {
    const { _id } = req.body

    if (!_id) {
      return res.status(400).json({ error: 'Support request ID is required' })
    }

    const supportRequest = await Support.findById(_id)
      .populate('_user', 'username email')
      .populate('adminResponder', 'username email')

    if (!supportRequest) {
      return res.status(404).json({ error: 'Support request not found' })
    }

    // Check if user has permission to view this request
    if (!req.user.bossCreds && supportRequest._user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' })
    }

    res.json(supportRequest)
  } catch (error) {
    console.error('Error fetching support request:', error)
    res.status(500).json({ error: 'Error fetching support request' })
  }
})

// @route  POST /support/update-support-request
// @desc   Update support request status and admin response
// @access private (admin only)
router.post('/update-support-request', requireAuth, async (req, res) => {
  try {
    const { _id, status, adminResponse } = req.body

    // Check if user has admin privileges
    if (!req.user.bossCreds) {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' })
    }

    if (!_id) {
      return res.status(400).json({ error: 'Support request ID is required' })
    }

    const updateData = {}
    if (status) updateData.status = status
    if (adminResponse) {
      updateData.adminResponse = adminResponse
      updateData.adminResponseDate = new Date()
      updateData.adminResponder = req.user._id
    }

    const supportRequest = await Support.findByIdAndUpdate(
      _id,
      updateData,
      { new: true }
    ).populate('_user', 'username email')
     .populate('adminResponder', 'username email')

    if (!supportRequest) {
      return res.status(404).json({ error: 'Support request not found' })
    }

    res.json({
      success: true,
      message: 'Support request updated successfully',
      supportRequest
    })

  } catch (error) {
    console.error('Error updating support request:', error)
    res.status(500).json({ error: 'Error updating support request' })
  }
})

// @route  POST /support/delete-support-request
// @desc   Delete a support request
// @access private (admin or owner)
router.post('/delete-support-request', requireAuth, async (req, res) => {
  try {
    const { _id } = req.body

    if (!_id) {
      return res.status(400).json({ error: 'Support request ID is required' })
    }

    const supportRequest = await Support.findById(_id)

    if (!supportRequest) {
      return res.status(404).json({ error: 'Support request not found' })
    }

    // Check if user has permission to delete this request
    if (!req.user.bossCreds && supportRequest._user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' })
    }

    await Support.findByIdAndDelete(_id)

    res.json({
      success: true,
      message: 'Support request deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting support request:', error)
    res.status(500).json({ error: 'Error deleting support request' })
  }
})

// @route  POST /support/fetch-support-stats
// @desc   Fetch support request statistics (admin only)
// @access private
router.post('/fetch-support-stats', requireAuth, async (req, res) => {
  try {
    // Check if user has admin privileges
    if (!req.user.bossCreds) {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' })
    }

    const stats = await Support.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          open: { $sum: { $cond: [{ $eq: ['$status', 'Open'] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ['$status', 'In Progress'] }, 1, 0] } },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'Resolved'] }, 1, 0] } },
          closed: { $sum: { $cond: [{ $eq: ['$status', 'Closed'] }, 1, 0] } },
          supportRequests: { $sum: { $cond: [{ $eq: ['$formType', 'support'] }, 1, 0] } },
          featureSuggestions: { $sum: { $cond: [{ $eq: ['$formType', 'feature'] }, 1, 0] } }
        }
      }
    ])

    const categoryStats = await Support.aggregate([
      { $match: { formType: 'support' } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
    ])

    const priorityStats = await Support.aggregate([
      { $match: { formType: 'support' } },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ])

    res.json({
      overall: stats[0] || {
        total: 0,
        open: 0,
        inProgress: 0,
        resolved: 0,
        closed: 0,
        supportRequests: 0,
        featureSuggestions: 0
      },
      categories: categoryStats,
      priorities: priorityStats
    })

  } catch (error) {
    console.error('Error fetching support stats:', error)
    res.status(500).json({ error: 'Error fetching support statistics' })
  }
})

module.exports = router
