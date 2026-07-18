const { body, validationResult } = require('express-validator');

const validateContact = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('phone').optional().trim(),
  body('country').optional().trim().isIn(['UAE', 'SAR', 'PKR', 'Other']).withMessage('Invalid country'),
  body('service').trim().notEmpty().withMessage('Service is required'),
  body('message').trim().isLength({ min: 10, max: 2000 }).withMessage('Message must be between 10 and 2000 characters'),
  body('paymentMethod').optional().trim().isIn(['COD', '']).withMessage('Invalid payment method')
];

const validateQuote = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('phone').optional().trim(),
  body('country').optional().trim().isIn(['UAE', 'SAR', 'PKR', 'Other']).withMessage('Invalid country'),
  body('service').trim().notEmpty().withMessage('Service is required'),
  body('quantity').optional().isInt({ min: 1 }).toInt().withMessage('Quantity must be a positive number'),
  body('size').optional().trim(),
  body('paper_type').optional().trim(),
  body('finishing').optional().trim(),
  body('sides').optional().trim(),
  body('artwork_ready').optional().isBoolean().toBoolean(),
  body('notes').optional().trim().isLength({ max: 2000 }),
];

const checkValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      message: 'Validation failed', 
      errors: errors.array() 
    });
  }
  next();
};

module.exports = {
  validateContact,
  validateQuote,
  checkValidation
};
