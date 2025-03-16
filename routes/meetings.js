const express = require("express");
const router = express.Router();
const Meeting = require("../models/Meeting");


// ✅ Get all meetings for the authenticated user
router.get("/", async (req, res) => {
    console.log("🔍 GET /api/meetings - req.session:", req.session);
    console.log("🔍 GET /api/meetings - req.user:", req.user);

    try {
        const meetings = await Meeting.find({ user: req.user._id })
            .sort({ date: -1, time: -1 })
            .populate("user", "name email profilePicture");

        res.json(meetings);
    } catch (error) {
        console.error("Error fetching meetings:", error);
        res.status(500).json({ message: "Error fetching meetings", error: error.message });
    }
});

// ✅ Create a new meeting
router.post("/", async (req, res) => {
    console.log("🔍 POST /api/meetings - req.session:", req.session);
    console.log("🔍 POST /api/meetings - req.user:", req.user);

    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: No user found" });
        }

        const meetingData = {
            ...req.body,
            user: req.user._id,
        };

        const meeting = new Meeting(meetingData);
        await meeting.save();

        res.status(201).json(meeting);
    } catch (error) {
        console.error("Error creating meeting:", error);
        res.status(400).json({ message: "Error creating meeting", error: error.message });
    }
});

// ✅ Update a meeting
router.put("/:id", async (req, res) => {
    console.log("🔍 PUT /api/meetings - Updating meeting:", req.params.id);

    try {
        const meeting = await Meeting.findOneAndUpdate(
            { _id: req.params.id, user: req.user._id }, // Ensure the meeting belongs to the user
            req.body, 
            { new: true } // Return updated document
        );

        if (!meeting) {
            return res.status(404).json({ message: "Meeting not found" });
        }

        res.json(meeting);
    } catch (error) {
        console.error("Error updating meeting:", error);
        res.status(400).json({ message: "Error updating meeting", error: error.message });
    }
});

// ✅ Delete a meeting
router.delete("/:id", async (req, res) => {
    console.log("🔍 DELETE /api/meetings - Deleting meeting:", req.params.id);

    try {
        const meeting = await Meeting.findOneAndDelete({
            _id: req.params.id,
            user: req.user._id, // Ensure the meeting belongs to the authenticated user
        });

        if (!meeting) {
            return res.status(404).json({ message: "Meeting not found" });
        }

        res.json({ message: "Meeting deleted successfully" });
    } catch (error) {
        console.error("Error deleting meeting:", error);
        res.status(400).json({ message: "Error deleting meeting", error: error.message });
    }
});

module.exports = router;
