"use strict";

/*
  =========================================================
  JESUSWW AUTH SERVER
  FINAL VERSION WITH MANUAL CORS + DEBUG LOGGING
  =========================================================
*/

require("dotenv").config();

const express = require("express");
const session = require("express-session");

const authRoutes = require("./routes/auth");
const sessionRoutes = require("./routes/session");

const app = express();

/* =========================================================
   ENV
   ========================================================= */
const PORT = process.env.PORT || 3000;
const NODE_ENV = "production";
const SESSION_SECRET =
  process.env.SESSION_SECRET || "change_this_in_env";

/* =========================================================
   TRUST PROXY
   Required for GoDaddy / proxy / HTTPS environments
   ========================================================= */
app.set("trust proxy", 1);

/* =========================================================
   CORS
   Manual headers to avoid middleware issues on hosting
   ========================================================= */
const allowedOrigins = [
  "https://www.jesusww.com",
  "https://jesusww.com"
];

// Debug so you know the latest code is actually running
console.log("CORS VERSION: 3 ACTIVE");

app.use((req, res, next) => {
  const origin = req.headers.origin;

  // Debug incoming origin
  console.log("Incoming Origin:", origin);

  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }

  // Handle browser preflight requests
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

/* =========================================================
   BODY PARSERS
   ========================================================= */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =========================================================
   SESSION
   Cross-origin cookies for frontend/backend on different origins
   ========================================================= */
app.use(
  session({
    name: "jw.sid",
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 1000 * 60 * 60 * 24 * 7
    }
  })
);

/* =========================================================
   ROOT ROUTE
   Required for GoDaddy health check
   ========================================================= */
app.get("/", (req, res) => {
  res.status(200).send("JESUSWW API OK");
});

/* =========================================================
   HEALTH CHECK
   ========================================================= */
app.get("/health", (req, res) => {
  res.json({
    ok: true,
    message: "JESUSWW auth server running"
  });
});

/* =========================================================
   ROUTES
   ========================================================= */
app.use("/auth", authRoutes);
app.use("/auth", sessionRoutes);

/* =========================================================
   404 HANDLER
   ========================================================= */
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    message: "Route not found"
  });
});

/* =========================================================
   ERROR HANDLER
   ========================================================= */
app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", err.message);

  res.status(err.status || 500).json({
    ok: false,
    message: err.message || "Internal server error"
  });
});

/* =========================================================
   START SERVER
   ========================================================= */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`JESUSWW server running on port ${PORT}`);
  console.log("Allowed origins:", allowedOrigins);
  console.log(`Mode: ${NODE_ENV}`);
});