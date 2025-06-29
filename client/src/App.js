import { useEffect, useState, useCallback } from "react";
import Game from "./Game";
import socket from "./socket";
import Modal from "./components/Modal";
import InitGame from "./components/InitGame";

export default function App() {
  const [username, setUsername] = useState("");
  const [usernameSubmitted, setUsernameSubmitted] = useState(false);
  
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Modal
        isOpen={!usernameSubmitted}
        onClose={() => setUsernameSubmitted(true)}
        title="Welcome to Chess Betting"
        subtitle="Choose your username to get started"
      >
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="input-field"
            autoFocus
          />
          <button
            onClick={() => {
              if (!username.trim()) return;
              socket.emit("username", username);
              setUsernameSubmitted(true);
            }}
            className="btn-primary w-full"
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