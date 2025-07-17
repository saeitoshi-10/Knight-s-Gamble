import { useState, useMemo, useCallback, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import Modal from './components/Modal';
import socket from './socket';
import { useSocket } from './hooks/useSocket';

function Game({ players, room, orientation, cleanup, username, gameStarted }) {
  const chess = useMemo(() => new Chess(), []);
  const [fen, setFen] = useState(chess.fen());
  const [over, setOver] = useState("");
  const [winner, setWinner] = useState(2);
  const [moveHistory, setMoveHistory] = useState([]);
  const [gameStatus, setGameStatus] = useState(gameStarted ? 'active' : 'waiting');
  const [lastMoveTime, setLastMoveTime] = useState(null);
  const [connectionIssue, setConnectionIssue] = useState(false);

  const { isConnected, emitWithCallback } = useSocket();

  const makeAMove = useCallback(
    (move) => {
      if (players.length === 0) {
        return null;
      }
      try {
        const result = chess.move(move);
        setFen(chess.fen());
        
        if (result) {
          setMoveHistory(prev => [...prev, {
            ...result,
            timestamp: new Date(),
            moveNumber: prev.length + 1
          }]);
          setLastMoveTime(new Date());
        }

        console.log("Game status - over:", chess.isGameOver(), "checkmate:", chess.isCheckmate());

        if (chess.isGameOver()) {
          if (chess.isCheckmate()) {
            const winnerText = `Checkmate! ${chess.turn() === "w" ? "Black" : "White"} wins!`;
            setOver(winnerText);
            setWinner(chess.turn() === "w" ? 0 : 1);
            setGameStatus('finished');
          } else if (chess.isDraw()) {
            setOver("Draw");
            setWinner(2);
            setGameStatus('finished');
          } else {
            setOver("Game over");
            setGameStatus('finished');
          }
        }
        return result;
      } catch (error) {
        console.error("Move error:", error);
        return null;
      }
    },
    [chess, players]
  );

  function onDrop(sourceSquare, targetSquare) {
    // Check if it's the player's turn
    const currentPlayerColor = chess.turn() === 'w' ? 1 : 0;
    const myColor = orientation === 'white' ? 1 : 0;
    
    if (currentPlayerColor !== myColor) {
      return false; // Not your turn
    }

    // Check connection
    if (!isConnected) {
      setConnectionIssue(true);
      return false;
    }

    const moveData = {
      from: sourceSquare,
      to: targetSquare,
      color: chess.turn(),
    };

    const move = makeAMove(moveData);

    if (move) {
      // Send move to server with error handling
      try {
        socket.emit("move", {
          move,
          room
        });
        setConnectionIssue(false);
      } catch (error) {
        console.error("Failed to send move:", error);
        setConnectionIssue(true);
        // Revert the move if sending failed
        chess.undo();
        setFen(chess.fen());
        setMoveHistory(prev => prev.slice(0, -1));
        return false;
      }
    }

    return move != null;
  }

  useEffect(() => {
    const handleMove = (move) => {
      makeAMove(move);
      setConnectionIssue(false);
    };

    const handlePlayerDisconnected = (player) => {
      setOver(`${player.username} has disconnected`);
      setWinner((player.color + 1) % 2);
      setGameStatus('finished');
    };

    const handleCloseRoom = ({ roomId }) => {
      if (roomId === room) {
        cleanup();
      }
    };

    const handleGameStarted = (data) => {
      console.log("Game started event received:", data);
      setGameStatus('active');
    };

    const handleError = (error) => {
      console.error("Game error:", error);
      setConnectionIssue(true);
    };

    socket.on("move", handleMove);
    socket.on("playerDisconnected", handlePlayerDisconnected);
    socket.on("closeRoom", handleCloseRoom);
    socket.on("gameStarted", handleGameStarted);
    socket.on("error", handleError);

    return () => {
      socket.off("move", handleMove);
      socket.off("playerDisconnected", handlePlayerDisconnected);
      socket.off("closeRoom", handleCloseRoom);
      socket.off("gameStarted", handleGameStarted);
      socket.off("error", handleError);
    };
  }, [makeAMove, room, cleanup]);

  // Handle connection status changes
  useEffect(() => {
    if (!isConnected && gameStatus === 'active') {
      setConnectionIssue(true);
    } else if (isConnected) {
      setConnectionIssue(false);
    }
  }, [isConnected, gameStatus]);

  const handleGameEnd = async () => {
    try {
      await emitWithCallback("closeRoom", { roomId: room, winner: winner }, 15000);
      cleanup();
    } catch (error) {
      console.error("Failed to end game properly:", error);
      // Still cleanup locally
      cleanup();
    }
  };

  const currentPlayer = players.find(p => p.color === (chess.turn() === 'w' ? 1 : 0));
  const whitePlayer = players.find(p => p.color === 1);
  const blackPlayer = players.find(p => p.color === 0);
  const myPlayer = players.find(p => p.username === username);

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="card p-6 mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Chess Battle</h1>
          <p className="text-white/70">Room ID: <span className="font-mono text-blue-400">{room}</span></p>
          
          {/* Game Status */}
          <div className="mt-4 space-y-2">
            {gameStatus === 'waiting' && (
              <p className="text-yellow-400">⏳ Waiting for opponent to join...</p>
            )}
            
            {gameStatus === 'active' && currentPlayer && (
              <p className="text-lg">
                <span className="text-green-400">{currentPlayer.username}'s</span> turn
                {currentPlayer.username === username && (
                  <span className="text-blue-400 ml-2">(Your turn)</span>
                )}
              </p>
            )}
            
            {connectionIssue && (
              <p className="text-red-400">⚠️ Connection issue - moves may not sync</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Players Info */}
          <div className="lg:col-span-1 space-y-4">
            {/* White Player */}
            <div className={`card p-4 ${
              orientation === 'white' && whitePlayer?.username === username ? 'ring-2 ring-blue-500' : ''
            } ${
              gameStatus === 'active' && chess.turn() === 'w' ? 'bg-green-500/10 border-green-500/30' : ''
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-white rounded-full border-2 border-gray-400"></div>
                <div>
                  <p className="font-semibold">
                    {whitePlayer?.username || 'Waiting...'}
                    {whitePlayer?.username === username && (
                      <span className="text-blue-400 text-sm ml-1">(You)</span>
                    )}
                  </p>
                  <p className="text-sm text-white/60">White</p>
                </div>
              </div>
            </div>

            {/* Black Player */}
            <div className={`card p-4 ${
              orientation === 'black' && blackPlayer?.username === username ? 'ring-2 ring-blue-500' : ''
            } ${
              gameStatus === 'active' && chess.turn() === 'b' ? 'bg-green-500/10 border-green-500/30' : ''
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-gray-800 rounded-full border-2 border-gray-400"></div>
                <div>
                  <p className="font-semibold">
                    {blackPlayer?.username || 'Waiting...'}
                    {blackPlayer?.username === username && (
                      <span className="text-blue-400 text-sm ml-1">(You)</span>
                    )}
                  </p>
                  <p className="text-sm text-white/60">Black</p>
                </div>
              </div>
            </div>

            {/* Game Status */}
            <div className="card p-4">
              <h3 className="font-semibold mb-2">Game Status</h3>
              <div className="space-y-2 text-sm">
                <p className="text-white/70">
                  Status: <span className="text-white capitalize">{gameStatus}</span>
                </p>
                <p className="text-white/70">
                  Turn: <span className="text-white">{chess.turn() === 'w' ? 'White' : 'Black'}</span>
                </p>
                <p className="text-white/70">
                  Moves: <span className="text-white">{Math.floor(moveHistory.length / 2) + 1}</span>
                </p>
                {lastMoveTime && (
                  <p className="text-white/70">
                    Last move: <span className="text-white">{lastMoveTime.toLocaleTimeString()}</span>
                  </p>
                )}
                {chess.isCheck() && (
                  <p className="text-red-400 font-semibold">⚠️ Check!</p>
                )}
                {!isConnected && (
                  <p className="text-yellow-400 font-semibold">🔄 Reconnecting...</p>
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
                  areArrowsAllowed={true}
                  customBoardStyle={{
                    borderRadius: '12px',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                  }}
                  customLightSquareStyle={{ backgroundColor: '#f0d9b5' }}
                  customDarkSquareStyle={{ backgroundColor: '#b58863' }}
                  customDropSquareStyle={{
                    boxShadow: 'inset 0 0 1px 6px rgba(255,255,255,0.75)'
                  }}
                />
              </div>
              
              {gameStatus === 'waiting' && (
                <div className="mt-4 text-center">
                  <p className="text-white/70">Waiting for opponent...</p>
                  <div className="animate-pulse flex justify-center mt-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                </div>
              )}
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
                    <div key={index} className="flex justify-between items-center text-sm py-1 hover:bg-white/5 rounded px-2">
                      <span className="text-white/70">{Math.floor(index / 2) + 1}.</span>
                      <span className="font-mono font-semibold">{move.san}</span>
                      <span className="text-white/50 text-xs">
                        {move.timestamp?.toLocaleTimeString().slice(0, 5)}
                      </span>
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
        onClose={handleGameEnd}
        title="Game Over"
        subtitle={over}
      >
        <div className="text-center space-y-4">
          <div className="text-6xl">
            {over.includes('Checkmate') ? '👑' : 
             over.includes('Draw') ? '🤝' : 
             over.includes('disconnected') ? '🔌' : '🏁'}
          </div>
          
          {/* Winner announcement */}
          {winner !== 2 && (
            <div className="space-y-2">
              <p className="text-lg font-semibold">
                {winner === myPlayer?.color ? '🎉 You Won!' : '😔 You Lost'}
              </p>
              <p className="text-white/70">
                {winner === myPlayer?.color 
                  ? 'Congratulations! You will receive the prize tokens.'
                  : 'Better luck next time!'}
              </p>
            </div>
          )}
          
          {winner === 2 && (
            <div className="space-y-2">
              <p className="text-lg font-semibold">🤝 It's a Draw!</p>
              <p className="text-white/70">Both players will receive their tokens back.</p>
            </div>
          )}
          
          <button
            onClick={handleGameEnd}
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