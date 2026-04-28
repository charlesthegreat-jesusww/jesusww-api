"use strict";

const express = require("express");
const { OAuth2Client } = require("google-auth-library");
const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const MICROSOFT_AUTHORITY = "https://login.microsoftonline.com/common";
const MICROSOFT_AUTHORIZE_URL = `${MICROSOFT_AUTHORITY}/oauth2/v2.0/authorize`;
const MICROSOFT_TOKEN_URL = `${MICROSOFT_AUTHORITY}/oauth2/v2.0/token`;

const microsoftJwks = jwksClient({
  jwksUri: `${MICROSOFT_AUTHORITY}/discovery/v2.0/keys`
});

function getMicrosoftSigningKey(header, callback) {
  microsoftJwks.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

function buildReturnUrl(returnTo, params) {
  const url = new URL(returnTo);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value || "");
  });

  return url.toString();
}

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
   MICROSOFT START - REAL LOGIN
   ========================================================= */
router.get("/microsoft/start", (req, res) => {
  const returnTo = req.query.returnTo || process.env.CLIENT_ORIGIN || "https://www.jesusww.com/";

  req.session.microsoftReturnTo = returnTo;

  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID,
    response_type: "code",
    redirect_uri: process.env.MICROSOFT_REDIRECT_URI,
    response_mode: "query",
    scope: "openid profile email User.Read",
    prompt: "select_account"
  });

  res.redirect(`${MICROSOFT_AUTHORIZE_URL}?${params.toString()}`);
});

/* =========================================================
   MICROSOFT CALLBACK - REAL LOGIN
   ========================================================= */
router.get("/microsoft/callback", async (req, res) => {
  try {
    const { code, error, error_description } = req.query;

    if (error) {
      console.error("Microsoft callback error:", error, error_description);
      return res.status(401).send(`Microsoft login failed: ${error_description || error}`);
    }

    if (!code) {
      return res.status(400).send("Missing Microsoft authorization code.");
    }

    const tokenBody = new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET,
      code,
      redirect_uri: process.env.MICROSOFT_REDIRECT_URI,
      grant_type: "authorization_code"
    });

    const tokenResponse = await fetch(MICROSOFT_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: tokenBody.toString()
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.id_token) {
      console.error("Microsoft token error:", tokenData);
      return res.status(401).send("Microsoft token exchange failed.");
    }

    const decodedUser = await new Promise((resolve, reject) => {
      jwt.verify(
  tokenData.id_token,
  getMicrosoftSigningKey,
  {
    audience: process.env.MICROSOFT_CLIENT_ID,
    algorithms: ["RS256"]
  },
        (err, decoded) => {
          if (err) reject(err);
          else resolve(decoded);
        }
      );
    });

    const user = {
      provider: "microsoft",
      id: decodedUser.sub || decodedUser.oid || "",
      name: decodedUser.name || decodedUser.preferred_username || "Microsoft User",
      email: decodedUser.email || decodedUser.preferred_username || "",
      picture: ""
    };

    req.session.user = user;

    const returnTo =
      req.session.microsoftReturnTo ||
      process.env.CLIENT_ORIGIN ||
      "https://www.jesusww.com/";

    delete req.session.microsoftReturnTo;

    const redirectUrl = buildReturnUrl(returnTo, {
      auth_provider: user.provider,
      auth_name: user.name,
      auth_email: user.email,
      auth_token: "microsoft"
    });

    res.redirect(redirectUrl);
  } catch (err) {
    console.error("Microsoft callback failed:", err);
    res.status(500).send("Microsoft authentication failed.");
  }
});

/* =========================================================
   OPTIONAL MICROSOFT POST LOGIN
   Keep only if your old frontend still uses MSAL popup.
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
