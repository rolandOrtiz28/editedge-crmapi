const schedule = require("node-schedule");
const EmailStats = require("./models/EmailStats");

// Schedule a reset at midnight (00:00)
schedule.scheduleJob("0 0 * * *", async () => {
  try {
    console.log("🔄 Resetting daily email count...");
    await EmailStats.deleteMany({});
    console.log("✅ Email count reset!");
  } catch (error) {
    console.error("⚠️ Error resetting email count:", error);
  }
});

module.exports = schedule;
