const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  testId: { type: mongoose.Schema.Types.ObjectId, ref: 'Test', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  answers: [{
    questionIndex: Number,
    answer: String
  }],
  score: Number,
  feedback: String,
  submittedAt: { type: Date, default: Date.now },
  graded: { type: Boolean, default: false }
});

module.exports = mongoose.models.Submission || mongoose.model('Submission', submissionSchema);
