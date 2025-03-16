const express = require("express");
const router = express.Router();
const User = require("../models/User"); // Ensure you have a User model with settings field

// ✅ Get user settings
router.get("/", async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("settings");
    res.json(user.settings);
  } catch (error) {
    res.status(500).json({ message: "Error fetching settings" });
  }
});

// ✅ Update user settings
router.put("/", async (req, res) => {
  try {
    const { notifications, theme } = req.body;
    await User.findByIdAndUpdate(req.user._id, { settings: { notifications, theme } });
    res.json({ message: "Settings updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error updating settings" });
  }
});

module.exports = router;
