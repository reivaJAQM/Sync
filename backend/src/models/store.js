const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const rooms = new Map();
const codes = new Set();

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
  } while (codes.has(code));
  codes.add(code);
  return code;
}

async function createUserDB(username, password) {
  const id = uuidv4();
  const result = await pool.query(
    'INSERT INTO users (id, username, password) VALUES ($1, $2, $3) RETURNING id, username',
    [id, username, password]
  );
  return result.rows[0];
}

async function getUserByUsername(username) {
  const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
  return result.rows[0];
}

async function getUser(id) {
  const result = await pool.query('SELECT id, username, profile_picture FROM users WHERE id = $1', [id]);
  return result.rows[0];
}

async function updateUserProfilePicture(id, profilePicture) {
  const result = await pool.query(
    'UPDATE users SET profile_picture = $1 WHERE id = $2 RETURNING id, username, profile_picture',
    [profilePicture, id]
  );
  return result.rows[0];
}

async function clearAllUsers() {
  await pool.query('DELETE FROM users');
}

function createRoom(name, creatorId) {
  const room = {
    id: uuidv4(),
    code: generateRoomCode(),
    name,
    creatorId,
    users: [],
    queue: [],
    currentVideo: null,
    isPlaying: false,
    currentTime: 0,
    startedAt: null,
  };
  rooms.set(room.id, room);
  return room;
}

function getRoom(id) {
  return rooms.get(id);
}

function getRoomByCode(code) {
  for (const room of rooms.values()) {
    if (room.code === code) return room;
  }
  return null;
}

function deleteRoom(id) {
  rooms.delete(id);
}

function addUserToRoom(roomId, user) {
  const room = rooms.get(roomId);
  if (!room) return null;
  if (!room.users.find(u => u.id === user.id)) {
    room.users.push(user);
  }
  return room;
}

function removeUserFromRoom(roomId, userId) {
  const room = rooms.get(roomId);
  if (!room) return null;
  room.users = room.users.filter(u => u.id !== userId);
  if (room.users.length === 0) {
    deleteRoom(roomId);
    return null;
  }
  if (room.creatorId === userId) {
    room.creatorId = room.users[0].id;
  }
  return room;
}

function addToQueue(roomId, video) {
  const room = rooms.get(roomId);
  if (!room) return null;
  room.queue.push({ ...video, addedBy: video.addedBy });
  return room;
}

function removeFromQueue(roomId, index) {
  const room = rooms.get(roomId);
  if (!room) return null;
  room.queue.splice(index, 1);
  return room;
}

function playNext(roomId) {
  const room = rooms.get(roomId);
  if (!room || room.queue.length === 0) return null;
  room.currentVideo = room.queue.shift();
  room.currentTime = 0;
  room.isPlaying = true;
  room.startedAt = Date.now();
  return room;
}

module.exports = {
  createUserDB,
  getUserByUsername,
  getUser,
  clearAllUsers,
  updateUserProfilePicture,
  createRoom,
  getRoom,
  getRoomByCode,
  deleteRoom,
  addUserToRoom,
  removeUserFromRoom,
  addToQueue,
  removeFromQueue,
  playNext,
};