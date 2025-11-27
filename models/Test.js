const mongoose = require('mongoose');

const testSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  questions: [{
    question: String,
    type: { type: String, enum: ['multiple_choice', 'text'], default: 'text' },
    options: [String],
    correctAnswer: String
  }],
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  dueDate: Date,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Test || mongoose.model('Test', testSchema);
