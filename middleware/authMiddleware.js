module.exports = function isAuthenticated(req, res, next) {
  console.log("🔹 Checking Authentication");
  console.log("🔍 req.originalUrl:", req.originalUrl);
  console.log("🔍 req.path:", req.path);
  console.log("🔍 req.session:", req.session);
  console.log("🔍 req.user:", req.user);

  if (req.isAuthenticated() && req.user) {
    console.log("✅ User authenticated:", req.user._id);
    return next();
  }

  console.error("❌ Authentication failed!");

  if (req.originalUrl.startsWith("/api/")) {
    console.log("Returning 401 for API request:", req.originalUrl);
    return res.status(401).json({ message: "Unauthorized" });
  }

  console.log("Redirecting to /login for non-API request:", req.originalUrl);
  return res.redirect("/login");
};