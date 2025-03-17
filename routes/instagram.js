const express = require("express");
const axios = require("axios");
const http = require("http");
const socketIo = require("socket.io");
require("dotenv").config();
const { refreshInstagramToken } = require("./InstagramAuth");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.json());
const router = express.Router();
const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
const PAGE_ID = process.env.PAGE_ID;
const WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN;

// Log environment variables to confirm they’re loaded
console.log("INSTAGRAM_ACCESS_TOKEN:", INSTAGRAM_ACCESS_TOKEN ? "Loaded" : "Not loaded");
console.log("PAGE_ID:", PAGE_ID ? "Loaded" : "Not loaded");
console.log("WEBHOOK_VERIFY_TOKEN:", WEBHOOK_VERIFY_TOKEN ? "Loaded" : "Not loaded");

refreshInstagramToken();

// ✅ Fetch Instagram Conversations
router.get("/conversations", async (req, res) => {
  console.log("🔍 Using Access Token:", INSTAGRAM_ACCESS_TOKEN.slice(0, 10) + "...");

  try {
    const response = await axios.get(`https://graph.facebook.com/v22.0/${PAGE_ID}/conversations`, {
      params: {
        platform: "instagram",
        access_token: INSTAGRAM_ACCESS_TOKEN,
        fields: "participants{id,username},message_count,updated_time",
      },
    });

    console.log("✅ Fetched Conversations:", JSON.stringify(response.data, null, 2));

    const updatedConversations = response.data.data.map((conv) => {
      const participants = conv.participants?.data || [];
      const updatedParticipants = participants.length > 0 ? participants : [{ id: "unknown", username: "Unknown" }];
      return {
        ...conv,
        participants: {
          data: updatedParticipants.map((participant) => ({
            id: participant.id || "unknown",
            name: participant.username || "Unknown",
            profile_pic: participant.profile_pic || null,
          })),
        },
      };
    });

    res.json({ data: updatedConversations });
  } catch (error) {
    console.error("🚨 API ERROR:", error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data?.error?.message || error.message });
  }
});

// ✅ Fetch Messages from a Specific Conversation
router.get("/messages/:conversationId", async (req, res) => {
  try {
    const { conversationId } = req.params;
    const response = await axios.get(`https://graph.facebook.com/v22.0/${conversationId}/messages`, {
      params: {
        access_token: INSTAGRAM_ACCESS_TOKEN,
        fields: "message,from{id,username},created_time,id",
      },
    });

    console.log("✅ Messages Fetched:", JSON.stringify(response.data, null, 2));

    const updatedMessages = response.data.data.map((msg) => ({
      ...msg,
      from: msg.from ? { ...msg.from, name: msg.from.username || "Unknown" } : { name: "Unknown" },
    }));

    res.json({ data: updatedMessages });
  } catch (error) {
    console.error("🚨 API ERROR:", error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data?.error?.message || error.message });
  }
});

// ✅	Send a Message to a User
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
      access_token: INSTAGRAM_ACCESS_TOKEN.slice(0, 10) + "...",
    });
    const response = await axios.post(
      `https://graph.facebook.com/v22.0/me/messages`,
      {
        recipient: { id: recipientId },
        message: { text: message },
        messaging_type: "MESSAGE_TAG",
        tag: "human_agent",
      },
      { params: { access_token: INSTAGRAM_ACCESS_TOKEN } }
    );
    console.log("✅ Graph API response:", response.data);
    res.json(response.data);
  } catch (error) {
    console.error("🚨 API ERROR:", error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data?.error?.message || error.message });
  }
});

// ✅ Webhook to Receive Real-Time Updates
router.all("/webhook", (req, res) => {
  console.log(`Webhook ${req.method} request received:`);
  console.log("Query:", JSON.stringify(req.query, null, 2));
  console.log("Body:", JSON.stringify(req.body, null, 2));

  // Handle GET request for webhook verification
  if (req.method === "GET") {
    console.log("Verify token from query:", req.query["hub.verify_token"]);
    console.log("Verify token from env:", WEBHOOK_VERIFY_TOKEN);
    if (req.query["hub.verify_token"] === WEBHOOK_VERIFY_TOKEN) {
      console.log("Verification successful, sending challenge:", req.query["hub.challenge"]);
      return res.send(req.query["hub.challenge"]);
    } else {
      console.log("Verification failed: Tokens do not match");
      return res.sendStatus(403);
    }
  }

  // Handle POST request for incoming messages
  if (req.method === "POST") {
    const body = req.body;
    if (body.entry && body.entry[0].messaging) {
      const message = body.entry[0].messaging[0];
      const conversationId = message.thread_id || message.sender.id;
      const newMessage = {
        id: message.message_id,
        message: message.message?.text || "No message content",
        from: { id: message.sender.id, name: "Unknown" },
        created_time: new Date(message.timestamp).toISOString(),
      };

      console.log("Emitting new message:", newMessage);
      io.emit("messageReceived", newMessage);

      // Optionally fetch updated messages
      axios
        .get(`https://graph.facebook.com/v22.0/${conversationId}/messages`, {
          params: {
            access_token: INSTAGRAM_ACCESS_TOKEN,
            fields: "message,from{id,username},created_time,id",
          },
        })
        .then((response) => {
          console.log("Updated Messages from Webhook:", response.data);
        })
        .catch((error) => console.error("Error fetching updated messages:", error));
    } else {
      console.log("No messaging data in webhook payload");
    }

    return res.sendStatus(200);
  }

  // Handle other methods
  console.log("Unsupported method:", req.method);
  res.sendStatus(405);
});

// Export the router for middleware and app/server/io for the main server file
module.exports = { router, app, server, io };