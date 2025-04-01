const express = require("express");
const router = express.Router();
const Lead = require("../models/Lead");
const multer = require("multer");
const Papa = require("papaparse");
const Group = require("../models/Group");
const Notification = require("../models/Notification");
const axios = require("axios");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// ✅ Get all leads
router.get("/", async (req, res) => {
  try {
    const leads = await Lead.find().lean(); // Retrieve all fields
    console.log("🔍 Full leads data from database:", JSON.stringify(leads, null, 2));
    res.json(leads);
  } catch (error) {
    console.error("❌ Error fetching leads:", error);
    res.status(500).json({ message: "Error fetching leads", error });
  }
});

// ✅ Add a new lead
router.post("/", async (req, res) => {
  try {
    const { name, company, email, phone, address, website, description, channel, companySize, niche, status, value, notes, reminders } = req.body;

    if (!name || !company || !email) {
      return res.status(400).json({ message: "Name, Company, and Email are required" });
    }

    const existingLead = await Lead.findOne({ email });

    if (existingLead) {
      return res.status(400).json({ message: "Lead with this email already exists" });
    }

    const newLead = new Lead({
      name,
      company,
      email,
      phone,
      address,
      website,
      description,
      channel,
      companySize,
      niche,
      status: status || "New",
      value: value || 0,
      notes: notes || [],
      reminders: reminders || [],
    });
    await newLead.save();

    res.status(201).json(newLead);
  } catch (error) {
    console.error("❌ Error adding lead:", error);
    res.status(500).json({ message: "Error adding lead", error });
  }
});

// ✅ Upload CSV
router.post("/upload-csv", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    console.log("📁 File Received:", req.file.originalname);
    const csvFileName = req.file.originalname.replace(".csv", "");
    const csvString = req.file.buffer.toString("utf-8");

    Papa.parse(csvString, {
      header: true,
      skipEmptyLines: true,
      complete: async (result) => {
        console.log("🔍 Parsed CSV Data:", result.data.length, "rows found");

        const requiredFields = [
          "name", "company", "email", "phone", "address",
          "website", "description", "channel", "companysize",
          "niche", "status", "value"
        ];

        const formattedData = result.data.map((row) => {
          const formattedRow = {};
          Object.keys(row).forEach((key) => {
            const normalizedKey = key.trim().toLowerCase();
            if (requiredFields.includes(normalizedKey)) {
              formattedRow[normalizedKey] = row[key]?.trim() || "";
            }
          });
          return formattedRow;
        });

        console.log("🔄 Normalized & Filtered Data:", formattedData);

        const newLeads = [];
        const duplicatePairs = [];
        const errors = [];

        for (const row of formattedData) {
          if (!row.name || !row.email) {
            console.log("⚠️ Skipping row - Missing Name or Email:", row);
            continue;
          }

          try {
            const existingLead = await Lead.findOne({ email: row.email });

            if (existingLead) {
              console.log("❌ Duplicate Lead:", row.email);
              duplicatePairs.push({ existing: existingLead, new: row });
            } else {
              newLeads.push({
                name: row.name,
                company: row.company || "",
                email: row.email,
                phone: row.phone || "",
                address: row.address || "",
                website: row.website || "",
                description: row.description || "",
                channel: row.channel || "",
                companySize: row.companysize || "",
                niche: row.niche || "",
                status: row.status || "New",
                value: parseInt(row.value) || 0,
                importedBatch: csvFileName,
                notes: [],
                reminders: [],
              });
            }
          } catch (error) {
            console.error("❌ Error processing row:", row, error);
            errors.push({ row, error: error.message });
          }
        }

        console.log("📊 Leads Ready for Insert:", newLeads);

        let insertedLeads = [];
        if (newLeads.length > 0) {
          console.log("📥 Inserting leads into the database...");
          insertedLeads = await Lead.insertMany(newLeads);
          console.log("✅ Successfully inserted", insertedLeads.length, "leads");
        } else {
          console.log("⚠️ No new leads to insert.");
        }

        console.log("⚠️ Duplicates Found:", duplicatePairs.length);

        if (req.body.createGroup === "true") {
          let group = await Group.findOne({ name: csvFileName });

          if (!group) {
            group = new Group({ name: csvFileName, members: [] });
            await group.save();
          }

          const leadMembers = insertedLeads.map((lead) => ({
            memberId: lead._id,
            type: "lead",
          }));

          await Group.findByIdAndUpdate(group._id, {
            $push: { members: { $each: leadMembers } },
          });

          console.log(`✅ Added ${leadMembers.length} leads to group '${csvFileName}'`);
        }

        res.status(201).json({
          message: "CSV uploaded successfully",
          leads: insertedLeads,
          added: insertedLeads.length,
          duplicates: duplicatePairs,
          errors,
        });
      },
    });
  } catch (error) {
    console.error("❌ Error processing CSV:", error);
    res.status(500).json({ message: "Error processing CSV", error });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { notes, reminders, status, assignee, ...otherFields } = req.body;

    const updateData = { ...otherFields };
    if (notes !== undefined) updateData.notes = notes; // Replace notes array
    if (reminders !== undefined) updateData.reminders = reminders; // Replace reminders array
    if (status) updateData.status = status;
    if (assignee !== undefined) updateData.assignee = assignee; // Update assignee if provided

    const existingLead = await Lead.findById(id);
    if (!existingLead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    // Check if assignee has changed
    if (assignee !== undefined && assignee !== existingLead.assignee) {
      // Create a notification for the assigned user
      await axios
        .post(
          `${process.env.BASE_URL || "http://localhost:3000"}/api/notifications`, // Relative path to the notifications route
          {
            userId: assignee, // Use the assignee as the notification recipient
            type: "lead",
            message: `You have been assigned a new lead: ${existingLead.name}`,
            relatedId: id,
          },
          { withCredentials: true }
        )
        .catch((error) => {
          console.error("❌ Error creating notification:", error);
        });
    }

    const updatedLead = await Lead.findByIdAndUpdate(id, updateData, { new: true });
    res.json(updatedLead);
  } catch (error) {
    console.error("❌ Error updating lead:", error);
    res.status(500).json({ message: "Error updating lead", error: error.message });
  }
});

// ✅ Delete separate notes and reminders endpoints (optional)
// If you want to keep them, adjust frontend to use them instead
// router.put("/:id/notes", ...);
// router.put("/:id/reminders", ...);

// ✅ Assign a lead
router.put("/:id/assign", async (req, res) => {
  try {
    const { id } = req.params;
    const { assignee } = req.body;

    if (!assignee) {
      return res.status(400).json({ message: "Assignee is required" });
    }

    const updatedLead = await Lead.findByIdAndUpdate(id, { assignee }, { new: true }).populate("assignee", "name");

    if (!updatedLead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    const assigner = await User.findById(req.user._id).select("name");

    await Notification.create({
      userId: assignee,
      type: "lead",
      itemId: updatedLead._id,
      message: `${assigner.name} assigned you a new lead.`,
    });

    res.json(updatedLead);
  } catch (error) {
    console.error("❌ Error assigning lead:", error);
    res.status(500).json({ message: "Error assigning lead", error });
  }
});

// ✅ Delete all leads
router.delete("/delete-all", async (req, res) => {
  try {
    const result = await Lead.deleteMany({});

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "No leads found to delete." });
    }

    res.json({ message: "All leads deleted successfully", deletedCount: result.deletedCount });
  } catch (error) {
    console.error("❌ Error deleting all leads:", error);
    res.status(500).json({ message: "Error deleting all leads", error: error.message });
  }
});

// ✅ Delete a lead
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const lead = await Lead.findByIdAndDelete(id);
    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }
    res.json({ message: "Lead deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting lead:", error);
    res.status(500).json({ message: "Error deleting lead", error });
  }
});

module.exports = router;