const express = require('express');
const router = express.Router();
const Client = require('../../models/Client');
const { isAdmin } = require('../../middleware/clientTrackerAuthMiddleware');
const isClientAuthenticated = require("../../middleware/authMiddleware");

// POST /api/client-tracker/interactions - Add a new interaction (admin only)
router.post('/', isClientAuthenticated, isAdmin, async (req, res) => {
  try {
    const { clientId, type, description } = req.body;
    const client = await Client.findById(clientId);
    if (!client) return res.status(404).json({ message: 'Client not found' });

    client.interactions.push({
      type,
      description,
      date: new Date(),
    });
    await client.save();
    res.status(201).json({ data: client });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;