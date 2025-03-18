const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");

// Create a new notification
router.post("/", async (req, res) => {
  try {
    const { userId, type, message, relatedId } = req.body; // e.g., { userId: "user123", type: "task", message: "New task assigned", relatedId: "task456" }
    if (!userId || !type || !message) {
      return res.status(400).json({ message: "userId, type, and message are required" });
    }

    const newNotification = new Notification({
      userId,
      type,
      message,
      relatedId,
      read: false,
      createdAt: new Date(),
    });

    await newNotification.save();
    res.status(201).json({ message: "Notification created", notification: newNotification });
  } catch (error) {
    console.error("Error creating notification:", error);
    res.status(500).json({ message: "Error creating notification", error: error.message });
  }
});

// Get unread notifications for the user
router.get("/", async (req, res) => {
  try {
    const notifications = await Notification.find({
      userId: req.user._id,
      read: false,
    })
      .sort({ createdAt: -1 })
      .limit(10);
    res.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ message: "Error fetching notifications", error: error.message });
  }
});

// Mark a notification as read
router.put("/:id/read", async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    if (notification.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    notification.read = true;
    await notification.save();
    res.json({ message: "Notification marked as read" });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ message: "Error marking notification as read", error: error.message });
  }
});

module.exports = router;