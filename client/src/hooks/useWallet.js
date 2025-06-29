import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

export const useWallet = () => {
  const [account, setAccount] = useState(null);
  const [balance, setBalance] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const connectWallet = async () => {
    if (!window.ethereum) {
      setError('MetaMask is not installed');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      // Switch to correct network
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x7A69' }]
      });

      setAccount(accounts[0]);
      setIsConnected(true);
      
      // Get balance
      await updateBalance(accounts[0]);
      
      return true;
    } catch (error) {
      console.error('Wallet connection error:', error);
      setError(error.message || 'Failed to connect wallet');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updateBalance = async (address = account) => {
    if (!address || !window.ethereum) return;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const balance = await provider.getBalance(address);
      setBalance(ethers.formatEther(balance));
    } catch (error) {
      console.error('Balance update error:', error);
    }
  };

  const checkNetwork = async () => {
    if (!window.ethereum) return false;

    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      return chainId === '0x7A69';
    } catch (error) {
      console.error('Network check error:', error);
      return false;
    }
  };

  useEffect(() => {
    if (window.ethereum) {
      // Check if already connected
      window.ethereum.request({ method: 'eth_accounts' })
        .then(accounts => {
          if (accounts.length > 0) {
            setAccount(accounts[0]);
            setIsConnected(true);
            updateBalance(accounts[0]);
          }
        });

      // Listen for account changes
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          setAccount(null);
          setIsConnected(false);
          setBalance(null);
        } else {
          setAccount(accounts[0]);
          updateBalance(accounts[0]);
        }
      });

      // Listen for network changes
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, []);

  return {
    account,
    balance,
    isConnected,
    isLoading,
    error,
    connectWallet,
    updateBalance,
    checkNetwork
  };
};