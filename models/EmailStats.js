const mongoose = require("mongoose");

const EmailStatsSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true }, // Store date as "YYYY-MM-DD"
  count: { type: Number, default: 0 },
});

module.exports = mongoose.model("EmailStats", EmailStatsSchema);
