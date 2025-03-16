const express = require("express");
const router = express.Router();
const Lead = require("../models/Lead");
const Deal = require("../models/Deals");

// ✅ Get Total Revenue from "Closed Won" deals
router.get("/revenue", async (req, res) => {
    try {
      const [dealsRevenue, leadsRevenue] = await Promise.all([
        Deal.aggregate([
          { $match: { stage: "Closed Won" } },
          { $group: { _id: null, total: { $sum: "$value" } } },
        ]),
  
        Lead.aggregate([
          { $match: { status: "Won" } }, // Ensure you track leads marked as "Won"
          { $group: { _id: null, total: { $sum: "$value" } } },
        ]),
      ]);
  
      const totalRevenue = (dealsRevenue[0]?.total || 0) + (leadsRevenue[0]?.total || 0);
  
      res.json({ totalRevenue });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch revenue data" });
    }
  });

// ✅ Get Lead to Deal Conversion Rate
router.get("/conversion-rate", async (req, res) => {
    try {
      const totalLeads = await Lead.countDocuments();
      const convertedLeads = await Lead.countDocuments({ status: "Won" }) + await Deal.countDocuments();
  
      const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;
  
      res.json({ totalLeads, convertedLeads, conversionRate });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch conversion rate" });
    }
  });

// ✅ Get Deal Stage Distribution
router.get("/deal-stages", async (req, res) => {
  try {
    const stageDistribution = await Deal.aggregate([
      { $group: { _id: "$stage", count: { $sum: 1 } } },
    ]);

    res.json(stageDistribution);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch deal stages" });
  }
});

// ✅ Get Sales Performance by User
router.get("/performance", async (req, res) => {
  try {
    const salesPerformance = await Deal.aggregate([
      { $match: { stage: "Closed Won" } },
      { $group: { _id: "$owner", totalSales: { $sum: "$value" }, count: { $sum: 1 } } },
    ]);

    res.json(salesPerformance);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch sales performance" });
  }
});

router.get("/lead-status", async (req, res) => {
    try {
      const leadStatusDistribution = await Lead.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]);
  
      res.json(leadStatusDistribution);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch lead status distribution" });
    }
  });

module.exports = router;
