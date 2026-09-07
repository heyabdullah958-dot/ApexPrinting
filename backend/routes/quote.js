const express = require('express');
const router = express.Router();
const { supabase } = require('../services/supabase');
const { notifyOwnerNewQuote, confirmCustomerQuote } = require('../services/email');
const { validateQuote, checkValidation } = require('../middleware/validate');
const { contactLimiter } = require('../middleware/rateLimiter');

router.post('/', contactLimiter, validateQuote, checkValidation, async (req, res, next) => {
  try {
    const body = req.body || {};
    const { 
      name, email, phone, country, service, 
      quantity, size, paper_type, finishing, sides, artwork_ready, notes 
    } = body;

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

    // 2. Dual-recipient email dispatch with timeout protection (ensures delivery before serverless freeze)
    let ownerEmailSent = false;
    let customerEmailSent = false;
    const emailTimeout = new Promise(resolve => setTimeout(() => resolve('email_timeout'), 6000));
    try {
      const emailRace = await Promise.race([
        Promise.allSettled([
          notifyOwnerNewQuote(quoteData),
          confirmCustomerQuote(quoteData)
        ]),
        emailTimeout
      ]);

      if (emailRace === 'email_timeout') {
        console.error('⏱️ Quote email dispatch timed out after 6000ms');
        return res.status(504).json({
          success: false,
          error: 'GATEWAY_TIMEOUT',
          message: 'Our email dispatch system timed out while confirming your quote request. Please email us directly at quotes@apexprinthub.com or try again.'
        });
      }

      if (Array.isArray(emailRace)) {
        ownerEmailSent = emailRace[0]?.status === 'fulfilled' && (emailRace[0].value === true || emailRace[0].value?.success === true);
        customerEmailSent = emailRace[1]?.status === 'fulfilled' && (emailRace[1].value === true || emailRace[1].value?.success === true);
      }
    } catch (emailErr) {
      console.error('❌ Quote email dispatch notification error:', emailErr.message);
    }

    // Crucial: Validate owner notification delivery to quotes@apexprinthub.com
    if (!ownerEmailSent) {
      const isMissingCreds = (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) && !process.env.SMTP_HOST && process.env.NODE_ENV !== 'test';
      const statusCode = isMissingCreds ? 503 : 500;
      const userMessage = isMissingCreds
        ? "Our email dispatch system is momentarily offline for configuration. Please email your quotation request directly to quotes@apexprinthub.com."
        : "We were unable to deliver your quote request notification email to our team. Please contact us directly at quotes@apexprinthub.com or try again shortly.";

      console.error('❌ Quote submission failed: Destination email delivery to quotes@apexprinthub.com could not be confirmed.');

      return res.status(statusCode).json({
        success: false,
        error: isMissingCreds ? 'EMAIL_CREDENTIALS_MISSING' : 'EMAIL_DELIVERY_FAILED',
        message: userMessage
      });
    }

    // 3. Return standardized API success contract
    return res.status(200).json({
      success: true,
      message: "Thank you! Your quote request has been received. Our team will contact you shortly with custom pricing and specifications.",
      customerEmailSent
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;


