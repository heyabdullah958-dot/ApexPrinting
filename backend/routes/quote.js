const express = require('express');
const router = express.Router();
const { supabase } = require('../services/supabase');
const { notifyOwnerNewQuote, confirmCustomerQuote } = require('../services/email');
const { validateQuote, checkValidation } = require('../middleware/validate');
const { contactLimiter } = require('../middleware/rateLimiter');
const { getRates } = require('../services/currencyService');

router.post('/', contactLimiter, validateQuote, checkValidation, async (req, res, next) => {
  try {
    const { 
      name, email, phone, country, service, 
      quantity, size, paper_type, finishing, sides, artwork_ready, notes 
    } = req.body;

    // 1. Get display currency based on country
    const displayCurrency = country === 'PKR' ? 'PKR' : (country === 'SAR' ? 'SAR' : 'AED');

    // 2. Insert into Supabase (No pricing estimate for now)
    const quoteData = {
      name, email, phone, country, service,
      quantity, size, paper_type, finishing, sides, artwork_ready, notes,
      base_currency: 'AED',
      display_currency: displayCurrency,
      status: 'pending'
    };

    const { error: dbError } = await supabase
      .from('quote_requests')
      .insert([quoteData]);

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }

    // 3. Send Emails asynchronously
    notifyOwnerNewQuote(quoteData).catch(console.error);
    confirmCustomerQuote(quoteData).catch(console.error);

    // 4. Return success
    res.json({
      success: true,
      message: "Quote received! Our team will contact you shortly with the pricing details."
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;

