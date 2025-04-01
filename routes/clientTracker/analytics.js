const express = require('express');
const router = express.Router();
const ClientTask = require('../../models/ClientTask');
const Client = require('../../models/Client');
const { isClientAuthenticated, isAdmin, isClient } = require('../../middleware/clientTrackerAuthMiddleware');
const isAuthenticated = require("../../middleware/authMiddleware");

// GET /api/client-tracker/analytics/:clientId - Fetch analytics for a client (admin or client)
router.get('/:clientId', async (req, res, next) => {
  if (req.headers.authorization) {
    // Client authentication
    return isClientAuthenticated(req, res, () => isClient(req, res, async () => {
      try {
        const clientId = req.params.clientId;
        if (clientId !== req.client._id.toString()) {
          return res.status(403).json({ message: 'Forbidden: You can only access your own analytics' });
        }
        const tasks = await ClientTask.find({ clientId });
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter((t) => t.status === 'completed').length;
        res.json({
          data: {
            totalTasks,
            completedTasks,
          },
        });
      } catch (err) {
        res.status(500).json({ message: 'Server error' });
      }
    }));
  } else {
    // Admin authentication
    return isAuthenticated(req, res, () => isAdmin(req, res, async () => {
      try {
        const clientId = req.params.clientId;
        const tasks = await ClientTask.find({ clientId });
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter((t) => t.status === 'completed').length;
        res.json({
          data: {
            totalTasks,
            completedTasks,
          },
        });
      } catch (err) {
        res.status(500).json({ message: 'Server error' });
      }
    }));
  }
});

// GET /api/client-tracker/analytics - Fetch general analytics (admin only)
router.get('/', isClientAuthenticated, isAdmin, async (req, res) => {
  try {
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

    res.json({
      data: {
        totalClients: clients.length,
        totalTasks: tasks.length,
        clientAcquisition,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;