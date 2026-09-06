const rateLimit = require('express-rate-limit');

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 requests per windowMs for testing and burst safety
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many requests from this IP, please try again after 15 minutes.',
      message: 'Too many requests from this IP, please try again after 15 minutes.'
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const currencyLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 requests per minute
  message: { success: false, message: 'Rate limit exceeded for currency API' },
});

module.exports = {
  contactLimiter,
  currencyLimiter
};
