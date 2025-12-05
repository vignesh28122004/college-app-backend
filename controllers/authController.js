const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
  const { name, email, password, role, rollNumber } = req.body; // ✅ added rollNumber
  try {
    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // If role is student, ensure rollNumber is provided
    if (role === 'student' && !rollNumber) {
      return res.status(400).json({ error: 'Roll Number is required for students' });
    }

    // Hash password
    const hashed = await bcrypt.hash(password, 10);

    // Save user
    const user = new User({ name, email, password: hashed, role, rollNumber });
    await user.save();

    res.status(201).json({ message: 'User registered' });
  } catch (err) {
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
