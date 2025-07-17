import { useState } from "react";
import Modal from "./Modal";
import { ethers } from "ethers";
import token from "./MyToken.json";
import { validateEthAmount, validateTokenAmount, validateSufficientBalance } from "../utils/validation";
import { useWallet } from "../hooks/useWallet";

export default function CoinStore({ isOpen, onClose }) {
  const abi = token.abi;
  const [activeTab, setActiveTab] = useState('buy');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tokenBalance, setTokenBalance] = useState(null);
  
  const { account, balance, isConnected, connectWallet, updateBalance } = useWallet();

  const getTokenBalance = async () => {
    if (!isConnected || !account) return;
    
    setLoading(true);
    setError('');
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract("0x5FbDB2315678afecb367f032d93F642f64180aa3", abi, signer);
      
      const balance = await contract.balanceOf(account);
      setTokenBalance(balance.toString());
    } catch (error) {
      console.error('Token balance error:', error);
      setError("Failed to get token balance");
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async () => {
    if (loading) return;
    
    // Validate ETH amount
    const ethValidation = validateEthAmount(amount);
    if (!ethValidation.isValid) {
      setError(ethValidation.error);
      return;
    }
    
    // Check ETH balance
    if (balance) {
      const balanceValidation = validateSufficientBalance(balance, amount);
      if (!balanceValidation.isValid) {
        setError(balanceValidation.error);
        return;
      }
    }
    
    if (!isConnected) {
      setError("Please connect your wallet first");
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract("0x5FbDB2315678afecb367f032d93F642f64180aa3", abi, signer);
      
      // Estimate gas before transaction
      const ethValue = ethers.parseEther(amount);
      try {
        await contract.deposit.estimateGas({ value: ethValue });
      } catch (gasError) {
        setError("Transaction would fail. Please check your ETH balance and try again.");
        return;
      }
      
      const tx = await contract.deposit({ value: ethValue });
      await tx.wait();
      
      const tokensReceived = BigInt(ethers.parseEther(amount)) * BigInt(1000000);
      setSuccess(`Successfully bought ${tokensReceived.toLocaleString()} DGC tokens!`);
      setAmount('');
      
      // Update balances
      updateBalance();
      getTokenBalance();
    } catch (error) {
      console.error('Buy transaction error:', error);
      if (error.code === 4001) {
        setError("Transaction rejected by user");
      } else if (error.code === -32603) {
        setError("Transaction failed. Please check your ETH balance and try again.");
      } else {
        setError(error.message || "Transaction failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSell = async () => {
    if (loading) return;
    
    // Validate token amount
    const tokenValidation = validateTokenAmount(amount, 1);
    if (!tokenValidation.isValid) {
      setError(tokenValidation.error);
      return;
    }
    
    // Check token balance
    if (tokenBalance) {
      const balanceValidation = validateSufficientBalance(tokenBalance, amount);
      if (!balanceValidation.isValid) {
        setError(balanceValidation.error);
        return;
      }
    }
    
    if (!isConnected) {
      setError("Please connect your wallet first");
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract("0x5FbDB2315678afecb367f032d93F642f64180aa3", abi, signer);
      
      // Estimate gas before transaction
      try {
        await contract.withdrawTokens.estimateGas(BigInt(amount));
      } catch (gasError) {
        setError("Transaction would fail. Please check your token balance and try again.");
        return;
      }
      
      const tx = await contract.withdrawTokens(BigInt(amount));
      await tx.wait();
      
      const ethReceived = BigInt(amount) / BigInt(1000000);
      setSuccess(`Successfully sold ${amount} DGC tokens for ${ethReceived.toFixed(6)} ETH!`);
      setAmount('');
      
      // Update balances
      updateBalance();
      getTokenBalance();
    } catch (error) {
      console.error('Sell transaction error:', error);
      if (error.code === 4001) {
        setError("Transaction rejected by user");
      } else if (error.code === -32603) {
        setError("Transaction failed. Please check your token balance and try again.");
      } else {
        setError(error.message || "Transaction failed");
      }
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch token balance when modal opens and wallet is connected
  useState(() => {
    if (isOpen && isConnected) {
      getTokenBalance();
    }
  }, [isOpen, isConnected]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        onClose();
        setAmount('');
        setError('');
        setSuccess('');
      }}
      title="DGC Coin Store"
      subtitle="Buy and sell DeGenCoin tokens"
      showCloseButton
    >
      <div className="space-y-6">
        {/* Wallet Connection Check */}
        {!isConnected ? (
          <div className="text-center space-y-4">
            <p className="text-white/70">Connect your wallet to access the coin store</p>
            <button onClick={connectWallet} className="btn-primary">
              Connect Wallet
            </button>
          </div>
        ) : (
          <>
            {/* Balance Display */}
            <div className="grid grid-cols-2 gap-4">
              <div className="card p-4 text-center">
                <p className="text-white/70 mb-2">ETH Balance</p>
                <p className="text-xl font-bold text-blue-400">
                  {balance ? `${parseFloat(balance).toFixed(4)} ETH` : 'Loading...'}
                </p>
              </div>
              <div className="card p-4 text-center">
                <p className="text-white/70 mb-2">DGC Balance</p>
                <p className="text-xl font-bold text-purple-400">
                  {tokenBalance !== null ? `${tokenBalance} DGC` : 'Loading...'}
                </p>
                <button
                  onClick={getTokenBalance}
                  disabled={loading}
                  className="btn-secondary mt-2 text-xs py-1 px-2"
                >
                  {loading ? 'Loading...' : 'Refresh'}
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex bg-white/10 rounded-xl p-1">
              <button
                onClick={() => {
                  setActiveTab('buy');
                  setAmount('');
                  setError('');
                  setSuccess('');
                }}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                  activeTab === 'buy'
                    ? 'bg-blue-500 text-white'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                Buy Tokens
              </button>
              <button
                onClick={() => {
                  setActiveTab('sell');
                  setAmount('');
                  setError('');
                  setSuccess('');
                }}
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
                    placeholder="Enter ETH amount (min: 0.001)"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      setError('');
                      setSuccess('');
                    }}
                    className="input-field"
                    step="0.001"
                    min="0.001"
                    max="100"
                    disabled={loading}
                  />
                  <div className="flex justify-between text-sm mt-1">
                    <p className="text-white/50">
                      You'll receive: {amount ? (BigInt(ethers.parseEther(amount || '0')) * BigInt(1000000)).toString() : '0'} DGC
                    </p>
                    <p className="text-white/50">
                      Available: {balance ? `${parseFloat(balance).toFixed(4)} ETH` : '0 ETH'}
                    </p>
                  </div>
                </div>
                
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                  <p className="text-blue-400 text-sm font-medium">Exchange Rate</p>
                  <p className="text-white/70 text-sm">1 ETH = 1,000,000 DGC</p>
                </div>
                
                <button
                  onClick={handleBuy}
                  disabled={loading || !amount || parseFloat(amount) <= 0}
                  className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Processing Transaction...' : 'Buy Tokens'}
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
                    placeholder="Enter DGC amount (min: 1)"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      setError('');
                      setSuccess('');
                    }}
                    className="input-field"
                    min="1"
                    step="1"
                    disabled={loading}
                  />
                  <div className="flex justify-between text-sm mt-1">
                    <p className="text-white/50">
                      You'll receive: {amount ? ethers.formatEther(BigInt(amount || '0') / BigInt(1000000)) : '0'} ETH
                    </p>
                    <p className="text-white/50">
                      Available: {tokenBalance ? `${tokenBalance} DGC` : '0 DGC'}
                    </p>
                  </div>
                </div>
                
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <p className="text-red-400 text-sm font-medium">Important</p>
                  <p className="text-white/70 text-sm">Selling tokens converts them back to ETH at the same rate</p>
                </div>
                
                <button
                  onClick={handleSell}
                  disabled={loading || !amount || parseFloat(amount) <= 0}
                  className="bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-xl w-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Processing Transaction...' : 'Sell Tokens'}
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
          </>
        )}
      </div>
    </Modal>
  );
}