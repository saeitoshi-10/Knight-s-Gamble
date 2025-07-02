const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MyToken", function () {
  let myToken;
  let owner;
  let player1;
  let player2;
  let player3;

  beforeEach(async function () {
    [owner, player1, player2, player3] = await ethers.getSigners();
    
    const MyToken = await ethers.getContractFactory("MyToken");
    myToken = await MyToken.deploy();
    await myToken.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await myToken.owner()).to.equal(owner.address);
    });

    it("Should have correct token details", async function () {
      expect(await myToken.name()).to.equal("DeGenCoin");
      expect(await myToken.symbol()).to.equal("DGC");
      expect(await myToken.decimals()).to.equal(18);
    });
  });

  describe("Token Operations", function () {
    it("Should allow users to deposit ETH and receive tokens", async function () {
      const depositAmount = ethers.parseEther("1");
      const expectedTokens = depositAmount * BigInt(1000000);

      await myToken.connect(player1).deposit({ value: depositAmount });
      
      expect(await myToken.balanceOf(player1.address)).to.equal(expectedTokens);
    });

    it("Should allow users to withdraw tokens for ETH", async function () {
      const depositAmount = ethers.parseEther("1");
      const tokenAmount = depositAmount * BigInt(1000000);

      // First deposit
      await myToken.connect(player1).deposit({ value: depositAmount });
      
      // Then withdraw half
      const withdrawAmount = tokenAmount / BigInt(2);
      const expectedEth = withdrawAmount / BigInt(1000000);
      
      const initialBalance = await ethers.provider.getBalance(player1.address);
      
      const tx = await myToken.connect(player1).withdrawTokens(withdrawAmount);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      
      const finalBalance = await ethers.provider.getBalance(player1.address);
      
      expect(finalBalance).to.be.closeTo(
        initialBalance + expectedEth - gasUsed,
        ethers.parseEther("0.001") // Allow for small gas variations
      );
    });

    it("Should revert on insufficient balance withdrawal", async function () {
      const withdrawAmount = ethers.parseEther("1000000"); // 1M tokens
      
      await expect(
        myToken.connect(player1).withdrawTokens(withdrawAmount)
      ).to.be.revertedWithCustomError(myToken, "InsufficientBalance");
    });
  });

  describe("Game Operations", function () {
    beforeEach(async function () {
      // Give players some tokens
      await myToken.connect(player1).deposit({ value: ethers.parseEther("1") });
      await myToken.connect(player2).deposit({ value: ethers.parseEther("1") });
    });

    it("Should allow creating a game room", async function () {
      const roomId = "test-room-1";
      const betAmount = 100;

      await myToken.connect(player1).placeBet(betAmount, roomId, 0);
      
      const room = await myToken.getRoom(roomId);
      expect(room.player1).to.equal(player1.address);
      expect(room.bet1).to.equal(betAmount);
      expect(room.status).to.equal(1); // waiting
    });

    it("Should allow joining an existing room", async function () {
      const roomId = "test-room-2";
      const betAmount = 100;

      // Player 1 creates room
      await myToken.connect(player1).placeBet(betAmount, roomId, 0);
      
      // Player 2 joins room
      await myToken.connect(player2).placeBet(betAmount, roomId, 1);
      
      const room = await myToken.getRoom(roomId);
      expect(room.player2).to.equal(player2.address);
      expect(room.bet2).to.equal(betAmount);
      expect(room.status).to.equal(2); // active
    });

    it("Should finish game and distribute prizes correctly", async function () {
      const roomId = "test-room-3";
      const betAmount = 1000;

      // Setup game
      await myToken.connect(player1).placeBet(betAmount, roomId, 0);
      await myToken.connect(player2).placeBet(betAmount, roomId, 1);
      
      const initialBalance1 = await myToken.balanceOf(player1.address);
      const initialBalance2 = await myToken.balanceOf(player2.address);
      
      // Player 1 wins (winner = 0)
      await myToken.connect(owner).finishGame(roomId, 0);
      
      const finalBalance1 = await myToken.balanceOf(player1.address);
      const finalBalance2 = await myToken.balanceOf(player2.address);
      
      // Player 1 should receive 90% of total pot (1800 tokens)
      const expectedPrize = (betAmount * 2 * 90) / 100;
      expect(finalBalance1).to.equal(initialBalance1 + BigInt(expectedPrize));
      expect(finalBalance2).to.equal(initialBalance2); // No change for loser
    });

    it("Should handle draw correctly", async function () {
      const roomId = "test-room-4";
      const betAmount = 1000;

      // Setup game
      await myToken.connect(player1).placeBet(betAmount, roomId, 0);
      await myToken.connect(player2).placeBet(betAmount, roomId, 1);
      
      const initialBalance1 = await myToken.balanceOf(player1.address);
      const initialBalance2 = await myToken.balanceOf(player2.address);
      
      // Draw (winner = 2)
      await myToken.connect(owner).finishGame(roomId, 2);
      
      const finalBalance1 = await myToken.balanceOf(player1.address);
      const finalBalance2 = await myToken.balanceOf(player2.address);
      
      // Both players should receive 90% of their original bet back
      const expectedRefund = (betAmount * 90) / 100;
      expect(finalBalance1).to.equal(initialBalance1 + BigInt(expectedRefund));
      expect(finalBalance2).to.equal(initialBalance2 + BigInt(expectedRefund));
    });

    it("Should allow canceling waiting games", async function () {
      const roomId = "test-room-5";
      const betAmount = 100;

      await myToken.connect(player1).placeBet(betAmount, roomId, 0);
      
      const initialBalance = await myToken.balanceOf(player1.address);
      
      await myToken.connect(player1).cancelWaitingGame(roomId);
      
      const finalBalance = await myToken.balanceOf(player1.address);
      expect(finalBalance).to.equal(initialBalance + BigInt(betAmount));
    });

    it("Should revert on insufficient bet", async function () {
      const roomId = "test-room-6";
      const betAmount = 5; // Less than minimum (10)

      await expect(
        myToken.connect(player1).placeBet(betAmount, roomId, 0)
      ).to.be.revertedWithCustomError(myToken, "InsufficientBet");
    });

    it("Should revert when same player tries to join their own room", async function () {
      const roomId = "test-room-7";
      const betAmount = 100;

      await myToken.connect(player1).placeBet(betAmount, roomId, 0);
      
      await expect(
        myToken.connect(player1).placeBet(betAmount, roomId, 1)
      ).to.be.revertedWithCustomError(myToken, "UnauthorizedPlayer");
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to pause and unpause", async function () {
      await myToken.connect(owner).pause();
      
      await expect(
        myToken.connect(player1).deposit({ value: ethers.parseEther("1") })
      ).to.be.revertedWith("Pausable: paused");
      
      await myToken.connect(owner).unpause();
      
      // Should work after unpause
      await myToken.connect(player1).deposit({ value: ethers.parseEther("1") });
    });

    it("Should allow batch finishing games", async function () {
      const roomIds = ["batch-room-1", "batch-room-2"];
      const winners = [0, 1];
      const betAmount = 100;

      // Give players tokens
      await myToken.connect(player1).deposit({ value: ethers.parseEther("1") });
      await myToken.connect(player2).deposit({ value: ethers.parseEther("1") });

      // Setup games
      for (let i = 0; i < roomIds.length; i++) {
        await myToken.connect(player1).placeBet(betAmount, roomIds[i], 0);
        await myToken.connect(player2).placeBet(betAmount, roomIds[i], 1);
      }

      // Batch finish
      await myToken.connect(owner).batchFinishGames(roomIds, winners);

      // Check results
      for (let i = 0; i < roomIds.length; i++) {
        const room = await myToken.getRoom(roomIds[i]);
        expect(room.status).to.equal(3); // finished
      }
    });
  });

  describe("Security", function () {
    it("Should prevent non-owner from finishing games", async function () {
      const roomId = "security-test-1";
      
      await expect(
        myToken.connect(player1).finishGame(roomId, 0)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should prevent non-owner from pausing", async function () {
      await expect(
        myToken.connect(player1).pause()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
});