const express = require("express");
const Imap = require("imap");
const { simpleParser } = require("mailparser");
const nodemailer = require("nodemailer");
require("dotenv").config();

const router = express.Router();

// IMAP Configuration
const imapConfig = {
  user: process.env.EMAIL_USER,
  password: process.env.EMAIL_PASSWORD,
  host: process.env.IMAP_HOST,
  port: Number(process.env.IMAP_PORT),
  tls: true,
};

// Helper function to open the INBOX
function openInbox(connection, cb) {
  connection.openBox("INBOX", false, cb); // false means read-write mode
}

// Fetch Business Emails (Reading Emails)
router.get("/inbox", async (req, res) => {
  try {
    const connection = new Imap(imapConfig);
    let emails = [];
    let newEmailsCount = 0;

    connection.once("ready", () => {
      openInbox(connection, (err, box) => {
        if (err) {
          console.error("Error opening inbox:", err);
          connection.end();
          return res.status(500).json({ error: "Failed to open inbox" });
        }

        // Check for unread messages
        newEmailsCount = box.messages.unseen || 0;

        const fetch = connection.seq.fetch("1:*", {
          bodies: "", // Fetch the entire email
          struct: true,
        });

        fetch.on("message", (msg, seqno) => {
          msg.on("body", (stream, info) => {
            simpleParser(stream, (err, parsed) => {
              if (err) {
                console.error("Parsing error:", err);
                return;
              }
              emails.push({
                id: seqno,
                subject: parsed.subject || "No Subject",
                from: parsed.from?.text || "Unknown",
                date: parsed.date || new Date(),
                text: parsed.text || "", // Plain text content
                html: parsed.html || "", // HTML content
                messageId: parsed.messageId || "",
                inReplyTo: parsed.inReplyTo || "",
              });
              // Mark the email as read
              msg.once("attributes", (attrs) => {
                if (!attrs.flags.includes("\\Seen")) {
                  connection.addFlags(attrs.uid, "\\Seen", (err) => {
                    if (err) console.error("Error marking email as read:", err);
                  });
                }
              });
            });
          });
        });

        fetch.once("error", (err) => {
          console.error("Fetch error:", err);
          connection.end();
          res.status(500).json({ error: "Failed to fetch emails" });
        });

        fetch.once("end", () => {
          connection.end();
          res.json({ emails, newEmailsCount });
        });
      });
    });

    connection.once("error", (err) => {
      console.error("Connection error:", err);
      res.status(500).json({ error: "Connection failed" });
    });

    connection.connect();
  } catch (error) {
    console.error("Unexpected error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// SMTP Configuration (for Sending/Replies)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Send Business Emails (Replying/Sending)
router.post("/send", async (req, res) => {
  console.log("📤 Sending business email...");
  console.log("🔍 Request Body:", req.body);

  const { to, subject, html, inReplyTo, messageId } = req.body;

  if (!to || !subject || !html) {
    console.error("❌ Missing required fields");
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const mailOptions = {
      from: `"EditEdge Multimedia" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    };

    if (inReplyTo && messageId) {
      mailOptions.inReplyTo = inReplyTo;
      mailOptions.references = [messageId];
    }

    const info = await transporter.sendMail(mailOptions);

    console.log("✅ Email sent:", info.messageId);
    res.json({ message: "Email sent successfully!", messageId: info.messageId });
  } catch (error) {
    console.error("❌ Error sending email:", error);
    res.status(500).json({ error: "Failed to send email" });
  }
});

module.exports = router;