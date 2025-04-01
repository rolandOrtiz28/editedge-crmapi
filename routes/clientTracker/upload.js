const express = require('express');
const router = express.Router();
const multer = require('multer');
const Client = require('../../models/Client');
const { isClientAuthenticated, isAdmin } = require('../../middleware/clientTrackerAuthMiddleware');
const { cloudinary } = require('../../config/cloudinary');

// Use memory storage to get access to file buffer
const storage = multer.memoryStorage();
const upload = multer({ storage });

// POST /api/client-tracker/upload - Upload a file for a client (admin only)
router.post('/', isClientAuthenticated, isAdmin, upload.single('file'), async (req, res) => {
  try {
    const { clientId } = req.body;
    const client = await Client.findById(clientId);
    if (!client) return res.status(404).json({ message: 'Client not found' });

    const file = req.file;
    if (!file) return res.status(400).json({ message: 'No file uploaded' });

    // Convert to base64 string for Cloudinary upload
    const base64Data = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

    // Upload to Cloudinary with correct resource type
    const result = await cloudinary.uploader.upload(base64Data, {
      folder: 'EditEdgeCRM',
      resource_type: 'auto', // automatically detects file type
      public_id: file.originalname.split('.')[0],
    });

    // Save file reference to client
    client.files.push({
      name: file.originalname,
      uploadDate: new Date(),
      size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      url: result.secure_url, // Cloudinary hosted URL
    });

    await client.save();
    res.status(201).json({ data: client });
  } catch (err) {
    console.error("❌ File Upload Error:", err);
    res.status(500).json({ message: 'File upload error', error: err.message });
  }
});

module.exports = router;
