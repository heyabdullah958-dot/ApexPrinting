const express = require('express');
const router = express.Router();
const { supabase } = require('../services/supabase');
const { notifyOwnerNewContact, confirmCustomerContact } = require('../services/email');
const { validateContact, checkValidation } = require('../middleware/validate');
const { contactLimiter } = require('../middleware/rateLimiter');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

router.post('/', contactLimiter, upload.single('design_file'), validateContact, checkValidation, async (req, res, next) => {
  try {
    const { name, email, phone, country, service, paymentMethod } = req.body;
    let { message } = req.body;
    const ip_address = req.ip || req.connection.remoteAddress;

    if (paymentMethod) {
      message += `\n\n[Payment Method]: ${paymentMethod}`;
    }

    if (req.file) {
      message += `\n\n[Attached File]: ${req.file.originalname} (saved as ${req.file.filename})`;
    }

    // 1. Insert into Supabase
    const { error: dbError } = await supabase
      .from('contact_submissions')
      .insert([
        { name, email, phone, country, service, message, ip_address }
      ]);

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }

    // 2. Send Emails asynchronously
    const emailData = { name, email, phone, country, service, message, file: req.file };
    notifyOwnerNewContact(emailData).catch(console.error);
    confirmCustomerContact(emailData).catch(console.error);

    // 3. Return success
    res.json({
      success: true,
      message: "Thank you! We received your message and will be in touch soon."
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
