const admin = require("firebase-admin");

// Middleware to verify Firebase Auth token
async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).send("Unauthorized: No token provided");
  }

  const idToken = authHeader.split("Bearer ")[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken; // attach user data to request
    next();
  } catch (error) {
    console.error("Token verification failed:", error);
    return res.status(403).send("Unauthorized: Invalid token");
  }
}

module.exports = verifyToken;
