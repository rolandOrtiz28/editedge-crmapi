const express = require('express');
const router = express.Router();
const multer = require('multer');
const Client = require('../../models/Client');
const { isClientAuthenticated, isAdmin, isClient } = require('../../middleware/clientTrackerAuthMiddleware');
const { storage } = require('../../config/cloudinary');

const upload = multer({ storage });

router.post('/', isClientAuthenticated, isAdmin, upload.single('file'), async (req, res) => {
  try {
    const { clientId } = req.body;
    const client = await Client.findById(clientId);
    if (!client) return res.status(404).json({ message: 'Client not found' });

    const file = req.file;
    if (!file) return res.status(400).json({ message: 'No file uploaded' });

    client.files.push({
      name: file.originalname,
      uploadDate: new Date(),
      size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      url: file.path, // multer-storage-cloudinary gives you secure URL
    });

    await client.save();
    res.status(201).json({ data: client });
  } catch (err) {
    console.error("❌ Upload Error:", err);
    res.status(500).json({ message: 'Upload failed', error: err.message });
  }
});

// New download endpoint
router.get('/download/:fileId', isClient, async (req, res) => {
  try {
    const { fileId } = req.params;
    const client = await Client.findOne({ 'files._id': fileId });
    if (!client) return res.status(404).json({ message: 'File not found' });

    const file = client.files.find(f => f._id.toString() === fileId);
    if (!file) return res.status(404).json({ message: 'File not found' });

    const response = await fetch(file.url);
    if (!response.ok) {
      throw new Error(`Failed to fetch file from Cloudinary: ${response.status} ${response.statusText}`);
    }

    res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
    res.setHeader('Content-Type', response.headers.get('Content-Type') || 'application/octet-stream');
    response.body.pipe(res);
  } catch (err) {
    console.error('Download Error:', err);
    res.status(500).json({ message: 'Download failed', error: err.message });
  }
});

module.exports = router;