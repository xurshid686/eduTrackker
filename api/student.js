const express = require('express');
const connectDB = require('../lib/mongodb');
const Test = require('../models/Test');
const Submission = require('../models/Submission');
const Student = require('../models/Student');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);
router.use(requireRole(['student']));

// Initialize database connection
router.use(async (req, res, next) => {
  await connectDB();
  next();
});

// Get assigned tests
router.get('/tests', async (req, res) => {
  try {
    const tests = await Test.find({ 
      assignedTo: req.user.id 
    })
    .populate('teacherId', 'name email')
    .sort({ createdAt: -1 });

    // Check submission status for each test
    const testsWithStatus = await Promise.all(
      tests.map(async (test) => {
        const submission = await Submission.findOne({
          testId: test._id,
          studentId: req.user.id
        });

        return {
          ...test.toObject(),
          submitted: !!submission,
          submissionId: submission?._id,
          graded: submission?.graded,
          score: submission?.score
        };
      })
    );

    res.json(testsWithStatus);
  } catch (error) {
    console.error('Get tests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Submit test
router.post('/tests/:testId/submit', async (req, res) => {
  try {
    const { answers } = req.body;

    const test = await Test.findById(req.params.testId);
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    // Check if student is assigned to this test
    if (!test.assignedTo.includes(req.user.id)) {
      return res.status(403).json({ message: 'Not assigned to this test' });
    }

    // Check if already submitted
    const existingSubmission = await Submission.findOne({
      testId: req.params.testId,
      studentId: req.user.id
    });

    if (existingSubmission) {
      return res.status(400).json({ message: 'Test already submitted' });
    }

    const submission = new Submission({
      testId: req.params.testId,
      studentId: req.user.id,
      answers: answers || []
    });

    await submission.save();

    res.status(201).json({ 
      message: 'Test submitted successfully',
      submission
    });
  } catch (error) {
    console.error('Submit test error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get student's submissions
router.get('/submissions', async (req, res) => {
  try {
    const submissions = await Submission.find({ studentId: req.user.id })
      .populate('testId', 'title description')
      .sort({ submittedAt: -1 });

    res.json(submissions);
  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get student dashboard stats
router.get('/dashboard-stats', async (req, res) => {
  try {
    const totalAssignedTests = await Test.countDocuments({ assignedTo: req.user.id });
    const totalSubmitted = await Submission.countDocuments({ studentId: req.user.id });
    const totalGraded = await Submission.countDocuments({ studentId: req.user.id, graded: true });

    res.json({
      totalAssignedTests,
      totalSubmitted,
      totalGraded
    });
  } catch (error) {
    console.error('Get student stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
