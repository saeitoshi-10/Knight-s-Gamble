import { useState, useEffect, useCallback } from 'react';

export const useServerStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const serverUrl = process.env.REACT_APP_SERVER_URL || "http://localhost:8080";

  const fetchStats = useCallback(async () => {
    if (loading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${serverUrl}/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please wait before requesting stats again.');
        }
        throw new Error(`Failed to fetch stats: ${response.status}`);
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Stats fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [serverUrl, loading]);

  return {
    stats,
    loading,
    error,
    fetchStats,
    refetch: fetchStats
  };
};