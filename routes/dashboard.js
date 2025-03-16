const express = require("express");
const router = express.Router();
const Lead = require("../models/Lead");
const Contact = require("../models/Contact");
const Deal = require("../models/Deals");
const Task = require("../models/Task");
const User = require("../models/User");
const { getGmailClient } = require("../utils/gmailClient");
const axios = require("axios");

const MESSENGER_ACCESS_TOKEN = process.env.MESSENGER_ACCESS_TOKEN;

// Total Leads
router.get("/leads/total", async (req, res) => {
  try {
    const totalLeads = await Lead.countDocuments();
    const newLeads = await Lead.countDocuments({ status: "New" });
    res.json({ totalLeads, newLeads });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch leads" });
  }
});

router.get("/me", async (req, res) => {
    try {
        console.log("Authenticated user:", req.user); // Debugging log
        if (!req.user) {
            return res.status(401).json({ error: "Unauthorized" }); // Return JSON, not HTML
        }

        const user = await User.findById(req.user._id).select("name");
        if (!user) {
            console.log("User not found for ID:", req.user._id);
            return res.status(404).json({ error: "User not found" });
        }

        console.log("Found user:", user);
        res.json({ name: user.name });
    } catch (error) {
        console.error("Error fetching current user:", error);
        res.status(500).json({ error: "Failed to fetch user" });
    }
});



// Total Contacts
router.get("/contacts/total", async (req, res) => {
  try {
    const totalContacts = await Contact.countDocuments();
    const activeContacts = await Contact.countDocuments({ status: "Active" });
    res.json({ totalContacts, activeContacts });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch contacts" });
  }
});

// Open Deals
router.get("/deals/open", async (req, res) => {
  try {
    const openDeals = await Deal.countDocuments({ stage: { $ne: "Closed Won" } });
    const totalRevenue = await Deal.aggregate([
      { $match: { stage: "Closed Won" } },
      { $group: { _id: null, total: { $sum: "$value" } } },
    ]);
    res.json({ openDeals, totalRevenue: totalRevenue[0]?.total || 0 });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch deals" });
  }
});

// Sales Pipeline
router.get("/deals/pipeline", async (req, res) => {
  try {
    const pipeline = await Deal.aggregate([
      { $group: { _id: "$stage", count: { $sum: 1 } } },
    ]);
    res.json(pipeline);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch pipeline" });
  }
});

// Recent Leads
router.get("/leads/recent", async (req, res) => {
  try {
    const recentLeads = await Lead.find()
      .sort({ _id: -1 })
      .limit(5)
      .select("name company email status");
    res.json(recentLeads);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch recent leads" });
  }
});

// Tasks Overview
router.get("/tasks/overview", async (req, res) => {
  try {
    const tasks = await Task.find()
      .sort({ createdAt: -1 }) // Sort by creation date, newest first
      .limit(3) // Limit to 3 latest tasks
      .select("_id title status createdAt"); // Include the title field

    // Format the response to include count if needed
    const formattedTasks = tasks.map(task => ({
      _id: task._id,
      title: task.title, // Add the title field
      status: task.status,
      createdAt: task.createdAt,
      count: 1 // Each task has a count of 1
    }));

    res.json(formattedTasks);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

// Emails (Using your existing Gmail logic)
router.get("/emails/recent", async (req, res) => {
  try {
    const gmail = await getGmailClient();
    const response = await gmail.users.messages.list({
      userId: "me",
      q: "in:inbox",
      maxResults: 5,
    });

    const messages = response.data.messages || [];
    const emailPromises = messages.map(async (msg) => {
      const message = await gmail.users.messages.get({
        userId: "me",
        id: msg.id,
        format: "full",
      });
      const headers = message.data.payload.headers;
      return {
        from: headers.find((h) => h.name === "From")?.value || "",
        subject: headers.find((h) => h.name === "Subject")?.value || "",
        date: headers.find((h) => h.name === "Date")?.value || "",
      };
    });

    const emails = await Promise.all(emailPromises);
    res.json(emails);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch emails" });
  }
});

// Messages (Using your Facebook API logic)
router.get("/messages/recent", async (req, res) => {
    try {
        console.log("Fetching messages from Messenger API...");
        
        const response = await axios.get(`https://graph.facebook.com/v19.0/me/conversations`, {
            params: {
                access_token: MESSENGER_ACCESS_TOKEN, // Ensure this is correct
                fields: "messages{message,from,created_time}",
                limit: 5,
            },
        });

        if (!response.data.data) {
            console.error("Messenger API returned empty data.");
            return res.status(500).json({ error: "Messenger API returned no messages." });
        }

        const messages = response.data.data.flatMap((conv) => conv.messages?.data || []);

        

        res.json(messages);
    } catch (error) {
        console.error("Error fetching messages:", error.response?.data || error.message);
        res.status(500).json({
            error: "Failed to fetch messages",
            details: error.response?.data || error.message,
        });
    }
});

// Analytics (Weekly Performance - Placeholder)
router.get("/analytics/performance", async (req, res) => {
    try {
      const today = new Date();
      const sixWeeksAgo = new Date();
      sixWeeksAgo.setDate(today.getDate() - 42); // Get data for the last 6 weeks
  
      const performanceData = await Deal.aggregate([
        {
          $match: {
            createdAt: { $gte: sixWeeksAgo }, // Filter only last 6 weeks
          },
        },
        {
          $group: {
            _id: { $week: "$createdAt" }, // Group by week number
            dealsValue: { $sum: "$value" },
            totalDeals: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      console.log("Performance API Data:", performanceData);
  
      const leadsData = await Lead.aggregate([
        {
          $match: {
            createdAt: { $gte: sixWeeksAgo },
          },
        },
        {
          $group: {
            _id: { $week: "$createdAt" },
            totalLeads: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);
  
      const contactsData = await Contact.aggregate([
        {
          $match: {
            createdAt: { $gte: sixWeeksAgo },
          },
        },
        {
          $group: {
            _id: { $week: "$createdAt" },
            totalContacts: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);
  
      // Combine all results into one dataset
      const weeklyPerformance = performanceData.map((dealWeek) => {
        const leadsWeek = leadsData.find((l) => l._id === dealWeek._id) || { totalLeads: 0 };
        const contactsWeek = contactsData.find((c) => c._id === dealWeek._id) || { totalContacts: 0 };
  
        return {
          week: `Week ${dealWeek._id}`,
          deals: dealWeek.totalDeals,
          revenue: dealWeek.dealsValue,
          leads: leadsWeek.totalLeads,
          contacts: contactsWeek.totalContacts,
        };
      });
  
      res.json(weeklyPerformance);
    } catch (error) {
      console.error("Error fetching performance:", error);
      res.status(500).json({ error: "Failed to fetch weekly performance" });
    }
  });
  
router.get("/stats/lastMonth", async (req, res) => {
    try {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  
      const lastMonthLeads = await Lead.countDocuments({ createdAt: { $lte: oneMonthAgo } });
      const lastMonthContacts = await Contact.countDocuments({ createdAt: { $lte: oneMonthAgo } });
      const lastMonthDeals = await Deal.countDocuments({ createdAt: { $lte: oneMonthAgo } });
  
      const totalRevenue = await Deal.aggregate([
        { $match: { createdAt: { $lte: oneMonthAgo }, stage: "Closed Won" } },
        { $group: { _id: null, total: { $sum: "$value" } } },
      ]);
  
      res.json({
        totalLeads: lastMonthLeads,
        totalContacts: lastMonthContacts,
        openDeals: lastMonthDeals,
        revenue: totalRevenue[0]?.total || 0,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch last month's stats" });
    }
  });
  

module.exports = router;