const express = require('express');
const router = express.Router();
const { getRates } = require('../services/currencyService');
const { currencyLimiter } = require('../middleware/rateLimiter');

router.get('/rates', currencyLimiter, async (req, res, next) => {
  try {
    const rates = await getRates();
    res.json({
      success: true,
      base: 'AED',
      rates: {
        AED: rates.AED,
        SAR: rates.SAR,
        PKR: rates.PKR
      },
      source: rates.source,
      fetchedAt: rates.fetchedAt || new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
