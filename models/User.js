const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  company: { type: String },
  email: { type: String, unique: true, required: true },
  password: { type: String },
  googleId: { type: String, unique: true, sparse: true },
  profilePicture: { type: String, default: "/default-avatar.png" },
  role: { type: String, enum: ["admin", "sales", "support"], default: "sales" },
  timezone: { 
    type: String, 
    enum: ["Eastern Time (ET)", "Central Time (CT)", "Mountain Time (MT)", "Pacific Time (PT)", "Greenwich Mean Time (GMT)", "Central European Time (CET)"], 
    default: "Pacific Time (PT)" 
  },
  accessToken: { type: String },
  refreshToken: { type: String },
});

// ✅ Hash password before saving (Only for local authentication)
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// ✅ Compare password method (Only for local authentication)
UserSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", UserSchema);