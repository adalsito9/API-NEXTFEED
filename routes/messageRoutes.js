
// routes/messageRoutes.js
const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const { protect } = require('../middleware/authMiddleware');

// GET /api/messages/:userId
router.get('/:userId', protect, async (req, res) => {
  const userId = req.user.id;
  const otherUserId = req.params.userId;
  try {
    const messages = await Message.find({
      $or: [
        { from: userId, to: otherUserId },
        { from: otherUserId, to: userId }
      ]
    }).sort({ createdAt: 1 });
    res.json({ messages });
  } catch (e) {
    res.status(500).json({ mensaje: 'Error al obtener mensajes' });
  }
});

module.exports = router;