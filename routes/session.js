"use strict";

const express = require("express");
const router = express.Router();

/* =========================================================
   SESSION CHECK
   Returns the current signed-in user from the session
   ========================================================= */
router.get("/session", (req, res) => {
  res.json({
    ok: true,
    user: req.session.user || null
  });
});

module.exports = router;
