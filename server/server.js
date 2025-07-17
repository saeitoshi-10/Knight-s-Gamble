require('dotenv').config();
const express = require('express');
const { Server } = require('socket.io');
const { v4: uuidV4 } = require('uuid');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');

// Import services and middleware
const blockchainService = require('./config/blockchain');
const RoomManager = require('./services/RoomManager');
const { 
  generalLimiter, 
  roomOperationsLimiter,
  validateUsername,
  validateRoomId,
  validateMove
} = require('./middleware/validation');

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 8080;

// Initialize services
const roomManager = new RoomManager();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Rate limiting
app.use(generalLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  const stats = roomManager.getRoomStats();
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    blockchain: blockchainService.isInitialized,
    rooms: stats
  });
});

// Room statistics endpoint
app.get('/stats', roomOperationsLimiter, (req, res) => {
  const stats = roomManager.getRoomStats();
  res.json(stats);
});

// Socket.IO configuration
const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Socket connection handling
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  // Username validation and storage
  socket.on('username', (username) => {
    const validation = validateUsername(username);
    if (!validation.isValid) {
      socket.emit('error', { message: validation.error });
      return;
    }
    
    socket.data.username = validation.username;
    console.log(`👤 Username set: ${validation.username} (${socket.id})`);
  });

  // Create room handler
  socket.on('createRoom', async (roomId, callback) => {
    try {
      // Validate inputs
      if (!socket.data.username) {
        throw new Error('Username not set');
      }

      const roomValidation = validateRoomId(roomId);
      if (!roomValidation.isValid) {
        throw new Error(roomValidation.error);
      }

      // Create room
      const room = roomManager.createRoom(roomId, {
        id: socket.id,
        username: socket.data.username
      });

      await socket.join(roomId);
      
      if (callback) {
        callback(room.roomId);
      }

      // Emit room created event
      socket.emit('roomCreated', { room });

    } catch (error) {
      console.error(`❌ Create room error:`, error.message);
      if (callback) {
        callback({ error: true, message: error.message });
      }
    }
  });

  // Join room handler
  socket.on('joinRoom', async (args, callback) => {
    try {
      // Validate inputs
      if (!socket.data.username) {
        throw new Error('Username not set');
      }

      if (!args || !args.roomId) {
        throw new Error('Room ID is required');
      }

      const roomValidation = validateRoomId(args.roomId);
      if (!roomValidation.isValid) {
        throw new Error(roomValidation.error);
      }

      // Join room
      const room = roomManager.joinRoom(args.roomId, {
        id: socket.id,
        username: socket.data.username
      });

      // Initialize blockchain game
      try {
        await blockchainService.gameStart(args.roomId);
      } catch (blockchainError) {
        // Revert room join if blockchain fails
        roomManager.removePlayerFromRoom(socket.id, args.roomId);
        throw new Error(`Blockchain initialization failed: ${blockchainError.message}`);
      }

      await socket.join(args.roomId);

      if (callback) {
        callback(room);
      }

      // Notify other players
      socket.to(args.roomId).emit('opponentJoined', room);
      
      // Emit game started event to both players
      io.to(args.roomId).emit('gameStarted', { 
        room,
        message: 'Game has started! Good luck!' 
      });

    } catch (error) {
      console.error(`❌ Join room error:`, error.message);
      if (callback) {
        callback({ error: true, message: error.message });
      }
    }
  });

  // Move handler
  socket.on('move', async (data) => {
    try {
      if (!data || !data.room || !data.move) {
        throw new Error('Invalid move data');
      }

      const moveValidation = validateMove(data.move);
      if (!moveValidation.isValid) {
        throw new Error(moveValidation.error);
      }

      // Update room game state
      const room = roomManager.updateGameState(data.room, data.move);
      if (!room) {
        throw new Error('Room not found');
      }

      // Broadcast move to other players
      socket.to(data.room).emit('move', data.move);

      // Log move for debugging
      console.log(`♟️ Move in room ${data.room}: ${data.move.san || 'Unknown'}`);

    } catch (error) {
      console.error(`❌ Move error:`, error.message);
      socket.emit('error', { message: error.message });
    }
  });

  // Game end handler
  socket.on('closeRoom', async (data) => {
    try {
      if (!data || !data.roomId) {
        throw new Error('Room ID is required');
      }

      const room = roomManager.getRoom(data.roomId);
      if (!room) {
        throw new Error('Room not found');
      }

      // End game in blockchain
      try {
        await blockchainService.gameEnd(data.winner, data.roomId);
      } catch (blockchainError) {
        console.error(`⚠️ Blockchain game end failed:`, blockchainError.message);
        // Continue with room cleanup even if blockchain fails
      }

      // Update room state
      roomManager.endGame(data.roomId, data.winner);

      // Notify all players
      io.to(data.roomId).emit('closeRoom', data);

      // Remove all players from room
      const clientSockets = await io.in(data.roomId).fetchSockets();
      clientSockets.forEach((s) => {
        s.leave(data.roomId);
      });

      // Clean up room after delay
      setTimeout(() => {
        roomManager.deleteRoom(data.roomId);
      }, 5000);

      console.log(`🏁 Room closed: ${data.roomId}, winner: ${data.winner}`);

    } catch (error) {
      console.error(`❌ Close room error:`, error.message);
      socket.emit('error', { message: error.message });
    }
  });

  // Disconnect handler
  socket.on('disconnect', async (reason) => {
    console.log(`🔌 Client disconnected: ${socket.id}, reason: ${reason}`);

    try {
      const result = roomManager.removePlayerFromRoom(socket.id);
      
      if (result) {
        const { room, removedPlayer } = result;
        
        // Handle blockchain cleanup if game was active
        if (room.status === 'finished' && room.gameState.isGameOver) {
          try {
            const winner = room.players.length > 0 ? room.players[0].color : 2; // 2 = draw
            await blockchainService.gameEnd(winner, room.roomId);
          } catch (blockchainError) {
            console.error(`⚠️ Blockchain cleanup failed:`, blockchainError.message);
          }
        }

        // Notify remaining players
        if (room.players.length > 0) {
          io.to(room.roomId).emit('playerDisconnected', removedPlayer);
        }
      }
    } catch (error) {
      console.error(`❌ Disconnect cleanup error:`, error.message);
    }
  });

  // Error handler
  socket.on('error', (error) => {
    console.error(`🚨 Socket error from ${socket.id}:`, error);
  });
});

// Periodic cleanup of inactive rooms
setInterval(() => {
  roomManager.cleanupInactiveRooms();
}, 10 * 60 * 1000); // Every 10 minutes

// Initialize blockchain service and start server
async function startServer() {
  try {
    await blockchainService.initialize();
    
    server.listen(port, () => {
      console.log(`🚀 Chess Betting Server running on port ${port}`);
      console.log(`📊 Health check: http://localhost:${port}/health`);
      console.log(`📈 Statistics: http://localhost:${port}/stats`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

startServer();