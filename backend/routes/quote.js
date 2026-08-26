const express = require('express');
const router = express.Router();
const { supabase } = require('../services/supabase');
const { notifyOwnerNewQuote, confirmCustomerQuote } = require('../services/email');
const { validateQuote, checkValidation } = require('../middleware/validate');
const { contactLimiter } = require('../middleware/rateLimiter');

router.post('/', contactLimiter, validateQuote, checkValidation, async (req, res, next) => {
  try {
    const { 
      name, email, phone, country, service, 
      quantity, size, paper_type, finishing, sides, artwork_ready, notes 
    } = req.body;

    const quoteData = {
      name, email, phone, country, service,
      quantity, size, paper_type, finishing, sides, artwork_ready, notes,
      status: 'pending'
    };

    // 1. Insert into Supabase (graceful logging if DB unavailable or placeholder keys)
    try {
      const { error: dbError } = await supabase
        .from('quote_requests')
        .insert([quoteData]);

      if (dbError) {
        console.warn('⚠️ Supabase database insert warning (quote):', dbError.message);
      }
    } catch (dbErr) {
      console.warn('⚠️ Supabase connection warning (quote):', dbErr.message);
    }

    // 2. Dual-recipient email dispatch asynchronously (non-blocking)
    Promise.allSettled([
      notifyOwnerNewQuote(quoteData),
      confirmCustomerQuote(quoteData)
    ]).catch(err => console.error('Email dispatch error in quote route:', err));

    // 3. Return standardized API success contract
    res.json({
      success: true,
      message: "Thank you! Your quote request has been received. Our team will contact you shortly with custom pricing and specifications."
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;


