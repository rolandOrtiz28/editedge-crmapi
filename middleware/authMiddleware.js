

  module.exports = function isAuthenticated  (req, res, next) {
    console.log("🔹 Checking Authentication");
    console.log("🔍 req.session:", req.session);
    console.log("🔍 req.user:", req.user);
  
    if (req.isAuthenticated() && req.user) {
      return next();
    }
    
    console.error("❌ Authentication failed!");
    return res.status(401).json({ message: "Unauthorized" });
  };
  