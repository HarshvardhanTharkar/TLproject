// Firebase Functions v2 + Express API

const { setGlobalOptions } = require("firebase-functions/v2");
const { onRequest } = require("firebase-functions/v2/https");
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");

// Initialize Firebase Admin (only once)
if (!admin.apps.length) {
  admin.initializeApp();
}

// Limit instances for cost control
setGlobalOptions({ maxInstances: 10 });

// Create Express app
const app = express();

// Middleware
app.use(cors({ origin: true })); // allow all origins
app.use(express.json()); // parse JSON requests

// ✅ Test route
app.get("/hello", (req, res) => {
  res.send("Hello from Firebase Functions API!");
});

// ✅ Import and mount API routes
const apiRoutes = require("./routes/api");
app.use("/api", apiRoutes);

// Export as "api" → must match firebase.json rewrites
exports.api = onRequest(app);
