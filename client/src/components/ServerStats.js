import { useState } from 'react';
import { useServerStats } from '../hooks/useServerStats';
import Modal from './Modal';

export default function ServerStats() {
  const [isOpen, setIsOpen] = useState(false);
  const { stats, loading, error, fetchStats } = useServerStats();

  const handleOpen = () => {
    setIsOpen(true);
    fetchStats();
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="fixed bottom-4 left-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white p-3 rounded-full border border-white/20 shadow-lg transition-all duration-200 hover:scale-105"
        title="Server Statistics"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 00-2-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Server Statistics"
        subtitle="Real-time server and room statistics"
        showCloseButton
      >
        <div className="space-y-4">
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-white/70">Loading statistics...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
              <p className="text-red-400 text-sm">{error}</p>
              <button
                onClick={fetchStats}
                className="btn-secondary mt-2 text-xs py-1 px-3"
              >
                Retry
              </button>
            </div>
          )}

          {stats && !loading && (
            <div className="space-y-4">
              {/* Room Statistics */}
              <div className="card p-4">
                <h3 className="text-lg font-semibold mb-3 text-blue-400">Room Statistics</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{stats.active}</div>
                    <div className="text-sm text-white/70">Active Games</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-400">{stats.waiting}</div>
                    <div className="text-sm text-white/70">Waiting Rooms</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-400">{stats.finished}</div>
                    <div className="text-sm text-white/70">Finished Games</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">{stats.total}</div>
                    <div className="text-sm text-white/70">Total Rooms</div>
                  </div>
                </div>
              </div>

              {/* Player Statistics */}
              <div className="card p-4">
                <h3 className="text-lg font-semibold mb-3 text-green-400">Player Activity</h3>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-400">{stats.totalPlayers}</div>
                  <div className="text-sm text-white/70">Active Players</div>
                </div>
              </div>

              {/* Server Health Indicators */}
              <div className="card p-4">
                <h3 className="text-lg font-semibold mb-3 text-orange-400">Server Health</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-white/70">Server Status</span>
                    <span className="text-green-400 font-semibold">✅ Healthy</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/70">Load Level</span>
                    <span className={`font-semibold ${
                      stats.total < 10 ? 'text-green-400' : 
                      stats.total < 50 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {stats.total < 10 ? 'Low' : stats.total < 50 ? 'Medium' : 'High'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={fetchStats}
                disabled={loading}
                className="btn-secondary w-full"
              >
                {loading ? 'Refreshing...' : 'Refresh Statistics'}
              </button>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}