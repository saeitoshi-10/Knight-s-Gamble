import { useState, useMemo, useCallback, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import Modal from './components/Modal';
import socket from './socket';

function Game({ players, room, orientation, cleanup, username }) {
  const chess = useMemo(() => new Chess(), []);
  const [fen, setFen] = useState(chess.fen());
  const [over, setOver] = useState("");
  const [winner, setWinner] = useState(2);
  const [moveHistory, setMoveHistory] = useState([]);

  const makeAMove = useCallback(
    (move) => {
      if (players.length === 0) {
        return null;
      }
      try {
        const result = chess.move(move);
        setFen(chess.fen());
        
        if (result) {
          setMoveHistory(prev => [...prev, result]);
        }

        console.log("over, checkmate", chess.isGameOver(), chess.isCheckmate());

        if (chess.isGameOver()) {
          if (chess.isCheckmate()) {
            setOver(`Checkmate! ${chess.turn() === "w" ? "Black" : "White"} wins!`);
            setWinner(chess.turn() === "w" ? 0 : 1);
          } else if (chess.isDraw()) {
            setOver("Draw");
          } else {
            setOver("Game over");
          }
        }
        return result;
      } catch {
        return null;
      }
    },
    [chess, players]
  );

  function onDrop(sourceSquare, targetSquare) {
    const moveData = {
      from: sourceSquare,
      to: targetSquare,
      color: chess.turn(),
    };

    const move = makeAMove(moveData);

    socket.emit("move", {
      move,
      room
    });

    return move != null;
  }

  useEffect(() => {
    socket.on("move", (move) => {
      makeAMove(move);
    });
  }, [makeAMove]);

  useEffect(() => {
    socket.on("playerDisconnected", (player) => {
      setOver(`${player.username} has disconnected`);
      setWinner((player.color + 1) % 2);
    });
  }, []);

  useEffect(() => {
    socket.on("closeRoom", ({ roomId }) => {
      if (roomId === room) {
        cleanup();
      }
    });
  }, [room, cleanup]);

  const currentPlayer = players.find(p => p.color === (chess.turn() === 'w' ? 1 : 0));
  const whitePlayer = players.find(p => p.color === 1);
  const blackPlayer = players.find(p => p.color === 0);

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="card p-6 mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Chess Battle</h1>
          <p className="text-white/70">Room ID: <span className="font-mono text-blue-400">{room}</span></p>
          {currentPlayer && (
            <p className="text-lg mt-2">
              <span className="text-green-400">{currentPlayer.username}'s</span> turn
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Players Info */}
          <div className="lg:col-span-1 space-y-4">
            {/* White Player */}
            <div className={`card p-4 ${orientation === 'white' && whitePlayer?.username === username ? 'ring-2 ring-blue-500' : ''}`}>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-white rounded-full border-2 border-gray-400"></div>
                <div>
                  <p className="font-semibold">{whitePlayer?.username || 'Waiting...'}</p>
                  <p className="text-sm text-white/60">White</p>
                </div>
              </div>
            </div>

            {/* Black Player */}
            <div className={`card p-4 ${orientation === 'black' && blackPlayer?.username === username ? 'ring-2 ring-blue-500' : ''}`}>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-gray-800 rounded-full border-2 border-gray-400"></div>
                <div>
                  <p className="font-semibold">{blackPlayer?.username || 'Waiting...'}</p>
                  <p className="text-sm text-white/60">Black</p>
                </div>
              </div>
            </div>

            {/* Game Status */}
            <div className="card p-4">
              <h3 className="font-semibold mb-2">Game Status</h3>
              <div className="space-y-2 text-sm">
                <p className="text-white/70">
                  Turn: <span className="text-white">{chess.turn() === 'w' ? 'White' : 'Black'}</span>
                </p>
                <p className="text-white/70">
                  Moves: <span className="text-white">{Math.floor(moveHistory.length / 2) + 1}</span>
                </p>
                {chess.isCheck() && (
                  <p className="text-red-400 font-semibold">Check!</p>
                )}
              </div>
            </div>
          </div>

          {/* Chess Board */}
          <div className="lg:col-span-2">
            <div className="card p-6">
              <div className="aspect-square max-w-full mx-auto">
                <Chessboard
                  position={fen}
                  onPieceDrop={onDrop}
                  boardOrientation={orientation}
                  snapToCursor={true}
                  customBoardStyle={{
                    borderRadius: '12px',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                  }}
                  customLightSquareStyle={{ backgroundColor: '#f0d9b5' }}
                  customDarkSquareStyle={{ backgroundColor: '#b58863' }}
                />
              </div>
            </div>
          </div>

          {/* Move History */}
          <div className="lg:col-span-1">
            <div className="card p-4">
              <h3 className="font-semibold mb-4">Move History</h3>
              <div className="max-h-96 overflow-y-auto space-y-1">
                {moveHistory.length === 0 ? (
                  <p className="text-white/50 text-sm">No moves yet</p>
                ) : (
                  moveHistory.map((move, index) => (
                    <div key={index} className="flex justify-between text-sm py-1">
                      <span className="text-white/70">{Math.floor(index / 2) + 1}.</span>
                      <span className="font-mono">{move.san}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Game Over Modal */}
      <Modal
        isOpen={Boolean(over)}
        onClose={() => {
          socket.emit("closeRoom", { roomId: room, winner: winner });
          cleanup();
        }}
        title="Game Over"
        subtitle={over}
      >
        <div className="text-center space-y-4">
          <div className="text-6xl">
            {over.includes('Checkmate') ? '👑' : over.includes('Draw') ? '🤝' : '🏁'}
          </div>
          <button
            onClick={() => {
              socket.emit("closeRoom", { roomId: room, winner: winner });
              cleanup();
            }}
            className="btn-primary w-full"
          >
            Return to Lobby
          </button>
        </div>
      </Modal>
    </div>
  );
}

export default Game;