import { useSocket } from '../hooks/useSocket';

export default function ConnectionStatus() {
  const { isConnected, connectionError } = useSocket();

  if (isConnected && !connectionError) {
    return null; // Don't show anything when connected
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      {!isConnected && (
        <div className="bg-red-500/90 backdrop-blur-sm text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <div className="w-2 h-2 bg-red-300 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium">
            {connectionError || 'Connecting to server...'}
          </span>
        </div>
      )}
      
      {isConnected && connectionError && (
        <div className="bg-yellow-500/90 backdrop-blur-sm text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <div className="w-2 h-2 bg-yellow-300 rounded-full"></div>
          <span className="text-sm font-medium">{connectionError}</span>
        </div>
      )}
    </div>
  );
}