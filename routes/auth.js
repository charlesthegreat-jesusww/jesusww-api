"use strict";

const express = require("express");
const { OAuth2Client } = require("google-auth-library");

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/* =========================================================
   GOOGLE LOGIN
   ========================================================= */
router.post("/google/login", async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        ok: false,
        message: "Missing Google credential"
      });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();

    const user = {
      provider: "google",
      id: payload.sub,
      name: payload.name || "",
      email: payload.email || "",
      picture: payload.picture || ""
    };

    req.session.user = user;

    res.json({ ok: true, user });
  } catch (err) {
    console.error("Google login error:", err.message);

    res.status(401).json({
      ok: false,
      message: "Google authentication failed"
    });
  }
});

/* =========================================================
   MICROSOFT LOGIN
   ========================================================= */
router.post("/microsoft/login", async (req, res) => {
  try {
    const { account, idToken } = req.body;

    if (!account || !idToken) {
      return res.status(400).json({
        ok: false,
        message: "Missing Microsoft account or token"
      });
    }

    const user = {
      provider: "microsoft",
      id: account.homeAccountId || account.localAccountId || account.username,
      name: account.name || "Microsoft User",
      email: account.username || "",
      picture: ""
    };

    req.session.user = user;

    res.json({
      ok: true,
      user
    });
  } catch (err) {
    console.error("Microsoft login error:", err.message);

    res.status(401).json({
      ok: false,
      message: "Microsoft authentication failed"
    });
  }
});

/* =========================================================
   HELPER FOR LEGACY REDIRECT FLOWS
   ========================================================= */
function buildReturnUrl(returnTo, params) {
  const url = new URL(returnTo);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return url.toString();
}

/* =========================================================
   MICROSOFT TEST REDIRECT
   Keep this only as fallback/testing.
   Real Microsoft login uses POST /microsoft/login.
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
