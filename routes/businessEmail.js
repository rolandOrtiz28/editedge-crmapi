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
  authTimeout: 45000, // Increased timeout to 45 seconds
};

// Function to fetch all emails
const fetchEmails = (res = null) => {
  const connection = new Imap(imapConfig);
  let emails = [];

  connection.on("ready", () => {
    console.log("📬 IMAP Connection Ready");

    connection.openBox("INBOX", false, (err, box) => {
      if (err) {
        console.error("❌ Error opening inbox:", err);
        connection.end();
        if (res) return res.status(500).json({ error: "Failed to open inbox" });
      }

      // Fetch ALL emails instead of filtering by date
      connection.search(["ALL"], (err, results) => {
        if (err || results.length === 0) {
          console.log("📭 No emails found in the inbox.");
          connection.end();
          if (res) return res.json({ emails: [], newEmailsCount: 0 });
        }

        console.log(`📬 Found ${results.length} emails. Email IDs:`, results);

        const fetch = connection.fetch(results, {
          bodies: "",
          struct: true,
        });

        fetch.on("message", (msg, seqno) => {
          msg.on("body", (stream, info) => {
            simpleParser(stream, (err, parsed) => {
              if (err) {
                console.error("❌ Parsing error:", err);
                return;
              }

              const emailData = {
                id: seqno,
                subject: parsed.subject || "No Subject",
                from: parsed.from?.text || "Unknown",
                date: parsed.date || new Date(),
                text: parsed.text || "",
                html: parsed.html || "",
                messageId: parsed.messageId || "",
              };

              emails.push(emailData);
              console.log(`📩 Email Fetched [ID: ${seqno}] - Subject: ${emailData.subject}`);
            });
          });
        });

        fetch.once("end", () => {
          console.log(`✅ Retrieved ${emails.length} emails.`);
          connection.end();
          if (res) return res.json({ emails, newEmailsCount: emails.length });
        });

        fetch.once("error", (err) => {
          console.error("❌ Fetch error:", err);
          connection.end();
          if (res) return res.status(500).json({ error: "Failed to fetch emails" });
        });
      });
    });
  });

  connection.on("error", (err) => {
    console.error("❌ IMAP Connection Error:", err);
    setTimeout(() => {
      console.log("🔄 Reconnecting to IMAP...");
      fetchEmails();
    }, 10000);
  });

  connection.connect();
};

// Fetch Business Emails (Manually Triggered)
router.get("/inbox", async (req, res) => {
  console.log("🔍 Fetching business emails...");
  fetchEmails(res);
});

// ✅ Auto-fetch emails every 5 minutes
setInterval(() => {
  console.log("🔄 Auto-fetching new emails...");
  fetchEmails();
}, 300000); // 300000ms = 5 minutes

// SMTP Configuration (for Sending Emails)
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
