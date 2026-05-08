const {
  addUserToRoom,
  removeUserFromRoom,
  addToQueue,
  removeFromQueue,
  playNext,
  getRoom,
} = require('../models/store');

function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.username}`);

    let currentRoomId = null;

    socket.on('room:join', ({ roomId }) => {
      currentRoomId = roomId;
      socket.join(roomId);
      const room = addUserToRoom(roomId, {
        id: socket.user.id,
        username: socket.user.username,
      });
      if (room) {
        io.to(roomId).emit('room:users', room.users);
        io.to(roomId).emit('room:state', {
          currentVideo: room.currentVideo,
          isPlaying: room.isPlaying,
          currentTime: room.currentTime,
          startedAt: room.startedAt,
          queue: room.queue,
        });
      }
    });

    socket.on('room:leave', () => {
      if (currentRoomId) {
        const room = removeUserFromRoom(currentRoomId, socket.user.id);
        if (room) {
          io.to(currentRoomId).emit('room:users', room.users);
          io.to(currentRoomId).emit('room:hostChange', room.creatorId);
        }
        socket.leave(currentRoomId);
        currentRoomId = null;
      }
    });

    socket.on('video:play', ({ roomId, video }) => {
      const room = getRoom(roomId);
      if (!room) return;
      room.currentVideo = video;
      room.isPlaying = true;
      room.currentTime = 0;
      room.startedAt = Date.now();
      io.to(roomId).emit('video:play', { video, startedAt: room.startedAt });
    });

    socket.on('video:pause', ({ roomId, currentTime }) => {
      const room = getRoom(roomId);
      if (!room) return;
      room.isPlaying = false;
      room.currentTime = currentTime;
      io.to(roomId).emit('video:pause', { currentTime });
    });

    socket.on('video:resume', ({ roomId, currentTime }) => {
      const room = getRoom(roomId);
      if (!room) return;
      room.isPlaying = true;
      room.currentTime = currentTime;
      room.startedAt = Date.now() - currentTime * 1000;
      io.to(roomId).emit('video:resume', { currentTime, startedAt: room.startedAt });
    });

    socket.on('video:seek', ({ roomId, currentTime }) => {
      const room = getRoom(roomId);
      if (!room) return;
      room.currentTime = currentTime;
      room.startedAt = Date.now() - currentTime * 1000;
      io.to(roomId).emit('video:seek', { currentTime, startedAt: room.startedAt });
    });

    socket.on('queue:add', ({ roomId, video }) => {
      const room = addToQueue(roomId, { ...video, addedBy: socket.user.id });
      if (room) {
        io.to(roomId).emit('queue:update', room.queue);
        if (!room.currentVideo) {
          const nextRoom = playNext(roomId);
          if (nextRoom) {
            io.to(roomId).emit('video:play', {
              video: nextRoom.currentVideo,
              startedAt: nextRoom.startedAt,
            });
            io.to(roomId).emit('queue:update', nextRoom.queue);
          }
        }
      }
    });

    socket.on('queue:playNext', ({ roomId }) => {
      const room = playNext(roomId);
      if (room && room.currentVideo) {
        io.to(roomId).emit('video:play', {
          video: room.currentVideo,
          startedAt: room.startedAt,
        });
        io.to(roomId).emit('queue:update', room.queue);
      }
    });

    socket.on('chat:message', ({ roomId, message }) => {
      io.to(roomId).emit('chat:message', {
        id: socket.id + Date.now(),
        userId: socket.user.id,
        username: socket.user.username,
        message,
        timestamp: Date.now(),
      });
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.username}`);
      if (currentRoomId) {
        const room = removeUserFromRoom(currentRoomId, socket.user.id);
        if (room) {
          io.to(currentRoomId).emit('room:users', room.users);
          io.to(currentRoomId).emit('room:hostChange', room.creatorId);
        }
      }
    });
  });
}

module.exports = { setupSocketHandlers };
