const express = require('express');
const router = express.Router();
const ClientTask = require('../../models/ClientTask');
const Client = require('../../models/Client');
const { isClientAuthenticated, isAdmin, isClient } = require('../../middleware/clientTrackerAuthMiddleware');

// GET /api/client-tracker/analytics/:clientId - Fetch analytics for a client (admin or client)
router.get('/:clientId', isClientAuthenticated, async (req, res) => {
  try {
    console.log("🔍 Fetching analytics for client ID:", req.params.clientId);
    const clientId = req.params.clientId;
    const client = await Client.findById(clientId);
    if (!client) {
      console.log("❌ Client not found:", clientId);
      return res.status(404).json({ message: 'Client not found' });
    }

    // Allow access if the user is the client or an admin
    if (req.client) {
      if (clientId !== req.client._id.toString()) {
        console.log("❌ Client access denied: Can only access own analytics");
        return res.status(403).json({ message: 'Forbidden: You can only access your own analytics' });
      }
    } else if (!req.user || req.user.role !== 'admin') {
      console.log("❌ Admin access required:", req.user);
      return res.status(403).json({ message: 'Forbidden: Admin access only' });
    }

    const tasks = await ClientTask.find({ clientId });
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === 'completed').length;
    console.log("🔍 Analytics fetched:", { totalTasks, completedTasks });
    res.json({
      data: {
        totalTasks,
        completedTasks,
      },
    });
  } catch (err) {
    console.error("❌ Error fetching analytics for client:", err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/client-tracker/analytics - Fetch general analytics (admin only)
router.get('/', isClientAuthenticated, isAdmin, async (req, res) => {
  try {
    console.log("🔍 Fetching general analytics...");
    const clients = await Client.find();
    const tasks = await ClientTask.find();

    // Calculate client acquisition data
    const clientAcquisition = clients.reduce((acc, client) => {
      const month = new Date(client.createdAt).toLocaleString('en-US', { month: 'short' });
      const existing = acc.find((item) => item.month === month);
      if (existing) {
        existing.clients += 1;
      } else {
        acc.push({ month, clients: 1 });
      }
      return acc;
    }, []);

    console.log("🔍 General analytics fetched:", { totalClients: clients.length, totalTasks: tasks.length, clientAcquisition });
    res.json({
      data: {
        totalClients: clients.length,
        totalTasks: tasks.length,
        clientAcquisition,
      },
    });
  } catch (err) {
    console.error("❌ Error fetching general analytics:", err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;