const { v4: uuidv4 } = require('uuid');

const users = new Map();
const rooms = new Map();

function createUser(username) {
  const user = { id: uuidv4(), username };
  users.set(user.id, user);
  return user;
}

function getUser(id) {
  return users.get(id);
}

function createRoom(name, creatorId) {
  const room = {
    id: uuidv4(),
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
  createUser,
  getUser,
  createRoom,
  getRoom,
  deleteRoom,
  addUserToRoom,
  removeUserFromRoom,
  addToQueue,
  removeFromQueue,
  playNext,
};
