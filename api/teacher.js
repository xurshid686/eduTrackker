const express = require('express');
const connectDB = require('../lib/mongodb');
const User = require('../models/User');
const Student = require('../models/Student');
const Test = require('../models/Test');
const Submission = require('../models/Submission');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);
router.use(requireRole(['teacher']));

// Initialize database connection
router.use(async (req, res, next) => {
  await connectDB();
  next();
});

// Get teacher's students
router.get('/students', async (req, res) => {
  try {
    const students = await Student.find({ teacherId: req.user.id })
      .populate('userId', 'name email')
      .select('studentId grade createdAt');

    res.json(students);
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create test
router.post('/tests', async (req, res) => {
  try {
    const { title, description, questions, assignedTo, dueDate } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    const test = new Test({
      title,
      description,
      questions: questions || [],
      teacherId: req.user.id,
      assignedTo: assignedTo || [],
      dueDate
    });

    await test.save();
    
    // Populate the created test for response
    const populatedTest = await Test.findById(test._id)
      .populate('assignedTo', 'name email');

    res.status(201).json({ 
      message: 'Test created successfully',
      test: populatedTest
    });
  } catch (error) {
    console.error('Create test error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get teacher's tests
router.get('/tests', async (req, res) => {
  try {
    const tests = await Test.find({ teacherId: req.user.id })
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 });

    res.json(tests);
  } catch (error) {
    console.error('Get tests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get test submissions
router.get('/tests/:testId/submissions', async (req, res) => {
  try {
    const submissions = await Submission.find({ testId: req.params.testId })
      .populate('studentId', 'name email')
      .sort({ submittedAt: -1 });

    res.json(submissions);
  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Grade submission
router.put('/submissions/:submissionId/grade', async (req, res) => {
  try {
    const { score, feedback } = req.body;

    const submission = await Submission.findById(req.params.submissionId)
      .populate('testId');

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Check if teacher owns this test
    if (submission.testId.teacherId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    submission.score = score;
    submission.feedback = feedback;
    submission.graded = true;
    await submission.save();

    res.json({ message: 'Submission graded successfully', submission });
  } catch (error) {
    console.error('Grade submission error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get teacher dashboard stats
router.get('/dashboard-stats', async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments({ teacherId: req.user.id });
    const totalTests = await Test.countDocuments({ teacherId: req.user.id });
    const totalSubmissions = await Submission.countDocuments({
      testId: { $in: await Test.find({ teacherId: req.user.id }).distinct('_id') }
    });

    res.json({
      totalStudents,
      totalTests,
      totalSubmissions
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
