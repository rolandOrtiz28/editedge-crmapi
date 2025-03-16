const express = require("express");
const router = express.Router();
const Task = require("../models/Task");
const Notification = require("../models/Notification");


// 🟢 GET all tasks (with populated references)
router.get("/", async (req, res) => {
  try {
    const tasks = await Task.find().populate("relatedTo").populate("assignedTo");
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

// 🟢 CREATE a new task
router.post("/", async (req, res) => {
  try {
    const { title, description, dueDate, priority, relatedTo, relatedModel, assignedTo } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    // Ensure `dueDate` is a valid date or null
    const parsedDueDate = dueDate ? new Date(dueDate) : null;
    if (dueDate && isNaN(parsedDueDate)) {
      return res.status(400).json({ error: "Invalid due date format" });
    }

    // Ensure relatedTo is only set when relatedModel exists
    if (!relatedModel && relatedTo) {
      return res.status(400).json({ error: "relatedModel is required if relatedTo is set" });
    }

    const newTask = new Task({
      title,
      description,
      dueDate: parsedDueDate,
      priority,
      relatedTo: relatedTo || null,
      relatedModel: relatedModel || null,
      assignedTo: assignedTo || null,
    });

    const savedTask = await newTask.save();
    res.status(201).json(savedTask);
  } catch (error) {
    console.error("Task creation error:", error.message); // ✅ Log error details
    res.status(500).json({ error: error.message });
  }
});

  

// 🟢 UPDATE a task
router.put("/:id", async (req, res) => {
  try {
    const { assignedTo } = req.body;

    const updatedTask = await Task.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate("assignedTo", "name");

    if (!updatedTask) {
      return res.status(404).json({ error: "Task not found" });
    }

    if (assignedTo) {
      const assigner = await User.findById(req.user._id).select("name");

      await Notification.create({
        userId: assignedTo,
        type: "task",
        itemId: updatedTask._id,
        message: `${assigner.name} assigned you a new task.`,
      });
    }

    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({ error: "Failed to update task" });
  }
});


// 🟢 DELETE a task
router.delete("/:id", async (req, res) => {
  try {
    const deletedTask = await Task.findByIdAndDelete(req.params.id);
    if (!deletedTask) return res.status(404).json({ error: "Task not found" });

    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete task" });
  }
});

module.exports = router;
