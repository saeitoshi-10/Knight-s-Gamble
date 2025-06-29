import { io } from "socket.io-client";

class SocketManager {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }

  connect() {
    if (this.socket) {
      return this.socket;
    }

    const serverUrl = process.env.REACT_APP_SERVER_URL || "http://localhost:8080";
    
    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      reconnectionDelayMax: 5000,
    });

    this.setupEventListeners();
    return this.socket;
  }

  setupEventListeners() {
    this.socket.on('connect', () => {
      console.log('✅ Connected to server');
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from server:', reason);
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('🚨 Connection error:', error.message);
      this.reconnectAttempts++;
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Reconnected after ${attemptNumber} attempts`);
      this.isConnected = true;
    });

    this.socket.on('reconnect_failed', () => {
      console.error('💥 Failed to reconnect to server');
      this.isConnected = false;
    });

    // Global error handler
    this.socket.on('error', (error) => {
      console.error('🚨 Socket error:', error);
      // You can emit a custom event to handle errors in components
      this.socket.emit('globalError', error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  getSocket() {
    if (!this.socket) {
      return this.connect();
    }
    return this.socket;
  }

  isSocketConnected() {
    return this.isConnected && this.socket && this.socket.connected;
  }
}

const socketManager = new SocketManager();
export default socketManager.getSocket();
export { socketManager };