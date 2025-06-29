import { useState } from "react";
import Modal from "./Modal";
import socket from "../socket";
import CoinStore from './CoinStore';
import { ethers } from "ethers";
import token from "./MyToken.json";
const { v4: uuidV4 } = require('uuid');

const { ethereum } = window;

export default function InitGame({ setRoom, setOrientation, setPlayers }) {
  const abi = token.abi;
  const [roomDialogOpen, setRoomDialogOpen] = useState(false);
  const [roomInput, setRoomInput] = useState('');
  const [roomError, setRoomError] = useState('');
  const [coinStore, setCoinStore] = useState(false);
  const [createRoomTokenDialog, setCreateRoomTokenDialog] = useState(false);
  const [tokenValue, setTokenValue] = useState(0);
  const [tokenError, setTokenError] = useState("");

  const handleJoinRoom = async () => {
    const provider = await new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = await new ethers.Contract("0x5FbDB2315678afecb367f032d93F642f64180aa3", abi, signer);

    if (!roomInput || tokenValue < 10) return;
    
    try {
      await ethereum.request({
        "method": "wallet_switchEthereumChain",
        "params": [{ "chainId": "0x7A69" }]
      });
      
      const accounts = await ethereum.request({ method: "eth_requestAccounts" });
      const tx = await contract.receiveFunds(accounts[0], tokenValue, roomInput, 0);
      await tx.wait();
      
      socket.emit("joinRoom", { roomId: roomInput }, (r) => {
        if (r.error) return setRoomError(r.message);
        console.log("response: ", r);
        setRoom(r.roomId);
        setPlayers(r.players);
        setOrientation("black");
        setRoomDialogOpen(false);
      });
    } catch (error) {
      console.log(error);
      setTokenError(error.message || "Transaction failed");
    }
  };

  const handleCreateRoom = async () => {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract("0x5FbDB2315678afecb367f032d93F642f64180aa3", abi, signer);
    const roomID = uuidV4();
    
    try {
      await ethereum.request({
        "method": "wallet_switchEthereumChain",
        "params": [{ "chainId": "0x7A69" }]
      });
      
      const accounts = await ethereum.request({ method: "eth_requestAccounts" });
      const tx = await contract.receiveFunds(accounts[0], tokenValue, roomID, 1);
      await tx.wait();
      
      socket.emit("createRoom", roomID, (r) => {
        console.log(r);
        setRoom(r);
        setOrientation("white");
      });
      
      setTokenError("");
      setTokenValue(0);
      setCreateRoomTokenDialog(false);
    } catch (error) {
      setTokenError(error.message || "Transaction failed");
    }
  };

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
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button
            onClick={() => setCoinStore(true)}
            className="btn-secondary min-w-[200px] flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
            Coin Store
          </button>
          
          <button
            onClick={() => setCreateRoomTokenDialog(true)}
            className="btn-primary min-w-[200px] flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create Room
          </button>
          
          <button
            onClick={() => setRoomDialogOpen(true)}
            className="btn-secondary min-w-[200px] flex items-center justify-center gap-2"
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
        onClose={() => setRoomDialogOpen(false)}
        title="Join Game Room"
        subtitle="Enter room ID and your bet amount"
        showCloseButton
      >
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Room ID"
            value={roomInput}
            onChange={(e) => setRoomInput(e.target.value)}
            className="input-field"
          />
          <input
            type="number"
            placeholder="Token amount to bet (min: 10)"
            value={tokenValue}
            onChange={(e) => setTokenValue(e.target.value)}
            className="input-field"
            min="10"
          />
          {roomError && <p className="text-red-400 text-sm">{roomError}</p>}
          {tokenError && <p className="text-red-400 text-sm">{tokenError}</p>}
          <button onClick={handleJoinRoom} className="btn-primary w-full">
            Join Room & Place Bet
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={createRoomTokenDialog}
        onClose={() => setCreateRoomTokenDialog(false)}
        title="Create Game Room"
        subtitle="Set your bet amount to create a new room"
        showCloseButton
      >
        <div className="space-y-4">
          <input
            type="number"
            placeholder="Token amount to bet (min: 10)"
            value={tokenValue}
            onChange={(e) => setTokenValue(e.target.value)}
            className="input-field"
            min="10"
          />
          {tokenError && <p className="text-red-400 text-sm">{tokenError}</p>}
          <button onClick={handleCreateRoom} className="btn-primary w-full">
            Create Room & Place Bet
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