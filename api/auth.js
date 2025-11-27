const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const connectDB = require('../lib/mongodb');
const User = require('../models/User');
const Student = require('../models/Student');

const router = express.Router();

// Initialize database connection
router.use(async (req, res, next) => {
  await connectDB();
  next();
});

// Register Teacher (Super Admin only)
router.post('/register-teacher', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      role: 'teacher'
    });

    await user.save();

    res.status(201).json({ 
      message: 'Teacher registered successfully',
      teacher: { id: user._id, name: user.name, email: user.email }
    });
  } catch (error) {
    console.error('Register teacher error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Register Student (Teacher only)
router.post('/register-student', async (req, res) => {
  try {
    const { name, email, password, studentId, grade } = req.body;
    const teacherId = req.user.id;

    if (!name || !email || !password || !studentId) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const existingStudent = await Student.findOne({ studentId });
    if (existingStudent) {
      return res.status(400).json({ message: 'Student ID already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      role: 'student'
    });

    await user.save();

    const student = new Student({
      userId: user._id,
      studentId,
      teacherId,
      grade
    });

    await student.save();

    res.status(201).json({ 
      message: 'Student registered successfully',
      student: {
        id: user._id,
        name,
        studentId,
        email,
        password // Return plain password for teacher to give to student
      }
    });
  } catch (error) {
    console.error('Register student error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email, isActive: true });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        role: user.role,
        name: user.name
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
