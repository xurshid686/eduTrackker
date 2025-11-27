const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  studentId: { type: String, required: true, unique: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  grade: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Student || mongoose.model('Student', studentSchema);
