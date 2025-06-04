const validateRegisterInput = (data) => {
  const errors = {}
  const { email, password } = data

  // Email validation
  if (!email) {
    errors.email = 'Email field is required'
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      errors.email = 'Email is invalid'
    }
  }

  // Password validation
  if (!password) {
    errors.password = 'Password field is required'
  } else if (password.length < 6) {
    errors.password = 'Password must be at least 6 characters'
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0,
  }
}

const validateEmailInput = (email) => {
  const errors = {}

  if (!email) {
    errors.email = 'Email field is required'
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      errors.email = 'Email is invalid'
    }
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0,
  }
}

const validatePasswordReset = (data) => {
  const errors = {}
  const { password } = data

  if (!password) {
    errors.password = 'Password field is required'
  } else if (password.length < 6) {
    errors.password = 'Password must be at least 6 characters'
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0,
  }
}

module.exports = {
  validateRegisterInput,
  validateEmailInput,
  validatePasswordReset,
} 