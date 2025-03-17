module.exports = function isAuthenticated(req, res, next) {
  console.log("🔹 Checking Authentication");
  console.log("🔍 req.session:", req.session);
  console.log("🔍 req.user:", req.user);

  if (req.isAuthenticated() && req.user) {
    return next();
  }

  console.error("❌ Authentication failed!");
  
  // If it's an API request (AJAX/Fetch), send JSON response
  if (req.xhr || req.headers.accept.indexOf("json") > -1) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // If it's a normal request, redirect to login page
  return res.redirect("/login");
};
