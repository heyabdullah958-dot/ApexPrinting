const express = require('express');
const router = express.Router();
const path = require('path');
const { supabaseAdmin } = require('../services/supabase');

// Simple basic auth for admin dashboard
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'password123';

const basicAuth = (req, res, next) => {
  const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
  const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');

  if (login && password && login === ADMIN_USER && password === ADMIN_PASS) {
    return next();
  }
  res.set('WWW-Authenticate', 'Basic realm="401"');
  res.status(401).send('Authentication required.');
};

// Serve admin UI
router.get('/', basicAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../admin/index.html'));
});

// Admin API endpoints
router.get('/api/leads', basicAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('contact_submissions')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/api/quotes', basicAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('quote_requests')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
