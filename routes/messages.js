const express = require("express");
const axios = require("axios");
require("dotenv").config();

// ✅ Export a function that accepts `io`
module.exports = (io) => {
    const router = express.Router();
    const PAGE_ACCESS_TOKEN = process.env.MESSENGER_ACCESS_TOKEN;
    const VERIFY_TOKEN = "mysecrettoken";

    // In-memory store for message sender information (replace with a database in production)
    const messagesStore = new Map();


    // ✅ Fetch Messenger Conversations
    router.get("/conversations", async (req, res) => {
        try {
            const response = await axios.get(`https://graph.facebook.com/v19.0/me/conversations`, {
                params: {
                    access_token: PAGE_ACCESS_TOKEN,
                    fields: "participants,message_count,updated_time,link"
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
                    access_token: PAGE_ACCESS_TOKEN,
                    fields: "message,from,created_time,id"
                }
            });

            // Merge with custom sender data from messagesStore
            const fbMessages = response.data.data || [];
            const enrichedMessages = fbMessages.map(fbMsg => {
                const storedMsg = messagesStore.get(fbMsg.id);
                return {
                    ...fbMsg,
                    from: storedMsg?.from || fbMsg.from, // Use custom sender if available
                    created_time: storedMsg?.created_time || fbMsg.created_time
                };
            });

            res.json({ data: enrichedMessages });
        } catch (error) {
            res.status(500).json({ error: error.response?.data || error.message });
        }
    });

    // ✅ Send a New Message
    router.post("/send", async (req, res) => {
        try {
            const { conversationId, message, from } = req.body;

            // ✅ Log request body
            console.log("Received request to send message:", req.body);

            if (!conversationId || !message) {
                return res.status(400).json({ error: "Conversation ID and message are required" });
            }

            const senderName = from?.name || "You"; // Default to "You" if not provided

            console.log("Fetching recipient ID for conversation:", conversationId);

            // ✅ Get Conversation Details to Extract User ID
            const conversationResponse = await axios.get(
                `https://graph.facebook.com/v19.0/${conversationId}`,
                {
                    params: {
                        access_token: process.env.MESSENGER_ACCESS_TOKEN,
                        fields: "participants",
                    },
                }
            );

            const participants = conversationResponse.data.participants.data;
            const recipient = participants.find(p => p.name !== "Edit Edge"); 

            if (!recipient) {
                return res.status(400).json({ error: "Recipient user not found" });
            }

            const recipientId = recipient.id;

            

            // ✅ Send Message to the User
            const response = await axios.post(
                `https://graph.facebook.com/v19.0/me/messages`,
                {
                    recipient: { id: recipientId },
                    message: { text: message },
                    messaging_type: "RESPONSE",
                },
                {
                    params: { access_token: process.env.MESSENGER_ACCESS_TOKEN },
                }
            );

            

            // Store the message with sender information
            const messageId = response.data.message_id;
            messagesStore.set(messageId, {
                conversationId,
                message,
                from: { name: senderName },
                created_time: new Date().toISOString(),
                id: messageId
            });

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

    return router; // ✅ Return the router with all routes defined
};
