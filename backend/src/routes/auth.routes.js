const express = require("express");
const { registerUser, loginUser, me } = require("../controllers/auth.controller");
const { requireAuth } = require("../middlewares/auth.middleware");
const { rateLimit } = require("../middlewares/rate-limit.middleware");

const router = express.Router();

// 10 auth attempts per minute per IP
const authLimiter = rateLimit({ windowMs: 60000, max: 10 });

router.post("/register", authLimiter, registerUser);
router.post("/login", authLimiter, loginUser);
router.get("/me", requireAuth, me);

module.exports = router;
