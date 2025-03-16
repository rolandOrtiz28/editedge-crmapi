const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Task = require("../models/Task");
const Lead = require("../models/Lead");
const multer = require("multer");
const { storage } = require("../config/cloudinary"); // Import Cloudinary storage

// Multer setup with Cloudinary storage
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Get User Profile Data
router.get("/me", async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password -accessToken -refreshToken");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get Assigned Tasks
router.get("/tasks", async (req, res) => {
  try {
    const tasks = await Task.find({ assignedTo: req.user._id })
      .sort({ createdAt: -1 })
      .limit(10);
    res.json(tasks);
  } catch (error) {
    console.error("Error fetching assigned tasks:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get Assigned Leads
router.get("/leads", async (req, res) => {
  try {
    const leads = await Lead.find({ assignee: req.user._id.toString() })
      .sort({ createdAt: -1 })
      .limit(10);
    res.json(leads);
  } catch (error) {
    console.error("Error fetching assigned leads:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update User Profile (with Cloudinary picture upload)
router.put("/update-profile", upload.single("profilePicture"), async (req, res) => {
  try {
    const { name, email, company, role, timezone } = req.body;

    if (!name || !email || !role) {
      return res.status(400).json({ message: "Name, Email, and Role are required" });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Update fields
    user.name = name;
    user.email = email;
    user.company = company || user.company;
    user.role = role;
    user.timezone = timezone || user.timezone;

    // Handle profile picture upload via Cloudinary
    if (req.file) {
      user.profilePicture = req.file.path; // Cloudinary returns the URL in `path`
    }

    await user.save();

    res.json({ message: "Profile updated successfully", user });
  } catch (error) {
    console.error("Profile Update Error:", error);
    res.status(500).json({ message: "Error updating profile", error: error.message });
  }
});

module.exports = router;