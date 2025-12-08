const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail'); // 👈 NEW

// ================== REGISTER ==================
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

// ================== LOGIN ==================
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

// ================== OLD LINK-BASED RESET (optional, unused now) ==================
// You can keep these if you want, but frontend will use OTP version.
// Keeping them doesn't hurt.

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(400)
        .json({ error: "No account found with that email" });
    }

    const token = crypto.randomBytes(32).toString("hex");

    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 mins
    await user.save();

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

exports.resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
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

// ================== NEW: OTP-BASED FORGOT PASSWORD ==================

// 1) Send OTP to email
exports.forgotPasswordOtp = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(400)
        .json({ error: "No account found with that email" });
    }

    // generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    user.resetOtp = otp;
    user.resetOtpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    // send email
    const subject = "College App - Password Reset OTP";
    const text = `Your OTP for resetting password is: ${otp}\n\nThis OTP is valid for 10 minutes.\nIf you did not request this, please ignore.`;

    await sendEmail(email, subject, text);

    res.json({ message: "OTP sent to your email" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error sending OTP" });
  }
};

// 2) Verify OTP and reset password
exports.resetPasswordOtp = async (req, res) => {
  const { email, otp, password } = req.body;

  try {
    const user = await User.findOne({
      email,
      resetOtp: otp,
      resetOtpExpires: { $gt: Date.now() }, // not expired
    });

    if (!user) {
      return res
        .status(400)
        .json({ error: "Invalid or expired OTP" });
    }

    const hashed = await bcrypt.hash(password, 10);

    user.password = hashed;
    user.resetOtp = undefined;
    user.resetOtpExpires = undefined;

    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error resetting password with OTP" });
  }
};
