const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');

const isServerlessOrProd = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NODE_ENV === 'production';

// Ensure upload directory exists (fallback to /tmp in serverless/Vercel)
const uploadDir = isServerlessOrProd 
  ? path.join(os.tmpdir(), 'uploads', 'designs') 
  : path.join(__dirname, '../uploads/designs');

try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (err) {
  console.warn('⚠️ Could not create uploadDir:', err.message);
}

// Configure multer storage (memoryStorage in serverless/prod, diskStorage in local dev)
const storage = isServerlessOrProd 
  ? multer.memoryStorage() 
  : multer.diskStorage({
      destination: function (req, file, cb) {
        cb(null, uploadDir);
      },
      filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '');
        cb(null, uniqueSuffix + '-' + safeName);
      }
    });

const upload = multer({
  storage: storage,
  limits: { fileSize: 4.5 * 1024 * 1024 } // 4.5MB limit
});

// Middleware wrapper for multer error handling
const handleUpload = (req, res, next) => {
  upload.single('design_file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
          success: false, 
          error: 'File size exceeds 4.5MB limit.', 
          message: 'File size exceeds 4.5MB limit.' 
        });
      }
      return res.status(400).json({ 
        success: false, 
        error: err.message || 'Upload error', 
        message: err.message || 'Upload error' 
      });
    }
    next();
  });
};

router.post('/', handleUpload, (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded', message: 'No file uploaded' });
    }

    const filePath = req.file.filename ? `/uploads/designs/${req.file.filename}` : `memory://${req.file.originalname}`;
    
    res.json({
      success: true,
      filePath: filePath,
      fileName: req.file.originalname
    });
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ success: false, error: 'Server error during upload', message: 'Server error during upload' });
  }
});

module.exports = router;
