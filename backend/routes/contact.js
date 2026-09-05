const express = require('express');
const router = express.Router();
const { supabase } = require('../services/supabase');
const { notifyOwnerNewContact, confirmCustomerContact } = require('../services/email');
const { validateContact, checkValidation } = require('../middleware/validate');
const { contactLimiter } = require('../middleware/rateLimiter');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

router.post('/', contactLimiter, upload.any(), validateContact, checkValidation, async (req, res, next) => {
  try {
    const { name, email, phone, country, service } = req.body;
    let { message } = req.body;
    const ip_address = req.ip || req.connection.remoteAddress;

    // Collect all uploaded files (cart items + optional contact form file)
    const files = req.files || (req.file ? [req.file] : []);

    if (files.length > 0) {
      message += `\n\n[Attached Artwork & Files (${files.length})]:\n` + 
        files.map((f, idx) => `  ${idx + 1}. ${f.originalname} (${(f.size / 1024).toFixed(0)} KB)`).join('\n');
    }

    // Parse optional cart data if submitted
    let cartData = null;
    if (req.body.cart_data) {
      try {
        cartData = typeof req.body.cart_data === 'string' ? JSON.parse(req.body.cart_data) : req.body.cart_data;
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

        message += `\n\n[Cloud-Hosted Print Artwork (${cloudItems.length})]:\n${cloudArtworkSummary}`;
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

    // 2. Dual-recipient email dispatch asynchronously (non-blocking)
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

    Promise.allSettled([
      notifyOwnerNewContact(emailData),
      confirmCustomerContact(emailData)
    ]).catch(err => console.error('Email dispatch error in contact route:', err));

    // 3. Return standardized API success contract
    res.json({
      success: true,
      message: "Thank you! Your order request has been received. Our team will contact you within 24 business hours."
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;

