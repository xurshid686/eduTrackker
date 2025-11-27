const express = require('express');
const connectDB = require('../lib/mongodb');
const User = require('../models/User');
const Student = require('../models/Student');
const Test = require('../models/Test');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);
router.use(requireRole(['superadmin']));

// Initialize database connection
router.use(async (req, res, next) => {
  await connectDB();
  next();
});

// Get all teachers
router.get('/teachers', async (req, res) => {
  try {
    const teachers = await User.find({ role: 'teacher' }).select('-password');
    res.json(teachers);
  } catch (error) {
    console.error('Get teachers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create teacher
router.post('/teachers', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Teacher already exists' });
    }

    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const teacher = new User({
      name,
      email,
      password: hashedPassword,
      role: 'teacher'
    });

    await teacher.save();

    res.status(201).json({ 
      message: 'Teacher created successfully',
      teacher: { id: teacher._id, name: teacher.name, email: teacher.email }
    });
  } catch (error) {
    console.error('Create teacher error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Deactivate teacher
router.put('/teachers/:id/deactivate', async (req, res) => {
  try {
    const teacher = await User.findById(req.params.id);
    
    if (!teacher || teacher.role !== 'teacher') {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    teacher.isActive = false;
    await teacher.save();

    res.json({ message: 'Teacher deactivated successfully' });
  } catch (error) {
    console.error('Deactivate teacher error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const totalTeachers = await User.countDocuments({ role: 'teacher', isActive: true });
    const totalStudents = await Student.countDocuments();
    const totalTests = await Test.countDocuments();

    res.json({
      totalTeachers,
      totalStudents,
      totalTests
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
