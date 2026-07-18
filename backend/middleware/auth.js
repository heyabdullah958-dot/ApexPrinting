const basicAuth = require('express-basic-auth');

const adminAuth = basicAuth({
  users: { 'admin': process.env.ADMIN_PASSWORD || 'secret' },
  challenge: true,
  unauthorizedResponse: (req) => {
    return { error: 'Unauthorized access. Please provide valid admin credentials.' };
  }
});

module.exports = adminAuth;
