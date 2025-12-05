const express = require("express");
const User = require("../models/User");
const auth = require("../middlewares/authMiddleware");

const router = express.Router();

// Get all students (for teacher or HOD)
router.get("/", auth(["teacher", "hod"]), async (req, res) => {
  try {
    const { role } = req.query; // e.g. /api/users?role=student
    let filter = {};
    if (role) filter.role = role;

    const users = await User.find(filter).select("-password"); // hide password
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
