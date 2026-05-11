const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createUserDB, getUserByUsername, getUser, clearAllUsers, updateUserProfilePicture } = require('../models/store');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  if (username.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters' });
  }
  if (password.length < 3) {
    return res.status(400).json({ error: 'Password must be at least 3 characters' });
  }
  const existing = await getUserByUsername(username);
  if (existing) {
    return res.status(400).json({ error: 'Username already exists' });
  }
  const hashed = await bcrypt.hash(password, 10);
  const user = await createUserDB(username, hashed);
  const token = jwt.sign({ id: user.id, username }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, username: user.username, profilePicture: null } });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await getUserByUsername(username);
  if (!user) return res.status(400).json({ error: 'Invalid credentials' });
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id, username }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, username: user.username, profilePicture: user.profile_picture } });
});

router.delete('/clear', async (req, res) => {
  await clearAllUsers();
  res.json({ message: 'All users deleted' });
});

router.put('/profile-picture', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { profilePicture } = req.body;
    
    if (!profilePicture) return res.status(400).json({ error: 'No profile picture provided' });
    
    const updatedUser = await updateUserProfilePicture(decoded.id, profilePicture);
    res.json({ message: 'Profile picture updated', user: { id: updatedUser.id, username: updatedUser.username, profilePicture: updatedUser.profile_picture } });
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;