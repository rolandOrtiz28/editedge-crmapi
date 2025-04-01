const express = require('express');
const router = express.Router();
const Client = require('../../models/Client');
const { isClientAuthenticated, isAdmin, isClient } = require('../../middleware/clientTrackerAuthMiddleware');

// GET /api/client-tracker/clients - Fetch all clients (admin only)
router.get('/', isClientAuthenticated, isAdmin, async (req, res) => {
  try {
    console.log("🔍 Fetching all clients...");
    const clients = await Client.find();
    console.log("🔍 Fetched clients:", clients);
    res.json({ data: clients });
  } catch (err) {
    console.error("❌ Error fetching all clients:", err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/client-tracker/clients/:id - Fetch a client by ID (admin or client)
router.get('/:id', isClientAuthenticated, async (req, res) => {
  try {
    console.log("🔍 Fetching client by ID:", req.params.id);
    const client = await Client.findById(req.params.id);
    if (!client) {
      console.log("❌ Client not found:", req.params.id);
      return res.status(404).json({ message: 'Client not found' });
    }

    // If the user is a client, ensure they can only access their own data
    if (req.client) {
      console.log("🔍 Client authenticated, checking access:", req.client._id);
      if (client._id.toString() !== req.client._id.toString()) {
        console.log("❌ Client access denied: Can only access own data");
        return res.status(403).json({ message: 'Forbidden: You can only access your own data' });
      }
    } else if (!req.user || req.user.role !== 'admin') {
      console.log("❌ Admin access required:", req.user);
      return res.status(403).json({ message: 'Forbidden: Admin access only' });
    }

    console.log("🔍 Client fetched successfully:", client);
    res.json({ data: client });
  } catch (err) {
    console.error("❌ Error fetching client by ID:", err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/client-tracker/clients - Add a new client (admin only)
router.post('/', isClientAuthenticated, isAdmin, async (req, res) => {
  try {
    console.log("🔍 Adding new client with data:", req.body);
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
    console.log("🔍 New client object before save:", newClient);
    await newClient.save();
    console.log("🔍 New client saved successfully:", newClient);
    res.status(201).json({ data: newClient });
  } catch (err) {
    console.error("❌ Error adding new client:", err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/client-tracker/clients/:id - Update a client (admin only)
router.put('/:id', isClientAuthenticated, isAdmin, async (req, res) => {
  try {
    console.log("🔍 Updating client ID:", req.params.id, "with updates:", req.body);
    const updates = req.body;
    const client = await Client.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!client) {
      console.log("❌ Client not found for update:", req.params.id);
      return res.status(404).json({ message: 'Client not found' });
    }
    console.log("🔍 Client updated successfully:", client);
    res.json({ data: client });
  } catch (err) {
    console.error("❌ Error updating client:", err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/client-tracker/clients/:id - Delete a client (admin only)
router.delete('/:id', isClientAuthenticated, isAdmin, async (req, res) => {
  try {
    console.log("🔍 Deleting client ID:", req.params.id);
    const client = await Client.findByIdAndDelete(req.params.id);
    if (!client) {
      console.log("❌ Client not found for deletion:", req.params.id);
      return res.status(404).json({ message: 'Client not found' });
    }
    console.log("🔍 Client deleted successfully:", client);
    res.json({ message: 'Client deleted successfully' });
  } catch (err) {
    console.error("❌ Error deleting client:", err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;