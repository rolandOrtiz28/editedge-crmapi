require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const dbUrl = process.env.NODE_ENV === "production" ? process.env.DB_URL : process.env.DB_URL_DEV;

mongoose.connect(dbUrl, { serverSelectionTimeoutMS: 5000 })
  .then(() => console.log("✅ Database Connected"))
  .catch((err) => console.error("MongoDB Connection Error:", err));

const checkAdminUser = async () => {
  try {
    const admin = await User.findById('67ce7ccc0294a21bb840fb53');
    console.log("Admin User:", admin);
  } catch (err) {
    console.error("Error checking admin user:", err);
  } finally {
    mongoose.connection.close();
  }
};

checkAdminUser();