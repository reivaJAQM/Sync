const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createUser, getUser } = require('../models/store');

const router = express.Router();

const tempUsers = new Map();

router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  if (tempUsers.has(username)) {
    return res.status(400).json({ error: 'Username already exists' });
  }
  const hashed = await bcrypt.hash(password, 10);
  const user = createUser(username);
  tempUsers.set(username, { password: hashed, userId: user.id });
  const token = jwt.sign({ id: user.id, username }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const stored = tempUsers.get(username);
  if (!stored) return res.status(400).json({ error: 'Invalid credentials' });
  const match = await bcrypt.compare(password, stored.password);
  if (!match) return res.status(400).json({ error: 'Invalid credentials' });
  const user = getUser(stored.userId);
  const token = jwt.sign({ id: user.id, username }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user });
});

module.exports = router;
