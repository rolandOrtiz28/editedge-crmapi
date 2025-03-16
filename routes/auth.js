const express = require("express");
const passport = require("passport");
const User = require("../models/User");
const isAuthenticated = require("../middleware/authMiddleware");
const multer = require("multer");
const { storage } = require('../config/cloudinary');
const upload = multer({ storage });
const { google } = require("googleapis");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
require("dotenv").config();

const router = express.Router();

const googleRedirectUri =
  process.env.NODE_ENV === "production"
    ? process.env.GOOGLE_REDIRECT_URI_PROD
    : process.env.GOOGLE_REDIRECT_URI_DEV;

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:googleRedirectUri,
      scope: ["profile", "email", "https://www.googleapis.com/auth/gmail.modify",],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log("🔵 Google Callback Hit!");
        console.log("🔹 Google ID:", profile.id);
        console.log("🔹 Google Email:", profile.emails[0].value);
        console.log("🔹 Access Token:", accessToken);
        console.log("🔹 Refresh Token:", refreshToken);

        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          console.log("🟠 User Not Found - Creating New User");
          user = new User({
            googleId: profile.id,
            name: profile.displayName,
            email: profile.emails[0].value,
            profilePicture: profile.photos[0].value,
            accessToken,
            refreshToken,
          });
          await user.save();
          console.log("🟢 New Google User Created:", user._id);
        } else {
          console.log("🟢 Existing User Found:", user._id);
          user.accessToken = accessToken;
          user.refreshToken = refreshToken;
          await user.save();
          console.log("🟢 User Tokens Updated:", user._id);
        }

        console.log("🔶 Passing to serializeUser:", user._id.toString());
        return done(null, user._id.toString());
      } catch (error) {
        console.error("❌ Error in Google Strategy:", error);
        return done(error, null);
      }
    }
  )
);

passport.serializeUser((userId, done) => {
  console.log("🟢 Serializing User ID:", userId);
  done(null, userId);
});

passport.deserializeUser(async (id, done) => {
  console.log("🟢 Deserializing User ID:", id, "Type:", typeof id);
  if (typeof id !== "string" || !id.match(/^[0-9a-fA-F]{24}$/)) {
    console.error("❌ Invalid ID format, full object received:", JSON.stringify(id, null, 2));
    return done(new Error("Invalid user ID format"), null);
  }
  try {
    const user = await User.findById(id);
    if (!user) {
      console.log("❌ User not found for ID:", id);
      return done(new Error("User not found"), null);
    }
    console.log("🟢 User deserialized:", user._id);
    done(null, user);
  } catch (error) {
    console.error("❌ Error deserializing user:", error);
    done(error, null);
  }
});

router.get("/users", async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Error fetching users", error });
  }
});


// ✅ Google OAuth Login
router.get("/google", passport.authenticate("google", { accessType: "offline", prompt: "consent" }));

// ✅ Google OAuth Callback
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/", session: true }),
  async (req, res) => {
    console.log("🔵 Google Callback Route Hit!");
    console.log("🔹 req.user:", req.user ? req.user._id : "No user");
    console.log("🔹 req.session before save:", req.session);

    if (!req.user && req.session.passport && req.session.passport.user) {
      console.log("🟠 req.user not set, fetching from session.passport.user");
      const user = await User.findById(req.session.passport.user);
      if (user) {
        req.user = user; // Manually attach user to request
        console.log("🟢 User manually attached to req.user:", user._id);
      }
    }

    if (!req.user) {
      console.error("❌ No user in request or session, redirecting to /");
      return res.redirect("/");
    }

    // Set tokens in session
    req.session.googleAccessToken = req.user.accessToken;
    req.session.googleRefreshToken = req.user.refreshToken;

    req.session.save((err) => {
      if (err) {
        console.error("❌ Error saving session:", err);
        return res.status(500).json({ error: "Session save failed" });
      }
      console.log("✅ Session saved successfully:", req.session);
      res.redirect("http://localhost:8080/dashboard");
    });
  }
);


// ✅ Logout Google Session
router.get("/google/logout", (req, res) => {
  req.logout(() => {
    req.session.destroy();
    res.json({ message: "Logged out from Google" });
  });
});

router.get("/check-google-session", (req, res) => {
  console.log("🔹 Checking Google session - User:", req.user ? req.user._id : "No user");
  console.log("🔹 Session:", req.session);

  if (req.isAuthenticated() && req.user) {
    const isGoogleLogin = !!req.user.googleId; // Check if googleId exists
    return res.json({
      authenticated: true,
      isGoogleLogin: isGoogleLogin,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
      },
      googleAccessToken: req.session.googleAccessToken || req.user.accessToken || null,
      googleRefreshToken: req.session.googleRefreshToken || req.user.refreshToken || null,
    });
  }

  res.json({ authenticated: false });
});

router.post("/upload-profile", isAuthenticated, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
  
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: "profile_pictures" },
          (error, result) => (error ? reject(error) : resolve(result))
        );
        uploadStream.end(req.file.buffer);
      });
  
      // ✅ Update User's Profile Picture
      req.user.profilePicture = result.secure_url;
      await req.user.save();
  
      res.json({ message: "Profile picture updated", url: result.secure_url });
    } catch (error) {
      console.error("Upload Error:", error);
      res.status(500).json({ message: "Error uploading profile picture", error });
    }
  });

// ✅ Register Route
router.post("/register", async (req, res) => {
  try {
    const { name,company, email, password, role, timezone } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const newUser = new User({ name, company, email, password, role, timezone });
    await newUser.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error registering user", error });
  }
});

// ✅ Login Route
router.post("/login", passport.authenticate("local"), async (req, res) => {
  try {
    req.session.user = req.user;
    
    req.session.save((err) => {
      if (err) {
        console.error("❌ Error saving session:", err);
        return res.status(500).json({ message: "Session save failed" });
      }
      console.log("✅ Session saved successfully!");
      res.json({ message: "Login successful", user: req.user });
    });

  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({ message: "Login failed", error });
  }
});

// ✅ Logout Route
router.post("/logout", isAuthenticated,(req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ message: "Logout error" });
    res.json({ message: "Logged out successfully" });
  });
});

// ✅ Get Current User
router.get("/me", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password"); // Exclude password
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: "Error fetching user data", error });
  }
});



module.exports = router;
