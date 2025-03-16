const express = require("express");
const Group = require("../models/Group");
const Lead = require("../models/Lead");
const Contact = require("../models/Contact");
const router = express.Router();

// ✅ Create a New Group

router.post("/create", async (req, res) => {
    try {
      const { name } = req.body;
  
      if (!name) {
        return res.status(400).json({ error: "Group name is required." });
      }
  
      // Check if the group already exists
      const existingGroup = await Group.findOne({ name });
      if (existingGroup) {
        return res.status(400).json({ error: "A group with this name already exists." });
      }
  
      const newGroup = new Group({ name });
      await newGroup.save();
  
      res.status(201).json({ message: "Group created successfully!", group: newGroup });
    } catch (error) {
      console.error("Error creating group:", error);
      res.status(500).json({ error: "Failed to create group." });
    }
  });
  

// ✅ Get All Groups
router.get("/", async (req, res) => {
    try {
      const groups = await Group.find().lean(); // Convert Mongoose Docs to JSON objects
  
      // Fetch members' details for each group
      for (const group of groups) {
        group.members = await Promise.all(
          group.members.map(async (member) => {
            let memberData;
            if (member.type === "lead") {
              memberData = await Lead.findById(member.memberId).select("name email");
            } else if (member.type === "contact") {
              memberData = await Contact.findById(member.memberId).select("name email");
            }
            return memberData ? { ...member, ...memberData.toObject() } : null;
          })
        );
  
        // Remove null values (in case a member was deleted)
        group.members = group.members.filter((m) => m !== null);
      }
  
      res.status(200).json(groups);
    } catch (error) {
      console.error("❌ Error fetching groups:", error);
      res.status(500).json({ error: "Failed to fetch groups." });
    }
  });
  



  router.post("/:groupId/add-members", async (req, res) => {
    try {
      const { groupId } = req.params;
      const { memberIds, type } = req.body;
  
      console.log("🟢 Received Bulk Data:", { groupId, memberIds, type });
  
      if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
        return res.status(400).json({ error: "Member IDs must be an array and cannot be empty." });
      }
  
      if (!type) {
        return res.status(400).json({ error: "Member type is required." });
      }
  
      let memberModel = type === "lead" ? Lead : Contact;
      let group = await Group.findById(groupId);
  
      if (!group) return res.status(404).json({ error: "Group not found." });
  
      let addedMembers = [];
  
      for (const memberId of memberIds) {
        let member = await memberModel.findById(memberId);
        if (!member) continue; // Skip if member not found
  
        // ✅ Prevent adding members already in a group
        if (member.groups.length > 0) {
          console.log(`⛔ Member ${member.name} is already in a group. Skipping.`);
          continue;
        }
  
        console.log(`🟡 Adding member: ${member.name}`);
  
        // ✅ Add group reference inside the Lead/Contact document
        if (!member.groups.includes(groupId)) {
          member.groups.push(groupId);
          await member.save();
        }
  
        // ✅ Add member reference inside the Group document
        if (!group.members.some(m => m.memberId.toString() === memberId)) {
          group.members.push({ memberId, type });
        }
  
        addedMembers.push({ memberId, name: member.name, email: member.email });
      }
  
      await group.save();
  
      console.log("✅ Bulk Members Added:", addedMembers);
  
      res.status(200).json({ message: "Members added successfully!", addedMembers });
    } catch (error) {
      console.error("❌ Error adding members in bulk:", error);
      res.status(500).json({ error: "Failed to add members in bulk." });
    }
  });
  
  
  
  

// ✅ Remove Lead/Contact from a Group
router.post("/:groupId/remove-member", async (req, res) => {
    try {
      const { groupId } = req.params;
      const { memberId, type } = req.body; // type can be "lead" or "contact"
  
      if (!memberId || !type) {
        return res.status(400).json({ error: "Member ID and type are required." });
      }
  
      // Find the group and remove the member from its members array
      const group = await Group.findById(groupId);
      if (!group) {
        return res.status(404).json({ error: "Group not found." });
      }
  
      // Remove member from group's members array
      group.members = group.members.filter((m) => m.memberId.toString() !== memberId);
      await group.save();
  
      // Find the member and remove the group from its groups array
      let memberModel = type === "lead" ? Lead : Contact;
      let member = await memberModel.findById(memberId);
  
      if (!member) {
        return res.status(404).json({ error: "Member not found." });
      }
  
      member.groups = member.groups.filter((id) => id.toString() !== groupId);
      await member.save();
  
      res.status(200).json({ message: "Member removed from group successfully!" });
    } catch (error) {
      console.error("Error removing member from group:", error);
      res.status(500).json({ error: "Failed to remove member from group." });
    }
  });
  

// ✅ Get All Members of a Group
router.get("/:groupId/members", async (req, res) => {
  try {
    const { groupId } = req.params;

    const leads = await Lead.find({ groups: groupId }).select("name email");
    const contacts = await Contact.find({ groups: groupId }).select("name email");

    res.status(200).json({ leads, contacts });
  } catch (error) {
    console.error("Error fetching group members:", error);
    res.status(500).json({ error: "Failed to fetch group members." });
  }
});

router.delete("/:groupId", async (req, res) => {
    try {
      const { groupId } = req.params;
  
      // Find and delete the group
      const group = await Group.findByIdAndDelete(groupId);
      if (!group) {
        return res.status(404).json({ error: "Group not found." });
      }
  
      // Remove the group from all members
      await Lead.updateMany({ groups: groupId }, { $pull: { groups: groupId } });
      await Contact.updateMany({ groups: groupId }, { $pull: { groups: groupId } });
  
      res.status(200).json({ message: "Group deleted successfully!" });
    } catch (error) {
      console.error("Error deleting group:", error);
      res.status(500).json({ error: "Failed to delete group." });
    }
  });
  

module.exports = router;
