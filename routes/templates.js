const express = require("express");
const router = express.Router();
const Template = require("../models/Template");
const multer = require("multer");


const upload = multer({ storage: multer.memoryStorage() }); // Store attachments in memory

// 📌 Get All Email Templates
router.get("/", async (req, res) => {
  try {
    const templates = await Template.find();
    res.json({ message: "Templates fetched successfully", templates });
  } catch (error) {
    console.error("Error fetching templates:", error);
    res.status(500).json({ error: "Failed to fetch templates" });
  }
});

// 📌 Create a New Template
router.post("/", upload.array("attachments"), async (req, res) => {
  try {
    const { subject, text, html } = req.body;
    if (!subject || (!text && !html)) {
      return res.status(400).json({ error: "Subject and HTML content are required" });
    }

    const attachments = req.files ? req.files.map(file => file.originalname) : [];

    const newTemplate = new Template({
      subject,
      text: text || "", // Store text content
      html: html || "", // Store HTML content
      attachments,
    });

    await newTemplate.save();
    res.status(201).json({ message: "Template saved successfully", template: newTemplate });
  } catch (error) {
    console.error("Error saving template:", error);
    res.status(500).json({ error: "Failed to save template" });
  }
});

// 📌 Delete a Template
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedTemplate = await Template.findByIdAndDelete(id);

    if (!deletedTemplate) {
      return res.status(404).json({ error: "Template not found" });
    }

    res.json({ message: "Template deleted successfully" });
  } catch (error) {
    console.error("Error deleting template:", error);
    res.status(500).json({ error: "Failed to delete template" });
  }
});

module.exports = router;
