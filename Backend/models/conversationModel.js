// models/conversationModel.js
const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Conversation', conversationSchema);