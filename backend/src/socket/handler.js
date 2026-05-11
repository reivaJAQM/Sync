const {
  addUserToRoom,
  removeUserFromRoom,
  addToQueue,
  removeFromQueue,
  playNext,
  getRoom,
  getUser,
} = require('../models/store');

function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.username}`);

    let currentRoomId = null;

    // Helper: check if the current socket user is the room host
    function isHost(room) {
      return room && room.creatorId === socket.user.id;
    }

    // Helper: calculate the real current time of the video
    function getRoomCurrentTime(room) {
      if (!room || !room.currentVideo) return 0;
      if (room.isPlaying && room.startedAt) {
        return room.currentTime + (Date.now() - room.startedAt) / 1000;
      }
      return room.currentTime;
    }

    socket.on('room:join', async ({ roomId }) => {
      currentRoomId = roomId;
      socket.join(roomId);
      
      const dbUser = await getUser(socket.user.id);
      
      const room = addUserToRoom(roomId, {
        id: socket.user.id,
        username: socket.user.username,
        profilePicture: dbUser ? dbUser.profile_picture : null,
      });
      if (room) {
        io.to(roomId).emit('room:users', room.users);
        // Tell everyone who the host is
        io.to(roomId).emit('room:host', room.creatorId);

        const computedTime = getRoomCurrentTime(room);
        socket.emit('room:state', {
          currentVideo: room.currentVideo,
          isPlaying: room.isPlaying,
          currentTime: computedTime,
          queue: room.queue,
          hostId: room.creatorId,
        });
      }
    });

    socket.on('room:leave', () => {
      if (currentRoomId) {
        const room = removeUserFromRoom(currentRoomId, socket.user.id);
        if (room) {
          io.to(currentRoomId).emit('room:users', room.users);
          // Notify new host if the old one left
          io.to(currentRoomId).emit('room:host', room.creatorId);
        }
        socket.leave(currentRoomId);
        currentRoomId = null;
      }
    });

    // Only host can play a new video
    socket.on('video:play', ({ roomId, video }) => {
      const room = getRoom(roomId);
      if (!room) return;
      if (!isHost(room)) return; // Reject non-host
      room.currentVideo = video;
      room.isPlaying = true;
      room.currentTime = 0;
      room.startedAt = Date.now();
      io.to(roomId).emit('video:play', { video, currentTime: 0 });
    });

    // Only host can pause
    socket.on('video:pause', ({ roomId, currentTime }) => {
      const room = getRoom(roomId);
      if (!room) return;
      if (!isHost(room)) return; // Reject non-host
      room.isPlaying = false;
      room.currentTime = currentTime;
      room.startedAt = null;
      io.to(roomId).emit('video:pause', { currentTime });
    });

    // Only host can resume
    socket.on('video:resume', ({ roomId, currentTime }) => {
      const room = getRoom(roomId);
      if (!room) return;
      if (!isHost(room)) return; // Reject non-host
      room.isPlaying = true;
      room.currentTime = currentTime;
      room.startedAt = Date.now();
      io.to(roomId).emit('video:resume', { currentTime });
    });

    // Only host can seek
    socket.on('video:seek', ({ roomId, currentTime }) => {
      const room = getRoom(roomId);
      if (!room) return;
      if (!isHost(room)) return; // Reject non-host
      room.currentTime = currentTime;
      if (room.isPlaying) {
        room.startedAt = Date.now();
      }
      io.to(roomId).emit('video:seek', { currentTime });
    });

    // Host periodic sync
    socket.on('video:syncTime', ({ roomId, currentTime }) => {
      const room = getRoom(roomId);
      if (!room) return;
      if (!isHost(room)) return;
      room.currentTime = currentTime;
      if (room.isPlaying) {
        room.startedAt = Date.now();
      }
      socket.broadcast.to(roomId).emit('video:syncTime', { currentTime });
    });

    // Anyone can add to queue
    socket.on('queue:add', ({ roomId, video }) => {
      const room = addToQueue(roomId, { ...video, addedBy: socket.user.id });
      if (room) {
        io.to(roomId).emit('queue:update', room.queue);
        if (!room.currentVideo) {
          const nextRoom = playNext(roomId);
          if (nextRoom) {
            nextRoom.startedAt = Date.now();
            io.to(roomId).emit('video:play', {
              video: nextRoom.currentVideo,
              currentTime: 0,
            });
            io.to(roomId).emit('queue:update', nextRoom.queue);
          }
        }
      }
    });

    // Only host can skip to next
    socket.on('queue:playNext', ({ roomId }) => {
      const room = getRoom(roomId);
      if (!room) return;
      if (!isHost(room)) return;
      const updatedRoom = playNext(roomId);
      if (updatedRoom && updatedRoom.currentVideo) {
        updatedRoom.startedAt = Date.now();
        io.to(roomId).emit('video:play', {
          video: updatedRoom.currentVideo,
          currentTime: 0,
        });
        io.to(roomId).emit('queue:update', updatedRoom.queue);
      }
    });

    socket.on('chat:message', async ({ roomId, message }) => {
      const dbUser = await getUser(socket.user.id);
      io.to(roomId).emit('chat:message', {
        id: socket.id + Date.now(),
        userId: socket.user.id,
        username: socket.user.username,
        profilePicture: dbUser ? dbUser.profile_picture : null,
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
          io.to(currentRoomId).emit('room:host', room.creatorId);
        }
      }
    });
  });
}

module.exports = { setupSocketHandlers };
