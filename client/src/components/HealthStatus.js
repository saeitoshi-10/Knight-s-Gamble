import { useHealthMonitor } from '../hooks/useHealthMonitor';

export default function HealthStatus() {
  const { healthStatus, isChecking, checkHealth, isHealthy, isBlockchainReady } = useHealthMonitor();

  const getStatusColor = () => {
    if (isChecking) return 'text-yellow-400';
    if (isHealthy && isBlockchainReady) return 'text-green-400';
    if (isHealthy && !isBlockchainReady) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getStatusIcon = () => {
    if (isChecking) return '🔄';
    if (isHealthy && isBlockchainReady) return '✅';
    if (isHealthy && !isBlockchainReady) return '⚠️';
    return '❌';
  };

  const getStatusText = () => {
    if (isChecking) return 'Checking...';
    if (isHealthy && isBlockchainReady) return 'All Systems Operational';
    if (isHealthy && !isBlockchainReady) return 'Server OK, Blockchain Issues';
    return 'Server Issues';
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-black/80 backdrop-blur-sm rounded-lg p-3 border border-white/20 shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">{getStatusIcon()}</span>
          <span className={`text-sm font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </span>
          <button
            onClick={checkHealth}
            disabled={isChecking}
            className="ml-2 text-white/60 hover:text-white text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50"
          >
            {isChecking ? '...' : 'Refresh'}
          </button>
        </div>
        
        {healthStatus.rooms && (
          <div className="text-xs text-white/60 space-y-1">
            <div className="flex justify-between">
              <span>Active Rooms:</span>
              <span className="text-white">{healthStatus.rooms.active}</span>
            </div>
            <div className="flex justify-between">
              <span>Waiting Rooms:</span>
              <span className="text-white">{healthStatus.rooms.waiting}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Players:</span>
              <span className="text-white">{healthStatus.rooms.totalPlayers}</span>
            </div>
          </div>
        )}
        
        {healthStatus.lastCheck && (
          <div className="text-xs text-white/40 mt-2">
            Last check: {healthStatus.lastCheck.toLocaleTimeString()}
          </div>
        )}
        
        {healthStatus.error && (
          <div className="text-xs text-red-400 mt-2">
            Error: {healthStatus.error}
          </div>
        )}
      </div>
    </div>
  );
}