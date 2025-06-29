import { useState, useEffect, useCallback } from 'react';

export const useHealthMonitor = () => {
  const [healthStatus, setHealthStatus] = useState({
    status: 'unknown',
    blockchain: false,
    rooms: null,
    lastCheck: null,
    error: null
  });
  const [isChecking, setIsChecking] = useState(false);

  const serverUrl = process.env.REACT_APP_SERVER_URL || "http://localhost:8080";

  const checkHealth = useCallback(async () => {
    if (isChecking) return;
    
    setIsChecking(true);
    
    try {
      const response = await fetch(`${serverUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 5000
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      const data = await response.json();
      
      setHealthStatus({
        status: data.status,
        blockchain: data.blockchain,
        rooms: data.rooms,
        lastCheck: new Date(data.timestamp),
        error: null
      });

    } catch (error) {
      console.error('Health check failed:', error);
      setHealthStatus(prev => ({
        ...prev,
        status: 'unhealthy',
        error: error.message,
        lastCheck: new Date()
      }));
    } finally {
      setIsChecking(false);
    }
  }, [serverUrl, isChecking]);

  // Initial health check
  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  // Periodic health checks every 30 seconds
  useEffect(() => {
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  // Check health when window regains focus
  useEffect(() => {
    const handleFocus = () => {
      checkHealth();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [checkHealth]);

  return {
    healthStatus,
    isChecking,
    checkHealth,
    isHealthy: healthStatus.status === 'healthy',
    isBlockchainReady: healthStatus.blockchain
  };
};