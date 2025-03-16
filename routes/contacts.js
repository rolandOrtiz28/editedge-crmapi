const express = require("express");
const router = express.Router();
const Contact = require("../models/Contact");
const Group = require("../models/Group");
const multer = require("multer");
const Papa = require("papaparse");

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post("/upload-csv", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const csvString = req.file.buffer.toString("utf-8");

    console.log("🚀 CSV Received:", csvString); // LOG RAW CSV CONTENTS

    Papa.parse(csvString, {
      header: true,
      skipEmptyLines: true,
      complete: async (result) => {
        console.log("📌 Raw Parsed Data:", result.data); // LOG RAW PARSED DATA

        // Define the required fields
        const requiredFields = ["name", "company", "email", "phone", "status"];

        // Normalize headers and filter out unnecessary columns
        const formattedData = result.data.map((row) => {
          const formattedRow = {};

          Object.keys(row).forEach((key) => {
            const normalizedKey = key.trim().toLowerCase(); // Convert header to lowercase
            if (requiredFields.includes(normalizedKey)) {
              formattedRow[normalizedKey] = row[key]?.trim() || ""; // Store only required fields
            }
          });

          return formattedRow;
        });

        console.log("🔄 Normalized & Filtered Data:", formattedData); // LOG CLEANED DATA

        const newContacts = [];
        const duplicateContacts = [];

        for (const row of formattedData) {
          if (!row.name || !row.email) {
            console.log("⚠️ Skipping row - Missing Name or Email:", row);
            continue;
          }

          const existingContact = await Contact.findOne({ email: row.email });

          if (existingContact) {
            console.log("❌ Duplicate Contact:", row.email);
            duplicateContacts.push({
              existing: existingContact,
              new: row,
            });
          } else {
            newContacts.push({
              name: row.name,
              company: row.company || "",
              email: row.email,
              phone: row.phone || "",
              status: row.status || "New", // Default status to "New" if missing
            });
          }
        }

        console.log("✅ New Contacts to Insert:", newContacts);

        let insertedContacts = [];
        if (newContacts.length > 0) {
          insertedContacts = await Contact.insertMany(newContacts);
        }

        res.status(201).json({
          message: "CSV uploaded successfully",
          added: insertedContacts.length,
          duplicates: duplicateContacts,
        });
      },
    });
  } catch (error) {
    console.error("❌ Error processing CSV:", error);
    res.status(500).json({ message: "Error processing CSV", error });
  }
});




// ✅ Get all contacts
router.get("/", async (req, res) => {
  try {
    const contacts = await Contact.find();
    res.json(contacts);
  } catch (error) {
    res.status(500).json({ message: "Error fetching contacts", error });
  }
});

// ✅ Add a new contact
router.post("/", async (req, res) => {
  try {
    const { name, company, email, phone, status, avatar } = req.body;
    if (!name || !email) {
      return res.status(400).json({ message: "Name and Email are required" });
    }
    const newContact = new Contact({ name, company, email, phone, status, avatar });
    await newContact.save();
    res.status(201).json(newContact);
  } catch (error) {
    res.status(500).json({ message: "Error adding contact", error });
  }
});

// ✅ Update contact
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updatedContact = await Contact.findByIdAndUpdate(id, req.body, { new: true });
    res.json(updatedContact);
  } catch (error) {
    res.status(500).json({ message: "Error updating contact", error });
  }
});


// ✅ Delete all contacts (THIS MUST BE PLACED BEFORE "/:id")
router.delete("/delete-all", async (req, res) => {
  try {
    const result = await Contact.deleteMany({});

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "No contacts found to delete." });
    }

    res.json({ message: "All contacts deleted successfully", deletedCount: result.deletedCount });
  } catch (error) {
    console.error("❌ Error deleting all contacts:", error);
    res.status(500).json({ message: "Error deleting all contacts", error: error.message });
  }
});

// ✅ Delete a single contact
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const contact = await Contact.findByIdAndDelete(id);
    if (!contact) {
      return res.status(404).json({ message: "Contact not found" });
    }
    res.json({ message: "Contact deleted successfully" });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ message: "Error deleting contact", error });
  }
});



module.exports = router;
