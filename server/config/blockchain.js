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

  async validateRoomBets(roomId) {
    if (!this.isInitialized) {
      throw new Error('Blockchain service not initialized');
    }

    try {
      console.log(`🔍 Validating room bets for: ${roomId}`);
      const roomData = await this.contract.getRoom(roomId);
      
      if (roomData.status !== 2) {
        throw new Error('Room is not in active state');
      }
      
      console.log(`✅ Room validation successful for: ${roomId}`);
      return {
        player1: roomData.player1,
        player2: roomData.player2,
        bet1: roomData.bet1.toString(),
        bet2: roomData.bet2.toString(),
        status: roomData.status,
        totalPot: (BigInt(roomData.bet1) + BigInt(roomData.bet2)).toString()
      };
    } catch (error) {
      console.error(`❌ Failed to validate room ${roomId}:`, error.message);
      throw new Error(`Room validation failed: ${error.message}`);
    }
  }

  async finishGame(roomId, winner) {
    if (!this.isInitialized) {
      throw new Error('Blockchain service not initialized');
    }

    try {
      console.log(`🏁 Ending game for room: ${roomId}, winner: ${winner}`);
      const tx = await this.contract.finishGame(roomId, winner);
      const receipt = await tx.wait();
      console.log(`✅ Game ended successfully. Gas used: ${receipt.gasUsed}`);
      return receipt;
    } catch (error) {
      console.error(`❌ Failed to end game for room ${roomId}:`, error.message);
      throw new Error(`Game end failed: ${error.message}`);
    }
  }

  async getRoomInfo(roomId) {
    if (!this.isInitialized) {
      throw new Error('Blockchain service not initialized');
    }

    try {
      const roomData = await this.contract.getRoom(roomId);
      return {
        player1: roomData.player1,
        player2: roomData.player2,
        bet1: roomData.bet1.toString(),
        bet2: roomData.bet2.toString(),
        status: roomData.status,
        createdAt: roomData.createdAt
      };
    } catch (error) {
      console.error(`❌ Failed to get room info for ${roomId}:`, error.message);
      throw new Error(`Get room info failed: ${error.message}`);
    }
  }

  async isRoomActive(roomId) {
    if (!this.isInitialized) {
      throw new Error('Blockchain service not initialized');
    }

    try {
      const result = await this.contract.isRoomActive(roomId);
      return {
        exists: result.exists,
        isActive: result.isActive
      };
    } catch (error) {
      console.error(`❌ Failed to check room status for ${roomId}:`, error.message);
      return { exists: false, isActive: false };
    }
  }

  async batchFinishGames(roomIds, winners) {
    if (!this.isInitialized) {
      throw new Error('Blockchain service not initialized');
    }

    try {
      console.log(`🏁 Batch ending ${roomIds.length} games`);
      const tx = await this.contract.batchFinishGames(roomIds, winners);
      const receipt = await tx.wait();
      console.log(`✅ Batch game end successful. Gas used: ${receipt.gasUsed}`);
      return receipt;
    } catch (error) {
      console.error(`❌ Failed to batch end games:`, error.message);
      throw new Error(`Batch game end failed: ${error.message}`);
    }
  }

  async getContractInfo() {
    if (!this.isInitialized) {
      throw new Error('Blockchain service not initialized');
    }

    try {
      const info = await this.contract.getContractInfo();
      return {
        ethBalance: ethers.formatEther(info.ethBalance),
        tokenSupply: ethers.formatUnits(info.tokenSupply, 18)
      };
    } catch (error) {
      console.error(`❌ Failed to get contract info:`, error.message);
      throw new Error(`Get contract info failed: ${error.message}`);
    }
  }
}

module.exports = new BlockchainService();