const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Lead = require("../models/Lead");
const Contact = require("../models/Contact");
const Deal = require("../models/Deals");
const Task = require("../models/Task");

// ✅ GET all users
router.get("/users", async (req, res) => {
  try {
    const users = await User.find({}, "name _id");
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// ✅ GET all leads
router.get("/leads", async (req, res) => {
  try {
    const leads = await Lead.find({}, "name _id");
    res.json(leads);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch leads" });
  }
});

// ✅ GET all contacts
router.get("/contacts", async (req, res) => {
  try {
    const contacts = await Contact.find({}, "name _id");
    res.json(contacts);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch contacts" });
  }
});

// ✅ GET all deals
router.get("/deals", async (req, res) => {
  try {
    const deals = await Deal.find({}, "name _id");
    res.json(deals);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch deals" });
  }
});

router.get("/subscribers", async (req, res) => {
  try {
    const leads = await Lead.find({}, "name email").lean(); // Convert to plain objects
    const contacts = await Contact.find({}, "name email").lean();

    // ✅ Add "source" identifier
    const formattedLeads = leads.map((lead) => ({ ...lead, source: "lead" }));
    const formattedContacts = contacts.map((contact) => ({ ...contact, source: "contact" }));

    res.json({ subscribers: [...formattedLeads, ...formattedContacts] });
  } catch (error) {
    console.error("❌ Error fetching subscribers:", error);
    res.status(500).json({ error: "Failed to fetch subscribers" });
  }
});



router.get("/search", async (req, res) => {
  const { q } = req.query; // Query parameter 'q' from the search input
  if (!q || q.trim().length < 2) {
    return res.status(400).json({ message: "Search query must be at least 2 characters" });
  }

  try {
    const searchRegex = new RegExp(q, "i"); // Case-insensitive regex

    // Search across all collections
    const [leads, tasks, contacts, deals] = await Promise.all([
      Lead.find({
        $or: [
          { name: searchRegex },
          { company: searchRegex },
          { email: searchRegex },
        ],
      }).limit(5).lean(),
      Task.find({
        $or: [
          { title: searchRegex },
          { description: searchRegex },
        ],
      }).limit(5).lean(),
      Contact.find({
        $or: [
          { name: searchRegex },
          { company: searchRegex },
          { email: searchRegex },
        ],
      }).limit(5).lean(),
      Deal.find({
        $or: [
          { name: searchRegex },
          { description: searchRegex },
        ],
      }).limit(5).lean(),
    ]);

    // Format results with type
    const results = [
      ...leads.map((lead) => ({ ...lead, type: "lead" })),
      ...tasks.map((task) => ({ ...task, type: "task" })),
      ...contacts.map((contact) => ({ ...contact, type: "contact" })),
      ...deals.map((deal) => ({ ...deal, type: "deal" })),
    ];

    // Optionally sort or filter further (e.g., by relevance or date)
    res.json(results.slice(0, 20)); // Limit total results to 20
  } catch (error) {
    console.error("❌ Error in global search:", error);
    res.status(500).json({ message: "Search failed", error });
  }
});

module.exports = router;
