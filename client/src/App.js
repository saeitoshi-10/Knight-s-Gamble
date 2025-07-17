import { useEffect, useState, useCallback } from "react";
import Game from "./Game";
import socket from "./socket";
import Modal from "./components/Modal";
import InitGame from "./components/InitGame";
import ConnectionStatus from "./components/ConnectionStatus";
import HealthStatus from "./components/HealthStatus";
import ServerStats from "./components/ServerStats";
import { validateUsername } from "./utils/validation";
import { useSocket } from "./hooks/useSocket";
import { useHealthMonitor } from "./hooks/useHealthMonitor";

export default function App() {
  const [username, setUsername] = useState("");
  const [usernameSubmitted, setUsernameSubmitted] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  
  const [room, setRoom] = useState("");
  const [orientation, setOrientation] = useState("");
  const [players, setPlayers] = useState([]);
  const [gameStarted, setGameStarted] = useState(false);

  const { isConnected, connectionError, emitWithCallback } = useSocket();
  const { isHealthy, isBlockchainReady } = useHealthMonitor();

  // reset states for new game
  const cleanup = useCallback(() => {
    setRoom("");
    setOrientation("");
    setPlayers([]);
    setGameStarted(false);
  }, []);

  useEffect(() => {
    // Listen for opponent joined
    socket.on("opponentJoined", (roomData) => {
      console.log("Opponent joined:", roomData);
      setPlayers(roomData.players || []);
    });

    // Listen for game started event
    socket.on("gameStarted", (data) => {
      console.log("Game started:", data);
      setGameStarted(true);
      setPlayers(data.room?.players || []);
    });

    // Listen for game activation failed
    socket.on("gameActivationFailed", (data) => {
      console.error("Game activation failed:", data);
      setGameStarted(false);
      // Show error to user
      alert(`Game activation failed: ${data.error}`);
    });

    // Listen for room created event
    socket.on("roomCreated", (data) => {
      console.log("Room created:", data);
    });

    // Listen for server errors
    socket.on("error", (error) => {
      console.error("Server error:", error);
      // You can show a toast notification here
    });

    return () => {
      socket.off("opponentJoined");
      socket.off("gameStarted");
      socket.off("gameActivationFailed");
      socket.off("roomCreated");
      socket.off("error");
    };
  }, []);

  const handleUsernameSubmit = async () => {
    const validation = validateUsername(username);
    if (!validation.isValid) {
      setUsernameError(validation.error);
      return;
    }

    if (!isConnected) {
      setUsernameError("Not connected to server. Please wait...");
      return;
    }

    if (!isHealthy) {
      setUsernameError("Server is experiencing issues. Please wait...");
      return;
    }

    try {
      // Send username to server with validation
      socket.emit("username", username.trim());
      setUsernameSubmitted(true);
      setUsernameError("");
    } catch (error) {
      setUsernameError("Failed to set username. Please try again.");
    }
  };

  const canProceed = isConnected && isHealthy;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <ConnectionStatus />
      <HealthStatus />
      <ServerStats />
      
      <Modal
        isOpen={!usernameSubmitted}
        onClose={() => {}}
        title="Welcome to Chess Betting"
        subtitle="Choose your username to get started"
      >
        <div className="space-y-4">
          <div>
            <input
              type="text"
              placeholder="Enter your username (2-20 characters)"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setUsernameError("");
              }}
              className="input-field"
              autoFocus
              maxLength={20}
              disabled={!canProceed}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleUsernameSubmit();
                }
              }}
            />
            {usernameError && <p className="text-red-400 text-sm mt-1">{usernameError}</p>}
            {connectionError && <p className="text-yellow-400 text-sm mt-1">{connectionError}</p>}
          </div>
          
          {/* System Status */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <p className="text-blue-400 text-sm font-medium">System Status:</p>
            <div className="text-white/70 text-sm mt-1 space-y-1">
              <div className="flex justify-between">
                <span>Server Connection:</span>
                <span className={isConnected ? 'text-green-400' : 'text-red-400'}>
                  {isConnected ? '✅ Connected' : '❌ Disconnected'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Server Health:</span>
                <span className={isHealthy ? 'text-green-400' : 'text-red-400'}>
                  {isHealthy ? '✅ Healthy' : '❌ Issues'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Blockchain:</span>
                <span className={isBlockchainReady ? 'text-green-400' : 'text-yellow-400'}>
                  {isBlockchainReady ? '✅ Ready' : '⚠️ Issues'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <p className="text-blue-400 text-sm font-medium">Username Requirements:</p>
            <ul className="text-white/70 text-sm mt-1 space-y-1">
              <li>• 2-20 characters long</li>
              <li>• Letters, numbers, spaces, and basic symbols only</li>
              <li>• No offensive language</li>
            </ul>
          </div>
          
          <button
            onClick={handleUsernameSubmit}
            disabled={!username.trim() || !canProceed}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {!isConnected ? 'Connecting...' : 
             !isHealthy ? 'Server Issues...' :
             !isBlockchainReady ? 'Blockchain Issues...' :
             'Continue'}
          </button>
        </div>
      </Modal>

      <div className="container mx-auto px-4 py-8">
        {room ? (
          <Game
            room={room}
            orientation={orientation}
            username={username}
            players={players}
            cleanup={cleanup}
            gameStarted={gameStarted}
          />
        ) : (
          <InitGame
            setRoom={setRoom}
            setOrientation={setOrientation}
            setPlayers={setPlayers}
            isConnected={isConnected}
            emitWithCallback={emitWithCallback}
          />
        )}
      </div>
    </div>
  );
}