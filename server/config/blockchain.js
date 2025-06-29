const { ethers } = require('ethers');
const { abi } = require('../contracts/MyToken.json');

class BlockchainService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.contract = null;
    this.isInitialized = false;
  }

  async initialize() {
    try {
      const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";
      const privateKey = process.env.PRIVATE_KEY;
      const contractAddress = process.env.CONTRACT_ADDRESS;

      if (!privateKey || !contractAddress) {
        throw new Error('Missing blockchain configuration');
      }

      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      this.signer = new ethers.Wallet(privateKey, this.provider);
      this.contract = new ethers.Contract(contractAddress, abi, this.signer);

      // Test connection
      await this.provider.getNetwork();
      console.log('✅ Blockchain service initialized successfully');
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize blockchain service:', error.message);
      throw error;
    }
  }

  async gameStart(roomId) {
    if (!this.isInitialized) {
      throw new Error('Blockchain service not initialized');
    }

    try {
      console.log(`🎮 Starting game for room: ${roomId}`);
      const tx = await this.contract.gameStart(roomId);
      const receipt = await tx.wait();
      console.log(`✅ Game started successfully. Gas used: ${receipt.gasUsed}`);
      return receipt;
    } catch (error) {
      console.error(`❌ Failed to start game for room ${roomId}:`, error.message);
      throw new Error(`Game start failed: ${error.message}`);
    }
  }

  async gameEnd(winner, roomId) {
    if (!this.isInitialized) {
      throw new Error('Blockchain service not initialized');
    }

    try {
      console.log(`🏁 Ending game for room: ${roomId}, winner: ${winner}`);
      const tx = await this.contract.gameEnd(winner, roomId);
      const receipt = await tx.wait();
      console.log(`✅ Game ended successfully. Gas used: ${receipt.gasUsed}`);
      return receipt;
    } catch (error) {
      console.error(`❌ Failed to end game for room ${roomId}:`, error.message);
      throw new Error(`Game end failed: ${error.message}`);
    }
  }

  async validateRoomBets(roomId) {
    if (!this.isInitialized) {
      throw new Error('Blockchain service not initialized');
    }

    try {
      // This would need to be implemented in the smart contract
      // For now, we'll assume validation is done client-side
      return true;
    } catch (error) {
      console.error(`❌ Failed to validate bets for room ${roomId}:`, error.message);
      return false;
    }
  }
}

module.exports = new BlockchainService();