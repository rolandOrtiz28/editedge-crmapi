const express = require('express');
const router = express.Router();
const ClientTask = require('../../models/ClientTask');
const Client = require('../../models/Client');
const { isClientAuthenticated, isAdmin, isClient } = require('../../middleware/clientTrackerAuthMiddleware');
const isAuthenticated = require("../../middleware/authMiddleware");

// GET /api/client-tracker/tasks - Fetch all tasks (admin only)
router.get('/', isClientAuthenticated, isAdmin, async (req, res) => {
  try {
    const tasks = await ClientTask.find().populate('clientId', 'name');
    res.json({ data: tasks });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});


// GET /api/client-tracker/tasks/client/:clientId - Fetch tasks for a specific client (admin or client)
router.get('/client/:clientId', isClientAuthenticated, async (req, res) => {
  try {
    console.log("🔍 Fetching tasks for client ID:", req.params.clientId);
    const client = await Client.findById(req.params.clientId);
    if (!client) {
      console.log("❌ Client not found:", req.params.clientId);
      return res.status(404).json({ message: 'Client not found' });
    }

    // Allow access if the user is the client or an admin
    if (req.client) {
      if (client._id.toString() !== req.client._id.toString()) {
        console.log("❌ Client access denied: Can only access own tasks");
        return res.status(403).json({ message: 'Forbidden: You can only access your own tasks' });
      }
    } else if (!req.user || req.user.role !== 'admin') {
      console.log("❌ Admin access required:", req.user);
      return res.status(403).json({ message: 'Forbidden: Admin access only' });
    }

    const tasks = await ClientTask.find({ clientId: req.params.clientId }).populate('clientId', 'name');
    console.log("🔍 Fetched tasks:", tasks);
    res.json({ data: tasks });
  } catch (err) {
    console.error("❌ Error fetching tasks for client:", err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/client-tracker/tasks - Add a new task (admin only)
router.post('/', isClientAuthenticated, isAdmin, async (req, res) => {
  try {
    console.log("🔍 Adding new task with data:", req.body);
    const { title, description, status, priority, dueDate, clientId, assignedTo } = req.body;
    const newTask = new ClientTask({
      title,
      description,
      status: status || 'pending',
      priority: priority || 'Medium',
      dueDate,
      clientId,
      assignedTo,
    });
    console.log("🔍 New task before save:", newTask);
    await newTask.save();
    console.log("🔍 New task saved:", newTask);
    res.status(201).json({ data: newTask });
  } catch (err) {
    console.error("❌ Error adding new task:", err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/client-tracker/tasks/:id - Update a task (admin only)
router.put('/:id', isClientAuthenticated, isAdmin, async (req, res) => {
  try {
    console.log("🔍 Updating task ID:", req.params.id, "with updates:", req.body);
    const updates = req.body;
    const task = await ClientTask.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!task) {
      console.log("❌ Task not found:", req.params.id);
      return res.status(404).json({ message: 'Task not found' });
    }
    console.log("🔍 Task updated:", task);
    res.json({ data: task });
  } catch (err) {
    console.error("❌ Error updating task:", err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;