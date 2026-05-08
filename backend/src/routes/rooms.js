const express = require('express');
const authMiddleware = require('../middleware/auth');
const { createRoom, getRoom, addUserToRoom, removeUserFromRoom, getUser } = require('../models/store');

const router = express.Router();

router.post('/', authMiddleware, (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Room name required' });
  const room = createRoom(name, req.user.id);
  addUserToRoom(room.id, { id: req.user.id, username: req.user.username });
  res.json(room);
});

router.get('/:id', authMiddleware, (req, res) => {
  const room = getRoom(req.params.id);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  res.json(room);
});

module.exports = router;
