const express = require('express');
const router = express.Router();
const { supabase } = require('../services/supabase');
const { notifyOwnerNewContact, confirmCustomerContact, resolveOwnerEmail } = require('../services/email');
const { validateContact, checkValidation } = require('../middleware/validate');
const { contactLimiter } = require('../middleware/rateLimiter');
const multer = require('multer');

// Supported artwork file extensions for print production
const ALLOWED_ARTWORK_EXTENSIONS = /\.(jpe?g|png|gif|webp|svg|pdf|ai|psd|eps|tiff?|zip)$/i;

// Configure multer with memory storage (safe for Vercel/serverless read-only filesystem)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 4.5 * 1024 * 1024, // 4.5MB maximum payload limit for serverless body safety
    files: 10
  },
  fileFilter: (req, file, cb) => {
    if (!file.originalname || !file.originalname.match(ALLOWED_ARTWORK_EXTENSIONS)) {
      const err = new Error('Unsupported file format. Please upload an image (JPG, PNG, WEBP, SVG), PDF, AI, PSD, EPS, or ZIP file.');
      err.code = 'INVALID_FILE_TYPE';
      return cb(err);
    }
    cb(null, true);
  }
});

// Middleware to safely handle multer parsing and size boundary violations without unhandled 500s
const handleUpload = (req, res, next) => {
  try {
    upload.any()(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            error: 'Attached artwork file exceeds the 4.5MB limit. Please compress or select a smaller file.',
            message: 'Attached artwork file exceeds the 4.5MB limit. Please compress or select a smaller file.'
          });
        }
        if (err.code === 'INVALID_FILE_TYPE') {
          return res.status(400).json({
            success: false,
            error: err.message,
            message: err.message
          });
        }
        return res.status(400).json({
          success: false,
          error: err.message || 'File upload error',
          message: err.message || 'File upload error'
        });
      }
      next();
    });
  } catch (syncErr) {
    return res.status(400).json({
      success: false,
      error: syncErr.message || 'Malformed upload payload',
      message: syncErr.message || 'Malformed upload payload'
    });
  }
};

// Health check / GET handler for monitoring and uptime probes
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'contact_order_api',
    status: 'operational',
    timestamp: new Date().toISOString()
  });
});

router.post('/', contactLimiter, handleUpload, validateContact, checkValidation, async (req, res, next) => {
  try {
    const body = req.body || {};
    const { name, email, phone, country, service } = body;
    let message = typeof body.message === 'string' ? body.message.trim() : '';
    const ip_address = req.ip || req.connection?.remoteAddress || 'unknown';

    // Collect all uploaded files (cart items + optional contact form file)
    const files = req.files || (req.file ? [req.file] : []);

    if (files.length > 0) {
      const fileSummary = `\n\n[Attached Artwork & Files (${files.length})]:\n` + 
        files.map((f, idx) => `  ${idx + 1}. ${f.originalname} (${(f.size / 1024).toFixed(0)} KB)`).join('\n');
      message = message ? `${message}${fileSummary}` : fileSummary.trim();
    }

    // Parse optional cart data if submitted
    let cartData = null;
    if (body.cart_data) {
      try {
        cartData = typeof body.cart_data === 'string' ? JSON.parse(body.cart_data) : body.cart_data;
      } catch (parseErr) {
        console.warn('⚠️ Could not parse cart_data payload:', parseErr.message);
      }
    }

    // Extract cloud-hosted artwork links from cart_data
    if (cartData && Array.isArray(cartData)) {
      const cloudItems = cartData.filter(it => it && it.design && it.design.url && (it.design.url.startsWith('http://') || it.design.url.startsWith('https://')));
      if (cloudItems.length > 0) {
        const cloudArtworkSummary = cloudItems.map((it, idx) => {
          const title = it.title || 'Product';
          const filename = it.design.name || 'artwork';
          const sizeMB = typeof it.design.size === 'number' ? (it.design.size / (1024 * 1024)).toFixed(2) : '0.00';
          return `  ${idx + 1}. ${title}: ${filename} (${sizeMB} MB) — ${it.design.url}`;
        }).join('\n');

        const cloudSection = `\n\n[Cloud-Hosted Print Artwork (${cloudItems.length})]:\n${cloudArtworkSummary}`;
        message = message ? `${message}${cloudSection}` : cloudSection.trim();
      }
    }

    // 1. Insert into Supabase (graceful logging if DB unavailable or placeholder keys)
    try {
      const { error: dbError } = await supabase
        .from('contact_submissions')
        .insert([
          { name, email, phone, country, service, message, ip_address }
        ]);

      if (dbError) {
        console.warn('⚠️ Supabase database insert warning (contact):', dbError.message);
      }
    } catch (dbErr) {
      console.warn('⚠️ Supabase connection warning (contact):', dbErr.message);
    }

    // 2. Dual-recipient email dispatch with timeout protection (ensures delivery before serverless freeze)
    const emailData = { 
      name, 
      email, 
      phone, 
      country, 
      service, 
      message, 
      files, 
      file: files[0] || null, // backward compatibility
      cartData 
    };

    // Await email dispatch with a 6-second race timeout so serverless runtime does not freeze before sending,
    // while guaranteeing the request finishes well within Vercel's 10s execution window.
    let ownerEmailSent = false;
    let customerEmailSent = false;
    const emailTimeout = new Promise(resolve => setTimeout(() => resolve('email_timeout'), 6000));
    try {
      const emailRace = await Promise.race([
        Promise.allSettled([
          notifyOwnerNewContact(emailData),
          confirmCustomerContact(emailData)
        ]),
        emailTimeout
      ]);

      if (emailRace === 'email_timeout') {
        console.error('⏱️ Contact order email dispatch timed out after 6000ms');
        return res.status(504).json({
          success: false,
          error: 'GATEWAY_TIMEOUT',
          message: 'Our email dispatch system timed out while confirming your order request. Please email us directly at quotes@apexprinthub.com or try again.'
        });
      }

      if (Array.isArray(emailRace)) {
        if (emailRace[0]?.status === 'rejected') {
          console.error('❌ Owner notification promise rejected:', emailRace[0].reason);
        }
        if (emailRace[1]?.status === 'rejected') {
          console.error('❌ Customer confirmation promise rejected:', emailRace[1].reason);
        }
        ownerEmailSent = emailRace[0]?.status === 'fulfilled' && (emailRace[0].value === true || emailRace[0].value?.success === true);
        customerEmailSent = emailRace[1]?.status === 'fulfilled' && (emailRace[1].value === true || emailRace[1].value?.success === true);
      }
      console.log(`📊 Contact submission email dispatch: Owner Alert (${resolveOwnerEmail()}): ${ownerEmailSent ? 'ACCEPTED' : 'FAILED'}, Customer Confirmation (${email}): ${customerEmailSent ? 'ACCEPTED' : 'FAILED'}`);
    } catch (emailErr) {
      console.error('❌ Email dispatch notification error:', emailErr.message);
    }

    // Crucial: Validate owner notification delivery
    if (!ownerEmailSent) {
      const isMissingCreds = (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) && !process.env.SMTP_HOST && process.env.NODE_ENV !== 'test';
      const statusCode = isMissingCreds ? 503 : 500;
      const userMessage = isMissingCreds
        ? `Our email dispatch system is momentarily offline for configuration. Please email your order request directly to ${resolveOwnerEmail()}.`
        : `We were unable to deliver your order request notification email to our team. Please contact us directly at ${resolveOwnerEmail()} or try again shortly.`;

      console.error(`❌ Contact order submission failed: Destination email delivery to ${resolveOwnerEmail()} could not be confirmed.`);

      return res.status(statusCode).json({
        success: false,
        error: isMissingCreds ? 'EMAIL_CREDENTIALS_MISSING' : 'EMAIL_DELIVERY_FAILED',
        message: userMessage
      });
    }

    if (!customerEmailSent) {
      console.warn(`⚠️ Warning: Order alert was delivered to ${resolveOwnerEmail()}, but customer confirmation email to "${email}" failed or was rejected.`);
    }

    // 3. Return standardized API success contract
    return res.status(200).json({
      success: true,
      message: customerEmailSent
        ? "Thank you! Your order request has been received and a confirmation email has been sent. Our team will contact you within 24 business hours."
        : "Thank you! Your order request has been received by our production team. Our team will contact you within 24 business hours.",
      customerEmailSent
    });

  } catch (error) {
    console.error('Error handling contact submission:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error occurred while processing your order request.',
      message: error.message || 'Internal server error occurred while processing your order request.'
    });
  }
});

module.exports = router;
