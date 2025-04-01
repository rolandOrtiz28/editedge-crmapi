const express = require('express');
const router = express.Router();
const ClientTask = require('../../models/ClientTask');
const { isClientAuthenticated, isAdmin, isClient } = require('../../middleware/clientTrackerAuthMiddleware');
const isAuthenticated = require("../../middleware/authMiddleware");

// GET /api/client-tracker/tasks - Fetch all tasks (admin only)
router.get('/', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const tasks = await ClientTask.find().populate('clientId', 'name');
    res.json({ data: tasks });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/client-tracker/tasks/client/:clientId - Fetch tasks for a client (admin or client)
router.get('/client/:clientId', async (req, res, next) => {
  if (req.headers.authorization) {
    // Client authentication
    return isClientAuthenticated(req, res, () => isClient(req, res, async () => {
      try {
        const clientId = req.params.clientId;
        if (clientId !== req.client._id.toString()) {
          return res.status(403).json({ message: 'Forbidden: You can only access your own tasks' });
        }
        const tasks = await ClientTask.find({ clientId }).populate('clientId', 'name');
        res.json({ data: tasks });
      } catch (err) {
        res.status(500).json({ message: 'Server error' });
      }
    }));
  } else {
    // Admin authentication
    return isAuthenticated(req, res, () => isAdmin(req, res, async () => {
      try {
        const clientId = req.params.clientId;
        const tasks = await ClientTask.find({ clientId }).populate('clientId', 'name');
        res.json({ data: tasks });
      } catch (err) {
        res.status(500).json({ message: 'Server error' });
      }
    }));
  }
});

// POST /api/client-tracker/tasks - Add a new task (admin only)
router.post('/', isAuthenticated, isAdmin, async (req, res) => {
  try {
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
    await newTask.save();
    res.status(201).json({ data: newTask });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/client-tracker/tasks/:id - Update a task (admin only)
router.put('/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const updates = req.body;
    const task = await ClientTask.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json({ data: task });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;