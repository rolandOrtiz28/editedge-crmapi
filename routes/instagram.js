const express = require("express");
const axios = require("axios");
require("dotenv").config();


module.exports = (io) => {
    const router = express.Router();
    const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
    const PAGE_ID = process.env.INSTAGRAM_PAGE_ID; // Your Instagram Business Page ID



    // ✅ Fetch Instagram Conversations
    router.get("/conversations", async (req, res) => {
        try {
            const response = await axios.get(`https://graph.facebook.com/v19.0/${PAGE_ID}/conversations`, {
                params: {
                    access_token: INSTAGRAM_ACCESS_TOKEN,
                    fields: "participants,message_count,updated_time"
                }
            });

            res.json(response.data);
        } catch (error) {
            res.status(500).json({ error: error.response?.data || error.message });
        }
    });

    // ✅ Fetch Messages from a Specific Conversation
    router.get("/messages/:conversationId", async (req, res) => {
        try {
            const { conversationId } = req.params;
            const response = await axios.get(`https://graph.facebook.com/v19.0/${conversationId}/messages`, {
                params: {
                    access_token: INSTAGRAM_ACCESS_TOKEN,
                    fields: "message,from,created_time,id"
                }
            });

            res.json({ data: response.data.data || [] });
        } catch (error) {
            res.status(500).json({ error: error.response?.data || error.message });
        }
    });

    // ✅ Send a New Message
    router.post("/send", async (req, res) => {
        try {
            const { conversationId, message, from } = req.body;

            if (!conversationId || !message) {
                return res.status(400).json({ error: "Conversation ID and message are required" });
            }

            const senderName = from?.name || "You"; // Default to "You"

            // ✅ Get Conversation Details to Extract Recipient ID
            const conversationResponse = await axios.get(`https://graph.facebook.com/v19.0/${conversationId}`, {
                params: {
                    access_token: INSTAGRAM_ACCESS_TOKEN,
                    fields: "participants",
                }
            });

            const participants = conversationResponse.data.participants.data;
            const recipient = participants.find(p => p.name !== "Edit Edge"); 

            if (!recipient) {
                return res.status(400).json({ error: "Recipient user not found" });
            }

            const recipientId = recipient.id;

            // ✅ Send Message to the User
            const response = await axios.post(`https://graph.facebook.com/v19.0/me/messages`, {
                recipient: { id: recipientId },
                message: { text: message },
                messaging_type: "RESPONSE",
            }, {
                params: { access_token: INSTAGRAM_ACCESS_TOKEN },
            });

            const messageId = response.data.message_id;

            // ✅ Emit the message via socket.io for real-time updates
            io.emit("messageReceived", {
                conversationId,
                message,
                from: { name: senderName },
                created_time: new Date().toISOString(),
                id: messageId
            });

            res.json(response.data);
        } catch (error) {
            console.error("Error sending message:", error.response?.data || error.message);
            res.status(500).json({ error: error.response?.data || error.message });
        }
    });

    return router;
};
