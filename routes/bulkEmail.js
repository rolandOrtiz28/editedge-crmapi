require("dotenv").config();
const express = require("express");
const EmailStats = require("../models/EmailStats");
const Template = require("../models/Template");
const SibApiV3Sdk = require("sib-api-v3-sdk");
const Group = require("../models/Group");
const Lead = require("../models/Lead");
const Contact = require("../models/Contact");
const moment = require("moment");
const router = express.Router();


// Configure Brevo API client
const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
const apiKey = process.env.BREVO_API_KEY;
const client = SibApiV3Sdk.ApiClient.instance;
client.authentications["api-key"].apiKey = apiKey;

// Fetch Email Templates
router.get("/templates", async (req, res) => {
  try {
    const templates = await Template.find();
    res.status(200).json(templates);
  } catch (error) {
    console.error("Error fetching templates:", error);
    res.status(500).json({ error: "Failed to fetch templates" });
  }
});

router.post("/templates", async (req, res) => {
  try {
    const { name, subject, content } = req.body;
    if (!name || !subject || !content) {
      return res.status(400).json({ error: "All fields are required" });
    }
    const newTemplate = new Template({ name, subject, content });
    await newTemplate.save();
    res.status(201).json({ message: "Template created successfully!", template: newTemplate });
  } catch (error) {
    console.error("Error creating template:", error);
    res.status(500).json({ error: "Failed to create template" });
  }
});

// Send Bulk Emails
router.post("/send-bulk", async (req, res) => {
  try {
    const { recipients } = req.body;

    if (!recipients || recipients.length === 0) {
      return res.status(400).json({ error: "Missing recipients" });
    }

    const today = moment().format("YYYY-MM-DD");
    let emailStats = await EmailStats.findOne({ date: today });
    if (!emailStats) {
      emailStats = new EmailStats({ date: today, count: 0 });
    }

    if (emailStats.count + recipients.length > 300) {
      return res.status(429).json({
        error: `Daily email limit reached. You can send ${300 - emailStats.count} more emails today.`,
      });
    }

    const emailPromises = recipients.map(async (recipient) => {
      // Check if content contains HTML tags
      const isHTML = /<\/?[a-z][\s\S]*>/i.test(recipient.content);

      const emailData = {
        sender: { email: process.env.BREVO_SENDER_EMAIL, name: "EditEdge Multimedia" },
        to: [{ email: recipient.email, name: recipient.name }],
        subject: recipient.subject,
      };

      if (isHTML) {
        emailData.htmlContent = recipient.content; // Send as HTML
        emailData.headers = { 'Content-Type': 'text/html; charset=utf-8' };
      } else {
        emailData.textContent = recipient.content; // Send as plain text
      }

      console.log(`Sending email to ${recipient.email} as ${isHTML ? "HTML" : "Plain Text"}`);

      try {
        await apiInstance.sendTransacEmail(emailData);
      } catch (error) {
        console.error(`Failed to send email to ${recipient.email}:`, error.message || error);
      }
    });

    await Promise.all(emailPromises);

    emailStats.count += recipients.length;
    await emailStats.save();

    res.status(200).json({ message: "Bulk emails processed successfully!" });
  } catch (error) {
    console.error("Bulk email sending failed:", error);
    res.status(500).json({ error: "Failed to send bulk emails" });
  }
});


router.get("/groups", async (req, res) => {
  try {
    const groups = await Group.find();
    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch groups" });
  }
});

router.get("/groups/:id", async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    const populatedMembers = await Promise.all(
      group.members.map(async (member) => {
        const memberId = member.memberId;
        const memberType = member.type;

        let populatedMember;
        if (memberType === "lead") {
          populatedMember = await Lead.findById(memberId).select("name email company");
        } else if (memberType === "contact") {
          populatedMember = await Contact.findById(memberId).select("name email company");
        }

        return {
          memberId: populatedMember || { name: "Unnamed", email: "No Email" },
          type: memberType,
        };
      })
    );

    group.members = populatedMembers;
    res.json(group);
  } catch (error) {
    console.error("❌ Error fetching group members:", error);
    res.status(500).json({ error: "Failed to fetch group members" });
  }
});

module.exports = router;