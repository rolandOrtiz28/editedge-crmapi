const express = require('express');
const router = express.Router();
const Client = require('../../models/Client');
const { isClientAuthenticated, isAdmin, isClient } = require('../../middleware/clientTrackerAuthMiddleware');
const isAuthenticated = require("../../middleware/authMiddleware");

// GET /api/client-tracker/clients - Fetch all clients (admin only)
router.get('/', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const clients = await Client.find();
    res.json({ data: clients });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/client-tracker/clients/:id - Fetch a client by ID (admin or client)
router.get('/:id', async (req, res, next) => {
  // Determine which middleware to use based on the request
  if (req.headers.authorization) {
    // If a token is provided, assume client authentication
    return isClientAuthenticated(req, res, async () => {
      try {
        const client = await Client.findById(req.params.id);
        if (!client) return res.status(404).json({ message: 'Client not found' });
        // Ensure the client can only access their own data
        if (client._id.toString() !== req.client._id.toString()) {
          return res.status(403).json({ message: 'Forbidden: You can only access your own data' });
        }
        res.json({ data: client });
      } catch (err) {
        res.status(500).json({ message: 'Server error' });
      }
    });
  } else {
    // Otherwise, use admin authentication
    return isAuthenticated(req, res, () => isAdmin(req, res, async () => {
      try {
        const client = await Client.findById(req.params.id);
        if (!client) return res.status(404).json({ message: 'Client not found' });
        res.json({ data: client });
      } catch (err) {
        res.status(500).json({ message: 'Server error' });
      }
    }));
  }
});

// POST /api/client-tracker/clients - Add a new client (admin only)
router.post('/', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { name, email, password, industry, contact, phone, status, assignedTo } = req.body;
    const newClient = new Client({
      name,
      email,
      password, // Password will be hashed by the pre-save hook
      industry,
      contact,
      phone,
      status: status || 'Active',
      assignedTo,
    });
    await newClient.save();
    res.status(201).json({ data: newClient });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/client-tracker/clients/:id - Update a client (admin only)
router.put('/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const updates = req.body;
    const client = await Client.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!client) return res.status(404).json({ message: 'Client not found' });
    res.json({ data: client });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/client-tracker/clients/:id - Delete a client (admin only)
router.delete('/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const client = await Client.findByIdAndDelete(req.params.id);
    if (!client) return res.status(404).json({ message: 'Client not found' });
    res.json({ message: 'Client deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;