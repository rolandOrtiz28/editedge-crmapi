require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const dbUrl = process.env.NODE_ENV === "production" ? process.env.DB_URL : process.env.DB_URL_DEV;

mongoose.connect(dbUrl, { serverSelectionTimeoutMS: 5000 })
  .then(() => console.log("✅ Database Connected"))
  .catch((err) => console.error("MongoDB Connection Error:", err));

const generateAdminToken = async () => {
  try {
    // Find an admin user or create one for testing
    let admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      admin = new User({
        name: "Test Admin",
        email: "testadmin@example.com",
        password: "adminpassword123",
        role: "admin",
      });
      await admin.save();
      console.log("Admin created:", admin);
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: admin._id, role: admin.role, name: admin.name },
      process.env.SESSION_SECRET || 'editedgemultimedia',
      { expiresIn: '7d' }
    );

    console.log("Admin JWT Token:", token);
    console.log("Admin ID:", admin._id.toString());
  } catch (err) {
    console.error("Error generating admin token:", err);
  } finally {
    mongoose.connection.close();
  }
};

generateAdminToken();