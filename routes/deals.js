const express = require("express");
const router = express.Router();
const Deal = require("../models/Deals"); // ✅ Fix: Import the Deal model
const multer = require("multer");
const Papa = require("papaparse");


// Get all deals
router.get("/", async (req, res) => {
  try {
    const deals = await Deal.find();
    res.json(deals);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch deals" });
  }
});

// Create a new deal
router.post("/", async (req, res) => {
  try {
    const { name, company, stage, value, probability, expectedCloseDate } = req.body;

    // 🔍 Check for missing fields
    if (!name || !company || !stage || !value || !probability || !expectedCloseDate) {
      return res.status(400).json({ error: "All fields are required!" });
    }

    const newDeal = new Deal({ name, company, stage, value, probability, expectedCloseDate });
    const savedDeal = await newDeal.save();
    res.json(savedDeal);
  } catch (error) {
    console.error("Error creating deal:", error);
    res.status(500).json({ error: "Failed to create deal" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { stage } = req.body; // ✅ Extract only stage
    if (!stage) {
      return res.status(400).json({ error: "Stage is required!" }); // 🚨 Prevent missing data
    }

    const updatedDeal = await Deal.findByIdAndUpdate(
      req.params.id,
      { stage }, // ✅ Only update the stage
      { new: true, runValidators: true }
    );

    if (!updatedDeal) {
      return res.status(404).json({ error: "Deal not found!" }); // 🚨 Handle invalid IDs
    }

    res.json(updatedDeal);
  } catch (error) {
    console.error("Error updating stage:", error);
    res.status(500).json({ error: "Failed to update stage" });
  }
});


// ✅ Delete a deal
router.delete("/:id", async (req, res) => {
  try {
    const deletedDeal = await Deal.findByIdAndDelete(req.params.id);
    if (!deletedDeal) return res.status(404).json({ error: "Deal not found!" });

    res.json({ message: "Deal deleted successfully" });
  } catch (error) {
    console.error("Error deleting deal:", error);
    res.status(500).json({ error: "Failed to delete deal" });
  }
});

module.exports = router;
