const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Lead = require("../models/Lead");
const Contact = require("../models/Contact");
const Deal = require("../models/Deals");


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


module.exports = router;
