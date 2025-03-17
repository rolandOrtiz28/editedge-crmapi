const express = require("express");
const axios = require("axios");
require("dotenv").config();

const router = express.Router();
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;  // Store your token in .env
const PAGE_ID = process.env.PAGE_ID;

if (!PAGE_ACCESS_TOKEN) {
    console.error("🚨 ERROR: PAGE_ACCESS_TOKEN is missing. Check your .env file.");
}

if (!PAGE_ID) {
    console.error("🚨 ERROR: PAGE_ID is missing. Check your .env file.");
}
// ✅ Fetch Instagram Conversations
router.get("/conversations", async (req, res) => {
    console.log("🔍 Using Access Token:", PAGE_ACCESS_TOKEN);

    try {
        const response = await axios.get(`https://graph.facebook.com/v22.0/${PAGE_ID}/conversations`, {
            params: {
                platform: "instagram",
                access_token: PAGE_ACCESS_TOKEN,
                fields: "participants,message_count,updated_time"
            }
        });

        res.json(response.data);
    } catch (error) {
        console.error("🚨 API ERROR:", error.response?.data || error.message);
        res.status(500).json({ error: error.response?.data || error.message });
    }
});

// ✅ Fetch Messages from a Specific Conversation
router.get("/messages/:conversationId", async (req, res) => {
    try {
        const { conversationId } = req.params;
        const response = await axios.get(`https://graph.facebook.com/v22.0/${conversationId}/messages`, {
            params: {
                access_token: PAGE_ACCESS_TOKEN,
                fields: "message,from,created_time,id"
            }
        });

        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.response?.data || error.message });
    }
});

// ✅ Send a Message to a User
router.post("/send", async (req, res) => {
    console.log("📩 Received POST request to /api/instagram/send:", req.body);
    try {
      const { recipientId, message } = req.body;
      if (!recipientId || !message) {
        return res.status(400).json({ error: "Recipient ID and message are required" });
      }
      console.log("📤 Sending to Graph API:", {
        recipientId,
        message,
        access_token: PAGE_ACCESS_TOKEN.slice(0, 10) + "...", // Masked for safety
      });
      const response = await axios.post(
        `https://graph.facebook.com/v22.0/me/messages`,
        {
          recipient: { id: recipientId },
          message: { text: message },
          messaging_type: "MESSAGE_TAG",
          tag: "human_agent",
        },
        { params: { access_token: PAGE_ACCESS_TOKEN } }
      );
      console.log("✅ Graph API response:", response.data);
      res.json(response.data);
    } catch (error) {
      console.error("🚨 API ERROR:", error.response?.data || error.message);
      res.status(500).json({ error: error.response?.data || error.message });
    }
  });

module.exports = router;
