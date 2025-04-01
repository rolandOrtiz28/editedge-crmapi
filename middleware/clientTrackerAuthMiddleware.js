const jwt = require('jsonwebtoken');
const Client = require('../models/Client');
const User = require('../models/User');

// Middleware for client authentication (using JWT)
const isClientAuthenticated = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]; // Expecting "Bearer <token>"
  console.log("🔍 Token:", token);
  if (!token) {
    console.log("❌ No token provided");
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.SESSION_SECRET || 'editedgemultimedia');
    console.log("🔍 Decoded Token:", decoded);
    if (decoded.role === 'client') {
      const client = await Client.findById(decoded.id);
      console.log("🔍 Client Lookup Result:", client);
      if (!client || client.role !== 'client') {
        console.log("❌ Invalid client");
        return res.status(401).json({ message: 'Unauthorized: Invalid client' });
      }
      req.client = client; // Attach client to request
      req.user = null; // Ensure req.user is null for clients
    } else if (decoded.role === 'admin') {
      const user = await User.findById(decoded.id);
      console.log("🔍 Admin User Lookup Result:", user);
      if (!user || user.role !== 'admin') {
        console.log("❌ Invalid admin user");
        return res.status(401).json({ message: 'Unauthorized: Invalid admin user' });
      }
      req.user = user; // Attach user to request for admins
      req.client = null; // Ensure req.client is null for admins
    } else {
      console.log("❌ Invalid role:", decoded.role);
      return res.status(401).json({ message: 'Unauthorized: Invalid role' });
    }
    next();
  } catch (err) {
    console.log("❌ Token verification failed:", err.message);
    return res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }
};

// Restrict to client role
const isClient = (req, res, next) => {
  if (!req.client || req.client.role !== 'client') {
    console.log("❌ Forbidden: Client access only");
    return res.status(403).json({ message: 'Forbidden: Client access only' });
  }
  next();
};

// Restrict to admin role (for client tracker app, using JWT)
const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    console.log("❌ Forbidden: Admin access only");
    return res.status(403).json({ message: 'Forbidden: Admin access only' });
  }
  next();
};

module.exports = { isClientAuthenticated, isClient, isAdmin };