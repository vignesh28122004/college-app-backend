const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

exports.register = async (req, res) => {
  const { name, email, password, role, rollNumber } = req.body;

  try {
    // 1) Email must be unique
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // 2) Decide final roll number
    let finalRollNumber = rollNumber;

    if (role === "student") {
      // For students, rollNumber is required
      if (!finalRollNumber) {
        return res
          .status(400)
          .json({ error: "Roll Number is required for students" });
      }
    } else {
      // For teacher / hod, generate a unique fake rollNumber
      finalRollNumber = `NO-RN-${role}-${Date.now()}-${Math.floor(
        Math.random() * 1000
      )}`;
    }

    // 3) Hash password
    const hashed = await bcrypt.hash(password, 10);

    // 4) Save user with finalRollNumber
    const user = new User({
      name,
      email,
      password: hashed,
      role,
      rollNumber: finalRollNumber,
    });

    await user.save();

    res.status(201).json({ message: "User registered" });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
};


exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: 'Wrong password' });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: { name: user.name, role: user.role, rollNumber: user.rollNumber || null }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🔹 Forgot password - generate reset token
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(400)
        .json({ error: "No account found with that email" });
    }

    // Create token
    const token = crypto.randomBytes(32).toString("hex");

    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 mins

    await user.save();

    // In real app we would send email.
    // For now, we return the link so you can test.
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const resetLink = `${frontendUrl}/reset-password/${token}`;

    res.json({
      message: "Password reset link generated",
      resetLink,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error generating reset link" });
  }
};

// 🔹 Reset password using token
exports.resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }, // token not expired
    });

    if (!user) {
      return res
        .status(400)
        .json({ error: "Reset link is invalid or has expired" });
    }

    const hashed = await bcrypt.hash(password, 10);

    user.password = hashed;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error resetting password" });
  }
};

