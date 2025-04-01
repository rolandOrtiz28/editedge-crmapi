require('dotenv').config(); // Load environment variables from .env file
const mongoose = require('mongoose');
const Client = require('../models/Client');

const dbUrl = process.env.NODE_ENV === "production" ? process.env.DB_URL : process.env.DB_URL_DEV;

mongoose.connect(dbUrl, { serverSelectionTimeoutMS: 5000 })
  .then(() => console.log("✅ Database Connected"))
  .catch((err) => console.error("MongoDB Connection Error:", err));

const addClient = async () => {
  try {
    const client = new Client({
      name: "Test Client",
      email: "testclient@example.com",
      password: "password123", // Will be hashed by the pre-save hook
      role: "client",
      status: "Active",
    });
    await client.save();
    console.log("Client created:", client);
  } catch (err) {
    console.error("Error creating client:", err);
  } finally {
    mongoose.connection.close();
  }
};

addClient();