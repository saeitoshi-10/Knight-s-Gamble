import { useEffect, useState, useCallback } from "react";
import Game from "./Game";
import socket from "./socket";
import Modal from "./components/Modal";
import InitGame from "./components/InitGame";
import { validateUsername } from "./utils/validation";

export default function App() {
  const [username, setUsername] = useState("");
  const [usernameSubmitted, setUsernameSubmitted] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  
  const [room, setRoom] = useState("");
  const [orientation, setOrientation] = useState("");
  const [players, setPlayers] = useState([]);

  // reset states for new game
  const cleanup = useCallback(() => {
    setRoom("");
    setOrientation("");
    setPlayers("");
  }, []);

  useEffect(() => {
    socket.on("opponentJoined", (roomData) => {
      console.log("roomData", roomData);
      setPlayers(roomData.players);
    });
  }, []);

  const handleUsernameSubmit = () => {
    const validation = validateUsername(username);
    if (!validation.isValid) {
      setUsernameError(validation.error);
      return;
    }
    
    socket.emit("username", username.trim());
    setUsernameSubmitted(true);
    setUsernameError("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
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
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleUsernameSubmit();
                }
              }}
            />
            {usernameError && <p className="text-red-400 text-sm mt-1">{usernameError}</p>}
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
            disabled={!username.trim()}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
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
          />
        ) : (
          <InitGame
            setRoom={setRoom}
            setOrientation={setOrientation}
            setPlayers={setPlayers}
          />
        )}
      </div>
    </div>
  );
}