const express = require("express");
const router = express.Router();
const Lead = require("../models/Lead");
const multer = require("multer");
const Papa = require("papaparse");
const Group = require("../models/Group");
const Notification = require("../models/Notification");

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// ✅ Get all leads
router.get("/", async (req, res) => {
  try {
    const leads = await Lead.find();
    res.json(leads);
  } catch (error) {
    res.status(500).json({ message: "Error fetching leads", error });
  }
});

// ✅ Add a new lead
router.post("/", async (req, res) => {
    try {
      const { name, company, email, phone, address, website, description, channel, companySize, niche, status, value } = req.body;
      
      if (!name || !company || !email) {
        return res.status(400).json({ message: "Name, Company, and Email are required" });
      }
  
      const newLead = new Lead({ name, company, email, phone, address, website, description, channel, companySize, niche, status, value });
      await newLead.save();
      
      res.status(201).json(newLead);
    } catch (error) {
      res.status(500).json({ message: "Error adding lead", error });
    }
  });


  router.post("/upload-csv", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        console.log("📁 File Received:", req.file.originalname);
        const csvFileName = req.file.originalname.replace(".csv", ""); // ✅ Track CSV File Name
        const csvString = req.file.buffer.toString("utf-8");

        Papa.parse(csvString, {
            header: true,
            skipEmptyLines: true,
            complete: async (result) => {
                console.log("🔍 Parsed CSV Data:", result.data.length, "rows found");

                // Define the required fields
                const requiredFields = [
                    "name", "company", "email", "phone", "address",
                    "website", "description", "channel", "companysize",
                    "niche", "status", "value"
                ];

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

                const newLeads = [];
                const duplicatePairs = [];

                for (const row of formattedData) {
                    if (!row.name || !row.email) {
                        console.log("⚠️ Skipping row - Missing Name or Email:", row);
                        continue;
                    }

                    const existingLead = await Lead.findOne({ email: row.email });

                    if (existingLead) {
                        console.log("❌ Duplicate Lead:", row.email);
                        duplicatePairs.push({
                            existing: existingLead,
                            new: row,
                        });
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
                            status: row.status || "New", // Default status to "New" if missing
                            value: parseInt(row.value) || 0,
                            importedBatch: csvFileName, // ✅ Track CSV Batch
                        });
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

                // ✅ Automatically create a group if requested
                if (req.body.createGroup === "true") {
                    let group = await Group.findOne({ name: csvFileName });

                    if (!group) {
                        // ✅ Create group if it doesn’t exist
                        group = new Group({
                            name: csvFileName,
                            members: [], // Initialize members
                        });

                        await group.save();
                    }

                    // ✅ Add leads to the group
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
                    leads: newLeads || [], // ✅ Always return an array
                    added: newLeads.length,
                    duplicates: duplicatePairs, // Still keeping duplicate data for logs
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
      const updatedLead = await Lead.findByIdAndUpdate(id, req.body, { new: true });
      res.json(updatedLead);
    } catch (error) {
      res.status(500).json({ message: "Error updating lead", error });
    }
  });

  router.put("/:id/notes", async (req, res) => {
    try {
      const { id } = req.params;
      const { note } = req.body;
      const lead = await Lead.findById(id);
      lead.notes.push(note);
      await lead.save();
      res.json(lead);
    } catch (error) {
      res.status(500).json({ message: "Error adding note", error });
    }
  });
  
  router.put("/:id/reminders", async (req, res) => {
    try {
      const { id } = req.params;
      const { text, date } = req.body;
      const lead = await Lead.findById(id);
      lead.reminders.push({ text, date });
      await lead.save();
      res.json(lead);
    } catch (error) {
      res.status(500).json({ message: "Error adding reminder", error });
    }
  });


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
  
      // Get assigner's details
      const assigner = await User.findById(req.user._id).select("name");
  
      await Notification.create({
        userId: assignee,
        type: "lead",
        itemId: updatedLead._id,
        message: `${assigner.name} assigned you a new lead.`,
      });
  
      res.json(updatedLead);
    } catch (error) {
      console.error("Error assigning lead:", error);
      res.status(500).json({ message: "Error assigning lead", error });
    }
  });
  
  
  

// ✅ Delete a lead
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await Lead.findByIdAndDelete(id);
    res.json({ message: "Lead deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting lead", error });
  }
});

module.exports = router;
