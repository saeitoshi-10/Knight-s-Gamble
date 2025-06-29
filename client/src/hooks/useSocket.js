import { useState, useEffect, useCallback } from 'react';
import { socketManager } from '../socket';

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [socket] = useState(() => socketManager.getSocket());

  useEffect(() => {
    const handleConnect = () => {
      setIsConnected(true);
      setConnectionError(null);
    };

    const handleDisconnect = (reason) => {
      setIsConnected(false);
      if (reason === 'io server disconnect') {
        setConnectionError('Server disconnected the connection');
      }
    };

    const handleConnectError = (error) => {
      setConnectionError(error.message || 'Connection failed');
    };

    const handleReconnect = () => {
      setIsConnected(true);
      setConnectionError(null);
    };

    const handleGlobalError = (error) => {
      setConnectionError(error.message || 'An error occurred');
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('reconnect', handleReconnect);
    socket.on('globalError', handleGlobalError);

    // Set initial connection state
    setIsConnected(socket.connected);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('reconnect', handleReconnect);
      socket.off('globalError', handleGlobalError);
    };
  }, [socket]);

  const emitWithCallback = useCallback((event, data, timeout = 10000) => {
    return new Promise((resolve, reject) => {
      if (!isConnected) {
        reject(new Error('Socket not connected'));
        return;
      }

      const timer = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, timeout);

      socket.emit(event, data, (response) => {
        clearTimeout(timer);
        if (response && response.error) {
          reject(new Error(response.message || 'Server error'));
        } else {
          resolve(response);
        }
      });
    });
  }, [socket, isConnected]);

  return {
    socket,
    isConnected,
    connectionError,
    emitWithCallback
  };
};