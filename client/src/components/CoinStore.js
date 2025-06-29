import { useState } from "react";
import Modal from "./Modal";
import { ethers } from "ethers";
import token from "./MyToken.json";

const { ethereum } = window;

export default function CoinStore({ isOpen, onClose }) {
  const abi = token.abi;
  const [activeTab, setActiveTab] = useState('buy');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [balance, setBalance] = useState(null);

  const handleBuy = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract("0x5FbDB2315678afecb367f032d93F642f64180aa3", abi, signer);
      
      await ethereum.request({
        "method": "wallet_switchEthereumChain",
        "params": [{ "chainId": "0x7A69" }]
      });
      
      const tx = await contract.deposit({ value: ethers.parseEther(amount) });
      await tx.wait();
      
      setSuccess(`Successfully bought ${parseFloat(amount) * 1000000} DGC tokens!`);
      setAmount('');
    } catch (error) {
      setError(error.message || "Transaction failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSell = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract("0x5FbDB2315678afecb367f032d93F642f64180aa3", abi, signer);
      
      await ethereum.request({
        "method": "wallet_switchEthereumChain",
        "params": [{ "chainId": "0x7A69" }]
      });
      
      const accounts = await ethereum.request({ method: "eth_requestAccounts" });
      const tx = await contract.WithdrawCoin(accounts[0], amount);
      await tx.wait();
      
      setSuccess(`Successfully sold ${amount} DGC tokens!`);
      setAmount('');
    } catch (error) {
      setError(error.message || "Transaction failed");
    } finally {
      setLoading(false);
    }
  };

  const getBalance = async () => {
    setLoading(true);
    setError('');
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract("0x5FbDB2315678afecb367f032d93F642f64180aa3", abi, signer);
      
      await ethereum.request({
        "method": "wallet_switchEthereumChain",
        "params": [{ "chainId": "0x7A69" }]
      });
      
      const accounts = await ethereum.request({ method: "eth_requestAccounts" });
      const balance = await contract.balanceOf(accounts[0]);
      setBalance(ethers.formatUnits(balance, 18));
    } catch (error) {
      setError(error.message || "Failed to get balance");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="DGC Coin Store"
      subtitle="Buy and sell DeGenCoin tokens"
      showCloseButton
    >
      <div className="space-y-6">
        {/* Balance Display */}
        <div className="card p-4 text-center">
          <p className="text-white/70 mb-2">Your Balance</p>
          <p className="text-2xl font-bold text-blue-400">
            {balance !== null ? `${parseFloat(balance).toFixed(2)} DGC` : '---'}
          </p>
          <button
            onClick={getBalance}
            disabled={loading}
            className="btn-secondary mt-2 text-sm py-2 px-4"
          >
            {loading ? 'Loading...' : 'Refresh Balance'}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex bg-white/10 rounded-xl p-1">
          <button
            onClick={() => setActiveTab('buy')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
              activeTab === 'buy'
                ? 'bg-blue-500 text-white'
                : 'text-white/70 hover:text-white'
            }`}
          >
            Buy Tokens
          </button>
          <button
            onClick={() => setActiveTab('sell')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
              activeTab === 'sell'
                ? 'bg-red-500 text-white'
                : 'text-white/70 hover:text-white'
            }`}
          >
            Sell Tokens
          </button>
        </div>

        {/* Buy Tab */}
        {activeTab === 'buy' && (
          <div className="space-y-4">
            <div>
              <label className="block text-white/70 mb-2">ETH Amount</label>
              <input
                type="number"
                placeholder="Enter ETH amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="input-field"
                step="0.001"
                min="0"
              />
              <p className="text-white/50 text-sm mt-1">
                You'll receive: {amount ? (parseFloat(amount) * 1000000).toLocaleString() : '0'} DGC
              </p>
            </div>
            <button
              onClick={handleBuy}
              disabled={loading || !amount}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Buy Tokens'}
            </button>
          </div>
        )}

        {/* Sell Tab */}
        {activeTab === 'sell' && (
          <div className="space-y-4">
            <div>
              <label className="block text-white/70 mb-2">DGC Amount</label>
              <input
                type="number"
                placeholder="Enter DGC amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="input-field"
                min="0"
              />
              <p className="text-white/50 text-sm mt-1">
                You'll receive: {amount ? (parseFloat(amount) / 1000000).toFixed(6) : '0'} ETH
              </p>
            </div>
            <button
              onClick={handleSell}
              disabled={loading || !amount}
              className="bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-xl w-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Sell Tokens'}
            </button>
          </div>
        )}

        {/* Messages */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-3">
            <p className="text-green-400 text-sm">{success}</p>
          </div>
        )}

        {/* Exchange Rate Info */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
          <p className="text-blue-400 text-sm font-medium mb-1">Exchange Rate</p>
          <p className="text-white/70 text-sm">1 ETH = 1,000,000 DGC</p>
        </div>
      </div>
    </Modal>
  );
}