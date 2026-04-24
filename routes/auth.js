"use strict";

const express = require("express");
const router = express.Router();

function buildReturnUrl(returnTo, params) {
  const url = new URL(returnTo);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return url.toString();
}

/* =========================================================
   TEST LOGIN: GOOGLE
   ========================================================= */
router.get("/google/start", (req, res) => {
  const returnTo = req.query.returnTo || "https://www.jesusww.com/";

  req.session.user = {
    provider: "google",
    name: "Test Google User",
    email: "google@test.com"
  };

  const redirectUrl = buildReturnUrl(returnTo, {
    auth_provider: "google",
    auth_name: "Test Google User",
    auth_email: "google@test.com",
    auth_token: "123"
  });

  console.log("Google redirecting to:", redirectUrl);
  res.redirect(redirectUrl);
});

/* =========================================================
   TEST LOGIN: MICROSOFT
   ========================================================= */
router.get("/microsoft/start", (req, res) => {
  const returnTo = req.query.returnTo || "https://www.jesusww.com/";

  req.session.user = {
    provider: "microsoft",
    name: "Test Microsoft User",
    email: "microsoft@test.com"
  };

  const redirectUrl = buildReturnUrl(returnTo, {
    auth_provider: "microsoft",
    auth_name: "Test Microsoft User",
    auth_email: "microsoft@test.com",
    auth_token: "123"
  });

  console.log("Microsoft redirecting to:", redirectUrl);
  res.redirect(redirectUrl);
});

/* =========================================================
   APPLE PLACEHOLDER
   ========================================================= */
router.get("/apple/start", (req, res) => {
  res.status(501).send("Apple login not connected yet.");
});

/* =========================================================
   LOGOUT
   ========================================================= */
router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("jw.sid");
    res.json({ ok: true, message: "Logged out" });
  });
});

module.exports = router;
