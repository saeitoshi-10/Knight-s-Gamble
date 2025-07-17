import { useState } from "react";
import Modal from "./Modal";
import socket from "../socket";
import CoinStore from './CoinStore';
import { ethers } from "ethers";
import token from "./MyToken.json";
import { validateTokenAmount, validateRoomId } from "../utils/validation";
import { useWallet } from "../hooks/useWallet";
import { useSocket } from "../hooks/useSocket";
import { useHealthMonitor } from "../hooks/useHealthMonitor";
const { v4: uuidV4 } = require('uuid');

export default function InitGame({ setRoom, setOrientation, setPlayers, isConnected, emitWithCallback }) {
  const abi = token.abi;
  const [roomDialogOpen, setRoomDialogOpen] = useState(false);
  const [roomInput, setRoomInput] = useState('');
  const [roomError, setRoomError] = useState('');
  const [coinStore, setCoinStore] = useState(false);
  const [createRoomTokenDialog, setCreateRoomTokenDialog] = useState(false);
  const [tokenValue, setTokenValue] = useState('');
  const [tokenError, setTokenError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [serverError, setServerError] = useState("");
  
  const { account, balance, isConnected: walletConnected, connectWallet, checkNetwork } = useWallet();
  const { connectionError } = useSocket();
  const { isHealthy, isBlockchainReady } = useHealthMonitor();

  const validateInputs = (roomId, tokenAmount) => {
    // Clear previous errors
    setRoomError('');
    setTokenError('');
    setServerError('');

    // Check server connection and health
    if (!isConnected) {
      setServerError("Not connected to server. Please wait...");
      return false;
    }

    if (!isHealthy) {
      setServerError("Server is experiencing issues. Please wait...");
      return false;
    }

    if (!isBlockchainReady) {
      setServerError("Blockchain service is not ready. Please wait...");
      return false;
    }

    // Validate room ID if provided
    if (roomId) {
      const roomValidation = validateRoomId(roomId);
      if (!roomValidation.isValid) {
        setRoomError(roomValidation.error);
        return false;
      }
    }

    // Validate token amount
    const tokenValidation = validateTokenAmount(tokenAmount, 10);
    if (!tokenValidation.isValid) {
      setTokenError(tokenValidation.error);
      return false;
    }

    // Check wallet connection
    if (!walletConnected) {
      setTokenError("Please connect your wallet first");
      return false;
    }

    // Check network
    if (!checkNetwork()) {
      setTokenError("Please switch to the correct network");
      return false;
    }

    return true;
  };

  const handleJoinRoom = async () => {
    if (isProcessing) return;
    
    if (!validateInputs(roomInput, tokenValue)) return;

    setIsProcessing(true);
    
    try {
      // Connect wallet if not connected
      if (!walletConnected) {
        const connected = await connectWallet();
        if (!connected) {
          setTokenError("Failed to connect wallet");
          return;
        }
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract("0x5FbDB2315678afecb367f032d93F642f64180aa3", abi, signer);

      // Check token balance before transaction
      const userBalance = await contract.balanceOf(account);
      const requiredAmount = BigInt(tokenValue);
      
      if (userBalance < requiredAmount) {
        setTokenError(`Insufficient token balance. You have ${userBalance.toString()} DGC but need ${tokenValue} DGC`);
        return;
      }

      // Estimate gas before transaction
      try {
        await contract.placeBet.estimateGas(BigInt(tokenValue), roomInput, 1);
      } catch (gasError) {
        setTokenError("Transaction would fail. Please check your inputs and try again.");
        return;
      }

      const tx = await contract.placeBet(BigInt(tokenValue), roomInput, 1);
      await tx.wait();
      
      // Use the new socket method with proper error handling
      try {
        const response = await emitWithCallback("joinRoom", { roomId: roomInput });
        
        console.log("Join room response:", response);
        setRoom(response.roomId || roomInput);
        setPlayers(response.players || []);
        setOrientation("black");
        setRoomDialogOpen(false);
        setRoomInput('');
        setTokenValue('');
      } catch (socketError) {
        setServerError(socketError.message);
        // Note: Blockchain transaction already went through, 
        // user might need to contact support
        console.error("Socket error after successful blockchain transaction:", socketError);
      }
      
    } catch (error) {
      console.error('Join room error:', error);
      if (error.code === 4001) {
        setTokenError("Transaction rejected by user");
      } else if (error.code === -32603) {
        setTokenError("Transaction failed. Please check your balance and try again.");
      } else {
        setTokenError(error.message || "Transaction failed");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateRoom = async () => {
    if (isProcessing) return;
    
    const roomID = uuidV4();
    
    if (!validateInputs(null, tokenValue)) return;

    setIsProcessing(true);
    
    try {
      // Connect wallet if not connected
      if (!walletConnected) {
        const connected = await connectWallet();
        if (!connected) {
          setTokenError("Failed to connect wallet");
          return;
        }
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract("0x5FbDB2315678afecb367f032d93F642f64180aa3", abi, signer);
      
      // Check token balance before transaction
      const userBalance = await contract.balanceOf(account);
      const requiredAmount = ethers.parseUnits(tokenValue, 0); // Parse as integer tokens
      
      if (userBalance < requiredAmount) {
        setTokenError(`Insufficient token balance. You have ${ethers.formatUnits(userBalance, 0)} DGC but need ${tokenValue} DGC`);
        return;
      }

      // Estimate gas before transaction
      try {
        await contract.placeBet.estimateGas(requiredAmount, roomID, 0);
      } catch (gasError) {
        setTokenError("Transaction would fail. Please check your inputs and try again.");
        return;
      }

      const tx = await contract.placeBet(requiredAmount, roomID, 0);
      await tx.wait();
      
      // Use the new socket method with proper error handling
      try {
        const response = await emitWithCallback("createRoom", roomID);
        
        console.log("Create room response:", response);
        setRoom(response.roomId || roomID);
        setOrientation("white");
        setCreateRoomTokenDialog(false);
        setTokenValue('');
      } catch (socketError) {
        setServerError(socketError.message);
        console.error("Socket error after successful blockchain transaction:", socketError);
      }
      
    } catch (error) {
      console.error('Create room error:', error);
      if (error.code === 4001) {
        setTokenError("Transaction rejected by user");
      } else if (error.code === -32603) {
        setTokenError("Transaction failed. Please check your balance and try again.");
      } else {
        setTokenError(error.message || "Transaction failed");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const canInteract = isConnected && isHealthy && isBlockchainReady;

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-8 animate-fade-in">
        {/* Header */}
        <div className="space-y-4">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Chess Betting
          </h1>
          <p className="text-xl text-white/70 max-w-2xl mx-auto">
            Stake your tokens and prove your chess mastery. Winner takes all!
          </p>
          
          {/* System Status */}
          {(!isConnected || !isHealthy || !isBlockchainReady) && (
            <div className="card p-4 max-w-md mx-auto bg-yellow-500/20 border-yellow-500/50">
              <p className="text-yellow-400 font-semibold">⚠️ System Status</p>
              <div className="text-white/70 text-sm mt-2 space-y-1">
                <div className="flex justify-between">
                  <span>Server:</span>
                  <span className={isConnected && isHealthy ? 'text-green-400' : 'text-red-400'}>
                    {isConnected && isHealthy ? '✅ Ready' : '❌ Issues'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Blockchain:</span>
                  <span className={isBlockchainReady ? 'text-green-400' : 'text-yellow-400'}>
                    {isBlockchainReady ? '✅ Ready' : '⚠️ Issues'}
                  </span>
                </div>
              </div>
              {connectionError && (
                <p className="text-white/70 text-sm mt-2">{connectionError}</p>
              )}
            </div>
          )}
          
          {/* Wallet Status */}
          <div className="card p-4 max-w-md mx-auto">
            {walletConnected ? (
              <div className="space-y-2">
                <p className="text-green-400 font-semibold">✓ Wallet Connected</p>
                <p className="text-white/70 text-sm">
                  {account?.slice(0, 6)}...{account?.slice(-4)}
                </p>
                <p className="text-white/70 text-sm">
                  Balance: {balance ? `${parseFloat(balance).toFixed(4)} ETH` : 'Loading...'}
                </p>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="btn-primary"
                disabled={!canInteract}
              >
                {!canInteract ? 'System Not Ready...' : 'Connect Wallet'}
              </button>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button
            onClick={() => setCoinStore(true)}
            disabled={!canInteract}
            className="btn-secondary min-w-[200px] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
            Coin Store
          </button>
          
          <button
            onClick={() => setCreateRoomTokenDialog(true)}
            disabled={!walletConnected || !canInteract}
            className="btn-primary min-w-[200px] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create Room
          </button>
          
          <button
            onClick={() => setRoomDialogOpen(true)}
            disabled={!walletConnected || !canInteract}
            className="btn-secondary min-w-[200px] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013 3v1" />
            </svg>
            Join Room
          </button>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 max-w-4xl mx-auto">
          <div className="card p-6 text-center">
            <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Fast & Secure</h3>
            <p className="text-white/60">Blockchain-powered betting with instant payouts</p>
          </div>
          
          <div className="card p-6 text-center">
            <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Fair Play</h3>
            <p className="text-white/60">Transparent smart contracts ensure fair gameplay</p>
          </div>
          
          <div className="card p-6 text-center">
            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Win Big</h3>
            <p className="text-white/60">Winner takes 90% of the total pot</p>
          </div>
        </div>
      </div>

      {/* Modals */}
      <Modal
        isOpen={roomDialogOpen}
        onClose={() => {
          setRoomDialogOpen(false);
          setRoomInput('');
          setTokenValue('');
          setRoomError('');
          setTokenError('');
          setServerError('');
        }}
        title="Join Game Room"
        subtitle="Enter room ID and your bet amount"
        showCloseButton
      >
        <div className="space-y-4">
          <div>
            <input
              type="text"
              placeholder="Room ID (UUID format)"
              value={roomInput}
              onChange={(e) => {
                setRoomInput(e.target.value);
                setRoomError('');
                setServerError('');
              }}
              className="input-field"
              disabled={isProcessing || !canInteract}
            />
            {roomError && <p className="text-red-400 text-sm mt-1">{roomError}</p>}
          </div>
          
          <div>
            <input
              type="number"
              placeholder="Token amount to bet (min: 10)"
              value={tokenValue}
              onChange={(e) => {
                setTokenValue(e.target.value);
                setTokenError('');
                setServerError('');
              }}
              className="input-field"
              min="10"
              step="1"
              disabled={isProcessing || !canInteract}
            />
            {tokenError && <p className="text-red-400 text-sm mt-1">{tokenError}</p>}
          </div>
          
          {serverError && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
              <p className="text-red-400 text-sm">{serverError}</p>
            </div>
          )}
          
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <p className="text-blue-400 text-sm font-medium">Requirements:</p>
            <ul className="text-white/70 text-sm mt-1 space-y-1">
              <li>• Valid UUID room ID</li>
              <li>• Minimum 10 DGC tokens</li>
              <li>• Sufficient token balance</li>
              <li>• All systems operational</li>
            </ul>
          </div>
          
          <button 
            onClick={handleJoinRoom} 
            disabled={isProcessing || !walletConnected || !canInteract}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Processing Transaction...' : 
             !canInteract ? 'System Not Ready...' :
             !walletConnected ? 'Connect Wallet First' :
             'Join Room & Place Bet'}
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={createRoomTokenDialog}
        onClose={() => {
          setCreateRoomTokenDialog(false);
          setTokenValue('');
          setTokenError('');
          setServerError('');
        }}
        title="Create Game Room"
        subtitle="Set your bet amount to create a new room"
        showCloseButton
      >
        <div className="space-y-4">
          <div>
            <input
              type="number"
              placeholder="Token amount to bet (min: 10)"
              value={tokenValue}
              onChange={(e) => {
                setTokenValue(e.target.value);
                setTokenError('');
                setServerError('');
              }}
              className="input-field"
              min="10"
              step="1"
              disabled={isProcessing || !canInteract}
            />
            {tokenError && <p className="text-red-400 text-sm mt-1">{tokenError}</p>}
          </div>
          
          {serverError && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
              <p className="text-red-400 text-sm">{serverError}</p>
            </div>
          )}
          
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
            <p className="text-green-400 text-sm font-medium">Room Creation:</p>
            <ul className="text-white/70 text-sm mt-1 space-y-1">
              <li>• You'll play as White</li>
              <li>• Room ID will be generated automatically</li>
              <li>• Share the room ID with your opponent</li>
              <li>• All systems must be operational</li>
            </ul>
          </div>
          
          <button 
            onClick={handleCreateRoom} 
            disabled={isProcessing || !walletConnected || !canInteract}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Processing Transaction...' : 
             !canInteract ? 'System Not Ready...' :
             !walletConnected ? 'Connect Wallet First' :
             'Create Room & Place Bet'}
          </button>
        </div>
      </Modal>

      <CoinStore
        isOpen={coinStore}
        onClose={() => setCoinStore(false)}
      />
    </div>
  );
}