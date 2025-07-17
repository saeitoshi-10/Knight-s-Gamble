const { v4: uuidV4 } = require('uuid');

class RoomManager {
  constructor() {
    this.rooms = new Map();
    this.playerRooms = new Map(); // Track which room each player is in
    this.roomTimeouts = new Map(); // Track room cleanup timeouts
    this.pendingBlockchainRooms = new Set();
  }

  createRoom(roomId, creator) {
    if (this.rooms.has(roomId)) {
      throw new Error('Room already exists');
    }

    const room = {
      roomId,
      players: [{ 
        id: creator.id, 
        username: creator.username, 
        color: 1, // White
        joinedAt: new Date(),
        isActive: true
      }],
      status: 'waiting', // waiting, active, finished
      createdAt: new Date(),
      gameState: {
        moves: [],
        currentTurn: 'white',
        isGameOver: false,
        winner: null
      },
      blockchainValidated: false,
      blockchainData: null
    };

    this.rooms.set(roomId, room);
    this.playerRooms.set(creator.id, roomId);
    
    // Set timeout for room cleanup if no one joins
    this.setRoomTimeout(roomId, 300000); // 5 minutes

    console.log(`🏠 Room created: ${roomId} by ${creator.username}`);
    return room;
  }

  joinRoom(roomId, player) {
    const room = this.rooms.get(roomId);
    
    if (!room) {
      throw new Error('Room does not exist');
    }

    if (room.players.length >= 2) {
      throw new Error('Room is full');
    }

    if (room.status !== 'waiting') {
      throw new Error('Game already in progress');
    }

    // Check if player is already in another room
    const existingRoom = this.playerRooms.get(player.id);
    if (existingRoom && existingRoom !== roomId) {
      this.removePlayerFromRoom(player.id, existingRoom);
    }

    const newPlayer = {
      id: player.id,
      username: player.username,
      color: 0, // Black
      joinedAt: new Date(),
      isActive: true
    };

    room.players.push(newPlayer);
    room.status = 'pending_blockchain';
    this.playerRooms.set(player.id, roomId);
    this.pendingBlockchainRooms.add(roomId);

    // Clear room timeout since game is starting
    this.clearRoomTimeout(roomId);

    console.log(`👥 Player ${player.username} joined room: ${roomId}`);
    return room;
  }

  activateRoom(roomId, blockchainData) {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    room.status = 'active';
    room.blockchainValidated = true;
    room.blockchainData = blockchainData;
    this.pendingBlockchainRooms.delete(roomId);

    console.log(`🎮 Room activated: ${roomId}`);
    return room;
  }

  failRoomActivation(roomId, error) {
    const room = this.rooms.get(roomId);
    if (!room) {
      return null;
    }

    room.status = 'failed';
    room.blockchainError = error;
    this.pendingBlockchainRooms.delete(roomId);

    this.setRoomTimeout(roomId, 30000);
    console.log(`❌ Room activation failed: ${roomId} - ${error}`);
    return room;
  }

  removePlayerFromRoom(playerId, roomId = null) {
    const targetRoomId = roomId || this.playerRooms.get(playerId);
    
    if (!targetRoomId) {
      return null;
    }

    const room = this.rooms.get(targetRoomId);
    if (!room) {
      return null;
    }

    const playerIndex = room.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) {
      return null;
    }

    const removedPlayer = room.players[playerIndex];
    room.players.splice(playerIndex, 1);
    this.playerRooms.delete(playerId);
    this.pendingBlockchainRooms.delete(targetRoomId);

    // Handle room cleanup based on remaining players
    if (room.players.length === 0) {
      this.deleteRoom(targetRoomId);
    } else if (room.status === 'active') {
      // If game was active and a player left, end the game
      room.status = 'finished';
      room.gameState.isGameOver = true;
      room.gameState.winner = room.players[0].color; // Remaining player wins
      
      // Set timeout for room cleanup
      this.setRoomTimeout(targetRoomId, 30000); // 30 seconds
    }

    console.log(`👋 Player ${removedPlayer.username} left room: ${targetRoomId}`);
    return { room, removedPlayer };
  }

  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  getRoomByPlayerId(playerId) {
    const roomId = this.playerRooms.get(playerId);
    return roomId ? this.rooms.get(roomId) : null;
  }

  updateGameState(roomId, move) {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    if (room.status !== 'active') {
      throw new Error('Game is not active');
    }

    room.gameState.moves.push({
      ...move,
      timestamp: new Date(),
      moveNumber: room.gameState.moves.length + 1
    });

    // Toggle turn
    room.gameState.currentTurn = room.gameState.currentTurn === 'white' ? 'black' : 'white';

    return room;
  }

  endGame(roomId, winner) {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    room.status = 'finished';
    room.gameState.isGameOver = true;
    room.gameState.winner = winner;
    room.gameState.endedAt = new Date();

    // Set timeout for room cleanup
    this.setRoomTimeout(roomId, 60000); // 1 minute

    console.log(`🏁 Game ended in room: ${roomId}, winner: ${winner}`);
    return room;
  }

  deleteRoom(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) {
      return false;
    }

    // Remove all players from tracking
    room.players.forEach(player => {
      this.playerRooms.delete(player.id);
    this.pendingBlockchainRooms.delete(roomId);
    });

    // Clear any timeouts
    this.clearRoomTimeout(roomId);

    this.rooms.delete(roomId);
    console.log(`🗑️ Room deleted: ${roomId}`);
    return true;
  }

  setRoomTimeout(roomId, delay) {
    this.clearRoomTimeout(roomId);
    
    const timeout = setTimeout(() => {
      console.log(`⏰ Room timeout triggered for: ${roomId}`);
      this.deleteRoom(roomId);
    }, delay);

    this.roomTimeouts.set(roomId, timeout);
  }

  clearRoomTimeout(roomId) {
    const timeout = this.roomTimeouts.get(roomId);
    if (timeout) {
      clearTimeout(timeout);
      this.roomTimeouts.delete(roomId);
    }
  }

  getActiveRooms() {
    return Array.from(this.rooms.values()).filter(room => room.status === 'active');
  }

  getWaitingRooms() {
    return Array.from(this.rooms.values()).filter(room => room.status === 'waiting');
  }

  getPendingRooms() {
    return Array.from(this.rooms.values()).filter(room => room.status === 'pending_blockchain');
  }

  getFinishedRooms() {
    return Array.from(this.rooms.values()).filter(room => room.status === 'finished');
  }

  getRoomStats() {
    const rooms = Array.from(this.rooms.values());
    return {
      total: rooms.length,
      waiting: rooms.filter(r => r.status === 'waiting').length,
      active: rooms.filter(r => r.status === 'active').length,
      finished: rooms.filter(r => r.status === 'finished').length,
      pending: rooms.filter(r => r.status === 'pending_blockchain').length,
      failed: rooms.filter(r => r.status === 'failed').length,
      totalPlayers: Array.from(this.playerRooms.keys()).length
    };
  }

  // Cleanup inactive rooms periodically
  cleanupInactiveRooms() {
    const now = new Date();
    const maxInactiveTime = 30 * 60 * 1000; // 30 minutes

    for (const [roomId, room] of this.rooms.entries()) {
      const timeSinceCreated = now - room.createdAt;
      const timeSinceLastActivity = room.gameState.moves.length > 0 
        ? now - room.gameState.moves[room.gameState.moves.length - 1].timestamp
        : timeSinceCreated;

      const shouldCleanup = timeSinceLastActivity > maxInactiveTime || 
                           (room.status === 'failed' && timeSinceCreated > 60000);

      if (shouldCleanup) {
        console.log(`🧹 Cleaning up inactive room: ${roomId}`);
        this.deleteRoom(roomId);
      }
    }
  }
}

module.exports = RoomManager;