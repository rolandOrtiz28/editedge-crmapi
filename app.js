require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const path = require("path");
const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session);
const mongoose = require("mongoose");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const xss = require("xss-clean");
const mongoSanitize = require("express-mongo-sanitize");
const cors = require("cors");
const passport = require("passport");
const { Server } = require("socket.io");

const User = require("./models/User");
const isAuthenticated = require("./middleware/authMiddleware");

// Routes
const leadsRoutes = require("./routes/leads");
const authRoutes = require("./routes/auth");
const contactRoutes = require("./routes/contacts");
const dealsRoutes = require("./routes/deals");
const tasksRoutes = require("./routes/tasks");
const commonRoutes = require("./routes/common");
const salesRoutes = require("./routes/sales");
const messagesRoutes = require("./routes/messages");
const instagramRoutes = require("./routes/instagram").router;
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
  process.env.NODE_ENV === "production" ? process.env.DB_URL : process.env.DB_URL_DEV;
const secret = process.env.SESSION_SECRET || "editedgemultimedia";

// CSP URLs (unchanged)
const frameSrcUrls = [
  "'self'",
  "https://*.google.com",
  "https://*.youtube.com",
  "https://*.vimeo.com",
  "https://calendly.com",
  "http://localhost:8080",
  "https://*.editedgemultimedia.com",
];
const scriptSrcUrls = [
  "'self'",
  "'unsafe-inline'",
  "'unsafe-eval'",
  "https://*.google.com",
  "https://*.googletagmanager.com",
  "https://*.google-analytics.com",
  "https://*.gstatic.com",
  "https://*.cloudflare.com",
  "https://*.jsdelivr.net",
  "https://*.unpkg.com",
  "https://calendly.com",
];
const styleSrcUrls = [
  "'self'",
  "'unsafe-inline'",
  "https://*.googleapis.com",
  "https://*.cloudflare.com",
  "https://*.jsdelivr.net",
  "https://calendly.com",
];
const connectSrcUrls = [
  "'self'",
  "https://*.google-analytics.com",
  "https://*.googletagmanager.com",
  "https://*.gstatic.com",
  "https://*.doubleclick.net",
  "http://localhost:8080",
  "http://localhost:3000",
  "https://*.editedgemultimedia.com",
  "wss://*.editedgemultimedia.com",
  "ws://localhost:3000",
];
const imgSrcUrls = [
  "'self'",
  "data:",
  "https://*.google.com",
  "https://*.googleapis.com",
  "https://*.gstatic.com",
  "https://*.cloudinary.com",
  "https://*.editedgemultimedia.com",
];
const fontSrcUrls = ["'self'", "https://*.gstatic.com", "https://*.googleapis.com"];
const mediaSrcUrls = ["'self'", "https://*.cloudinary.com"];

// Connect to MongoDB first
mongoose.connect(dbUrl, { serverSelectionTimeoutMS: 5000 })
  .then(() => console.log("✅ Database Connected"))
  .catch((err) => console.error("MongoDB Connection Error:", err));

// Session Store
const store = new MongoDBStore({
  uri: dbUrl,
  collection: "sessions",
  touchAfter: 24 * 3600,
});
store.on("error", (error) => console.error("❌ Session store error:", error));

const sessionConfig = {
  secret,
  name: "_editEdge",
  resave: false,
  saveUninitialized: false,
  store,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // Ensure `secure` is only enabled in production
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // Adjust `sameSite`
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  },
};

app.use(session(sessionConfig));
console.log("🟢 Session middleware initialized");

app.use((req, res, next) => {
  // console.log("🔍 Session ID:", req.sessionID);
  // console.log("🔍 Session Data Before Route:", req.session);
  next();
});


const allowedOrigins = [
  "http://localhost:8080",
  "https://crm.editedgemultimedia.com",
  "https://crmapi.editedgemultimedia.com",
  "http://localhost:3000"
];

app.use((req, res, next) => {
  // console.log("🔍 CORS Middleware Triggered for:", req.headers.origin);
  next();
});

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, origin); // Use the requested origin instead of "*"
      } else {
        console.warn(`❌ CORS Blocked: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Handle Preflight Requests Manually
app.options("*", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  return res.sendStatus(204);
});


// Passport Initialization
app.use(passport.initialize());
console.log("🟢 Passport initialized");
app.use(passport.session());
console.log("🟢 Passport session initialized");

app.use((req, res, next) => {
  console.log("🔍 Session Data After Passport:", req.session);
  console.log("🔍 User:", req.user);
  next();
});

// Security Middleware
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

const isProduction = process.env.NODE_ENV === "production";
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again later.",
});
if (isProduction) app.use(limiter);

axios.defaults.withCredentials = true;


app.use(xss());
app.use(mongoSanitize());

// Other Middleware
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
app.use(express.static(path.join(__dirname, "public"), { etag: true, lastModified: true }));
app.set("view engine", "ejs");
app.set("trust proxy", 1);

app.use((req, res, next) => {
  console.log(`🔍 Incoming Request: ${req.method} ${req.path}`);
  console.log("🔍 Headers:", req.headers);
  console.log("🔍 Query Params:", req.query);
  console.log("🔍 Body:", req.body);
  next();
});

// Start Server
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT} in ${process.env.NODE_ENV || "development"} mode`);
});

// Socket.io Initialization (moved before routes)
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:8080", "https://crm.editedgemultimedia.com"],
    methods: ["GET", "POST"],
  },
    	    
});
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);
  socket.on("joinRoom", (userId) => {
    socket.join(userId.toString());
    console.log(`User ${userId} joined room`);
  });
  socket.on("newMessage", (message) => {
    console.log("New Message Received:", message);
    io.emit("messageReceived", message);
  });
  socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.id);
  });
});

// Middleware to attach io to req
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/leads", isAuthenticated, leadsRoutes);
app.use("/api/contacts", isAuthenticated, contactRoutes);
app.use("/api/deals", isAuthenticated, dealsRoutes);
app.use("/api/tasks", isAuthenticated, tasksRoutes);
app.use("/api/sales", isAuthenticated, salesRoutes);
app.use("/api/messages", isAuthenticated, messagesRoutes(io));
app.use("/api/instagram", instagramRoutes);
app.use("/api/emails", isAuthenticated, emailRoutes);
app.use("/api/templates", isAuthenticated, templateRoutes);
app.use("/api/dashboard", isAuthenticated, dashboardRoutes);
app.use("/api/bulk-email", isAuthenticated, bulkEmailRoutes);
app.use("/api/groups", isAuthenticated, groupsRoutes);
app.use("/api/profile", isAuthenticated, profileRoutes);
app.use("/api/notifications", isAuthenticated, notificationsRoutes);
app.use("/api/settings", isAuthenticated, settingsRoutes);
app.use("/api/meetings", isAuthenticated, meetingsRoutes);
app.use("/api/business-email", isAuthenticated, businessEmailRoutes);
app.use("/api", isAuthenticated, commonRoutes);

// Error Handling
app.use((req, res) => res.status(404).send("Page not found"));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something went wrong!");
});

// Graceful Shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received: closing server");
  server.close(() => {
    mongoose.connection.close();
    console.log("Server closed");
    process.exit(0);
  });
});

require("./scheduler");

module.exports = { app, io };