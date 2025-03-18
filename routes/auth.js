const express = require("express");
const passport = require("passport");
const User = require("../models/User");
const isAuthenticated = require("../middleware/authMiddleware");
const multer = require("multer");
const { storage } = require('../config/cloudinary');
const upload = multer({ storage });
const { google } = require("googleapis");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const LocalStrategy = require("passport-local").Strategy;
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
          callbackURL: googleRedirectUri,
          scope: ["profile", "email"], 
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            let user = await User.findOne({ googleId: profile.id });
    
            if (!user) {
              user = new User({
                googleId: profile.id,
                name: profile.displayName,
                email: profile.emails[0].value,
                profilePicture: profile.photos[0].value,
                accessToken,
                refreshToken,
                scopes: ["profile", "email"], // ✅ Store granted scopes
              });
              await user.save();
            } else {
              user.accessToken = accessToken;
              user.refreshToken = refreshToken;
              await user.save();
            }
    
            return done(null, user._id.toString());
          } catch (error) {
            return done(error, null);
          }
        }
      )
    );
    

passport.serializeUser((user, done) => {
  console.log("🟢 Serializing User ID:", user._id.toString());
  done(null, user._id.toString());
});

// Deserialize user by fetching from DB
passport.deserializeUser(async (id, done) => {
  console.log("🟢 Deserializing User ID:", id);
  try {
    const user = await User.findById(id).select("-password"); // Exclude password
    if (!user) {
      console.log("❌ User not found for ID:", id);
      return done(null, false);
    }
    console.log("🟢 User deserialized:", user._id);
    done(null, user);
  } catch (error) {
    console.error("❌ Error deserializing user:", error);
    done(error, null);
  }
});

// Local Strategy
passport.use(
  new LocalStrategy(
    { usernameField: "email", passwordField: "password" },
    async (email, password, done) => {
      try {
        console.log("🔵 Local Strategy Hit!");
        const user = await User.findOne({ email });
        if (!user) {
          console.log("❌ No user found for email:", email);
          return done(null, false, { message: "Incorrect email or password" });
        }
        if (!user.password) {
          console.log("❌ User has no password (likely Google auth):", email);
          return done(null, false, { message: "Use Google login instead" });
        }
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
          console.log("❌ Password mismatch for:", email);
          return done(null, false, { message: "Incorrect email or password" });
        }
        console.log("🟢 Local user authenticated:", user._id);
        return done(null, user); // Pass full user object to serialize
      } catch (error) {
        console.error("❌ Error in Local Strategy:", error);
        return done(error);
      }
    }
  )
);

router.get("/users", async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Error fetching users", error });
  }
});

router.get(
  "/google/additional-scopes",
  passport.authenticate("google", {
    scope: ["https://www.googleapis.com/auth/gmail.modify"], // ✅ Ask for Gmail access only when required
    accessType: "offline",
    prompt: "consent",
  })
);



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
    const isGoogleLogin = !!req.user.googleId;

    // ✅ Check if Gmail API access was granted
    const hasGmailAccess = req.user.scopes && req.user.scopes.includes("https://www.googleapis.com/auth/gmail.modify");

    return res.json({
      authenticated: true,
      isGoogleLogin: isGoogleLogin,
      hasGmailAccess: hasGmailAccess, // ✅ Only enable Gmail features if granted
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
router.post(
  "/login",
  passport.authenticate("local", { failureRedirect: "/login" }),
  async (req, res) => {
    try {
      console.log("🔵 Login Route Hit!");
      console.log("🔹 req.user:", req.user ? req.user._id : "No user");
      console.log("🔹 req.session before save:", req.session);

      req.session.user = req.user; // Optional, but ensure consistency

      req.session.save((err) => {
        if (err) {
          console.error("❌ Error saving session:", err);
          return res.status(500).json({ message: "Session save failed" });
        }
        console.log("✅ Session saved successfully!");
        console.log("🔹 req.session after save:", req.session);
        res.json({ message: "Login successful", user: req.user });
      });
    } catch (error) {
      console.error("❌ Login error:", error);
      res.status(500).json({ message: "Login failed", error });
    }
  }
);

// /me route (example, ensure it uses isAuthenticated)
router.get("/me", async (req, res) => {
  console.log("🔵 /me Route Hit!");
  console.log("🔹 req.session:", req.session);
  console.log("🔹 req.user:", req.user);

  if (!req.session.passport || !req.session.passport.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = await User.findById(req.session.passport.user).select("-password");
  if (!user) return res.status(401).json({ message: "User not found" });

  req.user = user; // Manually attach user

  res.json({ user });
});

// ✅ Logout Route
router.post("/logout", isAuthenticated,(req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ message: "Logout error" });
    res.json({ message: "Logged out successfully" });
  });
});


module.exports = router;
