const express = require("express");
const router = express.Router();
const { google } = require("googleapis");
const { getGmailClient } = require("../utils/gmailClient");
const multer = require("multer");


const upload = multer();


// Helper to parse email headers
const parseEmailHeaders = (headers) => {
  const getHeader = (name) => headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || "";
  return {
    from: getHeader("From"),
    to: getHeader("To"),
    subject: getHeader("Subject"),
    date: getHeader("Date"),
  };
};

// Helper to convert email snippet to plain text
const getEmailSnippet = (message) => {
  if (message.payload && message.payload.parts) {
    const part = message.payload.parts.find((p) => p.mimeType === "text/plain");
    if (part && part.body && part.body.data) {
      return Buffer.from(part.body.data, "base64").toString("utf-8");
    }
  }
  return message.snippet || "";
};

// Fetch emails based on category (inbox, sent, starred, trash)
router.get("/", async (req, res) => {
  try {
    const { category = "inbox" } = req.query;
    const gmail = await getGmailClient(); // Use business email credentials
    let query = "";

    switch (category) {
      case "sent":
        query = "from:me";
        break;
      case "starred":
        query = "is:starred";
        break;
      case "trash":
        query = "in:trash";
        break;
      case "inbox":
      default:
        query = "in:inbox";
        break;
    }

    const response = await gmail.users.messages.list({
      userId: "me",
      q: query,
      maxResults: 20,
    });

    const messages = response.data.messages || [];
    const emailPromises = messages.map(async (msg) => {
      const message = await gmail.users.messages.get({
        userId: "me",
        id: msg.id,
        format: "full",
      });

      const headers = parseEmailHeaders(message.data.payload.headers);
      const snippet = getEmailSnippet(message.data);

      return {
        id: msg.id,
        threadId: msg.threadId,
        subject: headers.subject,
        from: headers.from,
        to: headers.to,
        date: headers.date,
        snippet: snippet,
        isStarred: message.data.labelIds.includes("STARRED"),
        isTrashed: message.data.labelIds.includes("TRASH"),
      };
    });

    const emails = await Promise.all(emailPromises);
    res.json({ message: "Emails fetched successfully", emails });
  } catch (error) {
    console.error("Error fetching emails:", error);
    res.status(500).json({ error: "Failed to fetch emails" });
  }
});


// Send an email
router.post("/send", upload.array("attachments"), async (req, res) => {
  try {
    const { to, subject, html } = req.body; // ✅ Accepts HTML content instead of plain text
    const attachments = req.files || [];

    if (!to || !subject || !html) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Authenticate Gmail API
    const gmail = await getGmailClient(); // ✅ Business email credentials

    // Construct Email with MIME format
    const boundary = "----=_Part_123456";
    let emailLines = [];

    emailLines.push(`From: editedgemultimedia@gmail.com`);
    emailLines.push(`To: ${to}`);
    emailLines.push(`Subject: ${subject}`);
    emailLines.push(`MIME-Version: 1.0`);
    emailLines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
    emailLines.push("");
    
    // HTML Body
    emailLines.push(`--${boundary}`);
    emailLines.push(`Content-Type: text/html; charset="UTF-8"`);
    emailLines.push("");
    emailLines.push(html);
    emailLines.push("");

    // Attachments (if any)
    for (const file of attachments) {
      const fileContent = file.buffer.toString("base64");
      emailLines.push(`--${boundary}`);
      emailLines.push(`Content-Type: ${file.mimetype}; name="${file.originalname}"`);
      emailLines.push(`Content-Transfer-Encoding: base64`);
      emailLines.push(`Content-Disposition: attachment; filename="${file.originalname}"`);
      emailLines.push("");
      emailLines.push(fileContent);
      emailLines.push("");
    }

    emailLines.push(`--${boundary}--`);

    // Encode email to base64
    const raw = Buffer.from(emailLines.join("\r\n"))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    // Send Email via Gmail API
    const response = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw },
    });

    res.json({ message: "Email sent successfully", emailId: response.data.id });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ error: "Failed to send email" });
  }
});



router.put("/star/:id", async (req, res) => {
  const { id } = req.params;
  const { star } = req.body;

  try {
    const gmail = await getGmailClient(); // Get Gmail API client

    if (star) {
      // Add "STARRED" label
      await gmail.users.messages.modify({
        userId: "me",
        id: id,
        requestBody: {
          addLabelIds: ["STARRED"],
          removeLabelIds: [],
        },
      });
    } else {
      // Remove "STARRED" label
      await gmail.users.messages.modify({
        userId: "me",
        id: id,
        requestBody: {
          addLabelIds: [],
          removeLabelIds: ["STARRED"],
        },
      });
    }

    res.json({ message: star ? "Email starred" : "Email unstarred" });
  } catch (error) {
    console.error("Error starring/un-starring email:", error);
    res.status(500).json({ error: "Failed to update email star status" });
  }
});


// Trash or untrash an email
router.put("/trash/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { trash } = req.body;
    const user = req.user;

    if (!user.accessToken) {
      return res.status(401).json({ error: "No access token available" });
    }

    const gmail = await getGmailClient(user);
    if (trash) {
      await gmail.users.messages.trash({
        userId: "me",
        id: id,
      });
    } else {
      await gmail.users.messages.untrash({
        userId: "me",
        id: id,
      });
    }

    res.json({ message: trash ? "Email moved to trash" : "Email restored from trash" });
  } catch (error) {
    console.error("Error trashing/untrashing email:", error);
    res.status(500).json({ error: "Failed to update email trash status" });
  }
});


router.post("/send", upload.array("attachments"), async (req, res) => {
  try {
    const { to, subject, text, html } = req.body; // ✅ Accepts both plain text & HTML
    const attachments = req.files || [];

    if (!to || !subject || (!text && !html)) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Authenticate Gmail API
    const gmail = await getGmailClient(); // ✅ Uses business email credentials

    // Construct MIME Email
    const boundary = "boundary123";
    let emailLines = [];

    emailLines.push(`From: editedgemultimedia@gmail.com`);
    emailLines.push(`To: ${to}`);
    emailLines.push(`Subject: ${subject}`);
    emailLines.push(`MIME-Version: 1.0`);
    emailLines.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
    emailLines.push("");

    if (text) {
      emailLines.push(`--${boundary}`);
      emailLines.push(`Content-Type: text/plain; charset="UTF-8"`);
      emailLines.push("");
      emailLines.push(text);
      emailLines.push("");
    }

    if (html) {
      emailLines.push(`--${boundary}`);
      emailLines.push(`Content-Type: text/html; charset="UTF-8"`);
      emailLines.push("Content-Transfer-Encoding: quoted-printable"); // ✅ FIX: Ensure HTML is properly encoded
      emailLines.push("");
      emailLines.push(html);
      emailLines.push("");
    }

    emailLines.push(`--${boundary}--`);
    emailLines.push("");

    // Attachments (if any)
    if (attachments.length > 0) {
      emailLines.push(`--${boundary}`);
      for (const file of attachments) {
        const fileContent = file.buffer.toString("base64");
        emailLines.push(`Content-Type: ${file.mimetype}; name="${file.originalname}"`);
        emailLines.push(`Content-Disposition: attachment; filename="${file.originalname}"`);
        emailLines.push(`Content-Transfer-Encoding: base64`);
        emailLines.push("");
        emailLines.push(fileContent);
        emailLines.push("");
      }
      emailLines.push(`--${boundary}--`);
    }

    // Encode email to base64
    const raw = Buffer.from(emailLines.join("\r\n"))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    // Send Email via Gmail API
    const response = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw },
    });

    res.json({ message: "Email sent successfully", emailId: response.data.id });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ error: "Failed to send email" });
  }
});


router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const gmail = await getGmailClient(); // Use business email

    const message = await gmail.users.messages.get({
      userId: "me",
      id: id,
      format: "full",
    });

    if (!message || !message.data) {
      return res.status(404).json({ error: "Email not found" });
    }

    const headers = message.data.payload?.headers ? parseEmailHeaders(message.data.payload.headers) : {};
    let fullBody = "";

    if (message.data.payload.parts) {
      const textPart = message.data.payload.parts.find((part) => part.mimeType === "text/plain");
      const htmlPart = message.data.payload.parts.find((part) => part.mimeType === "text/html");

      if (textPart?.body?.data) {
        fullBody = Buffer.from(textPart.body.data, "base64").toString("utf-8");
      } else if (htmlPart?.body?.data) {
        fullBody = Buffer.from(htmlPart.body.data, "base64").toString("utf-8");
      }
    } else if (message.data.payload.body?.data) {
      fullBody = Buffer.from(message.data.payload.body.data, "base64").toString("utf-8");
    }

    const emailDetails = {
      id: message.data.id,
      threadId: message.data.threadId,
      subject: headers.subject || "No Subject",
      from: headers.from || "Unknown",
      to: headers.to || "Unknown",
      date: headers.date || "Unknown",
      snippet: message.data.snippet || "No snippet available",
      fullBody: fullBody || "No content available",
      isStarred: message.data.labelIds?.includes("STARRED") || false,
      isTrashed: message.data.labelIds?.includes("TRASH") || false,
    };

    console.log("✅ Email fetched successfully:", emailDetails);
    res.json({ message: "Email fetched successfully", email: emailDetails });
  } catch (error) {
    console.error("❌ Error fetching email:", error);
    res.status(500).json({ error: "Failed to fetch email" });
  }
});


module.exports = router;