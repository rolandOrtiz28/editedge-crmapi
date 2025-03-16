require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const path = require("path");
const OpenAI = require("openai");
const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session);
const mongoose = require("mongoose");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const xss = require("xss-clean");
const mongoSanitize = require("express-mongo-sanitize");
const cors = require("cors");
const passport = require("./config/passport");
const { Server } = require("socket.io");
const LocalStrategy = require("passport-local").Strategy;
const User = require("./models/User")
const isAuthenticated = require("./middleware/authMiddleware");



// routes
const leadsRoutes = require("./routes/leads");
const authRoutes = require("./routes/auth");
const contactRoutes = require("./routes/contacts");
const dealsRoutes = require("./routes/deals");
const tasksRoutes = require("./routes/tasks");
const commonRoutes = require("./routes/common");
const salesRoutes = require("./routes/sales");
const messagesRoutes = require("./routes/messages");
const instagramRoutes = require("./routes/instagram");
const emailRoutes = require("./routes/email");
const templateRoutes = require("./routes/templates");
const dashboardRoutes = require("./routes/dashboard");
const bulkEmailRoutes = require("./routes/bulkEmail");
const groupsRoutes = require("./routes/groups");
const profileRoutes = require("./routes/profile");
const notificationsRoutes = require("./routes/notification");
const settingsRoutes = require("./routes/settings");
const meetingsRoutes = require("./routes/meetings");
const businessEmailRoutes = require("./routes/businessEmail");



const app = express();

const PORT = process.env.PORT || 3000;

const dbUrl =
  process.env.NODE_ENV === "production"
    ? process.env.DB_URL
    : process.env.DB_URL_DEV;

const secret = process.env.SESSION_SECRET || "editedgemultimedia";


// Content Security Policy URLs
const frameSrcUrls = [
  "https://js.stripe.com/",
  "https://www.sandbox.paypal.com/",
  "https://www.facebook.com/",
  "https://my.spline.design/",
  "https://drive.google.com/",
  "https://accounts.google.com/",
];

const scriptSrcUrls = [
  "https://stackpath.bootstrapcdn.com/",
  "https://cdn.jsdelivr.net/",
  "https://cdnjs.cloudflare.com/",
  "https://unpkg.com/",
  "https://kit.fontawesome.com/",
  "https://unpkg.com/@splinetool/viewer@1.9.48/build/spline-viewer.js",
  "https://unpkg.com/@splinetool/viewer@1.9.48/build/process.js",
  "https://api.tiles.mapbox.com/",
  "https://api.mapbox.com/",
  "https://code.jquery.com/",
  "https://cdn.quilljs.com/",
  "https://cdn.tailwindcss.com/",
  "https://cdn.ckeditor.com/",
];

const styleSrcUrls = [
  "https://cdn.jsdelivr.net/",
  "https://fonts.googleapis.com/",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css",
  "https://cdnjs.cloudflare.com/",
  "https://kit-free.fontawesome.com/",
  "https://api.mapbox.com/",
  "https://api.tiles.mapbox.com/",
  "https://cdn.quilljs.com/",
];

const connectSrcUrls = [
  "https://unsplash.com/",
  "https://prod.spline.design/",
  "https://unpkg.com/",
  "https://ka-f.fontawesome.com/",
  "https://fonts.gstatic.com/",
  "https://api.mapbox.com/",
  "https://a.tiles.mapbox.com/",
  "https://b.tiles.mapbox.com/",
  "https://events.mapbox.com/",
  "blob:",
];

const imgSrcUrls = [
  "https://images.unsplash.com/",
  "https://app.spline.design/_assets/_icons/icon_favicon32x32.png",
  "https://cdn.jsdelivr.net/",
  "https://kit-free.fontawesome.com/",
  "https://cdnjs.cloudflare.com/",
  "https://res.cloudinary.com/",
  "https://media.istockphoto.com/",
  "https://plus.unsplash.com/",
  "https://mdbcdn.b-cdn.net/",
];

const fontSrcUrls = [
  "https://fonts.gstatic.com/",
  "https://cdnjs.cloudflare.com/",
  "https://cdn.jsdelivr.net/",
  "https://ka-f.fontawesome.com/",
];

const mediaSrcUrls = [
  "'self'",
  "blob:",
  "https://res.cloudinary.com/",
  "https://drive.google.com/",
  "https://www.google.com/",
  "https://www.dropbox.com/",
  "https://dl.dropboxusercontent.com/",
];

app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'", "blob:"],
      formAction: ["'self'"],
      frameSrc: ["'self'", ...frameSrcUrls],
      connectSrc: ["'self'", ...connectSrcUrls],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", ...scriptSrcUrls],
      scriptSrcElem: ["'self'", "'unsafe-inline'", "'unsafe-eval'", ...scriptSrcUrls],
      styleSrc: ["'self'", "'unsafe-inline'", ...styleSrcUrls],
      styleSrcElem: ["'self'", "'unsafe-inline'", ...styleSrcUrls],
      workerSrc: ["'self'", "blob:"],
      objectSrc: [],
      imgSrc: ["'self'", "blob:", "data:", ...imgSrcUrls],
      fontSrc: ["'self'", ...fontSrcUrls, "data:"],
      mediaSrc: [...mediaSrcUrls],
      "script-src-attr": ["'unsafe-inline'"], 
    },
  })
);
const isProduction = process.env.NODE_ENV === 'production';

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Default to production value
    message: "Too many requests from this IP, please try again later."
});

// Apply limiter only in production
if (isProduction) {
    app.use(limiter);
}

axios.defaults.withCredentials = true;


const allowedOrigins = [
  "http://localhost:8080",  // Local development frontend
   "https://crm.editedgemultimedia.com",
  "https://crmapi.editedgemultimedia.com"
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.error(`CORS rejected origin: ${origin}`);
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(xss());
app.use(mongoSanitize());

// Database Connection
mongoose.connect(dbUrl, {
    serverSelectionTimeoutMS: 5000
}).catch(err => console.error("MongoDB Connection Error:", err));

const db = mongoose.connection;
db.on("error", console.error.bind(console, "Connection error:"));
db.once("open", () => {
    console.log("✅ Database Connected");
});

require("./scheduler");


const store = new MongoDBStore({
  uri: dbUrl,
  collection: "sessions",
  touchAfter: 24 * 3600, // time period in seconds
});

store.on("error", function (error) {
  console.error("Session store error:", error);
});

const sessionConfig = {
  secret,
  name: "_editEdge",
  resave: false,
  saveUninitialized: false,
  store: store, // Fix applied here
  cookie: {
      httpOnly: true,
      secure: false, // Change to true if using HTTPS
      expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
      maxAge: 1000 * 60 * 60 * 24 * 7,
  },
};
console.log("🟢 Session middleware initialized");
app.use(mongoSanitize());
app.use(session(sessionConfig));

passport.serializeUser((user, done) => {
  console.log("🔹 Serializing User:", user._id);
  done(null, user._id); // Store only user ID in session
});

passport.deserializeUser(async (id, done) => {
  console.log("🔹 Deserializing User ID:", id);
  try {
    const user = await User.findById(id).select("-password"); // Exclude password
    if (!user) {
      console.log("❌ User not found during deserialization.");
      return done(null, false);
    }
    console.log("✅ User deserialized:", user.name);
    done(null, user);
  } catch (error) {
    console.error("❌ Error deserializing user:", error);
    done(error);
  }
});
app.use(passport.initialize());  // ✅ Must be first
console.log("🟢 Passport initialized");
app.use(passport.session());
console.log("🟢 Passport session initialized");

// Log session and user for debugging
app.use((req, res, next) => {
  console.log("🔍 Middleware - Session:", req.session);
  console.log("🔍 Middleware - req.user:", req.user || "No user");
  next();
});

passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
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
        return done(null, user._id.toString());
      } catch (error) {
        console.error("❌ Error in Local Strategy:", error);
        return done(error);
      }
    }
  )
);

// Middleware
app.use(bodyParser.json({ limit: "50mb" })); // Increase JSON limit
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
app.use(express.static(path.join(__dirname, "public"), {
    etag: true,
    lastModified: true
}));
app.set("view engine", "ejs");
app.set("trust proxy", 1);

// Logging
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} - ${req.ip}`);
    next();
});

app.use((req, res, next) => {
  req.io = io;
  next();
});

// Start Server
const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});

// Attach Socket.io to the existing server
const io = new Server(server, {
  cors: {
      origin: "http://localhost:8080", // Adjust this to your frontend URL
      methods: ["GET", "POST"]
  }
});

// Handle Socket.io Connection
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Join a room based on user ID
  socket.on("joinRoom", (userId) => {
    socket.join(userId.toString());
    console.log(`User ${userId} joined room`);
  });

  // Listen for new messages (existing)
  socket.on("newMessage", (message) => {
    console.log("New Message Received:", message);
    io.emit("messageReceived", message); // Broadcast message to all clients
  });

  // Disconnect event
  socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.id);
  });
});

app.use("/api/leads",isAuthenticated, leadsRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/contacts",isAuthenticated, contactRoutes);
app.use("/api/deals",isAuthenticated, dealsRoutes);
app.use("/api/tasks",isAuthenticated, tasksRoutes);
app.use("/api",isAuthenticated, commonRoutes);
app.use("/api/sales",isAuthenticated, salesRoutes);
app.use("/api/messages",isAuthenticated, messagesRoutes(io));
app.use("/api/instagram",isAuthenticated, instagramRoutes(io));
app.use("/api/emails",isAuthenticated, emailRoutes);
app.use("/api/templates",isAuthenticated, templateRoutes);
app.use("/api/dashboard",isAuthenticated, dashboardRoutes);
app.use("/api/bulk-email",isAuthenticated, bulkEmailRoutes);
app.use("/api/groups",isAuthenticated, groupsRoutes)
app.use("/api/profile",isAuthenticated, profileRoutes);
app.use("/api/notifications",isAuthenticated, notificationsRoutes);
app.use("/api/settings",isAuthenticated, settingsRoutes);
app.use("/api/meetings",isAuthenticated, meetingsRoutes);
app.use("/api/business-email",isAuthenticated, businessEmailRoutes);

// Error Handling
app.use((req, res) => res.status(404).send("Page not found"));
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send("Something went wrong!");
});

// Graceful Shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received: closing server');
  server.close(() => {
      mongoose.connection.close();
      console.log('Server closed');
      process.exit(0);
  });
});

module.exports = { app, io };