// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title DeGenCoin Chess Betting Token
 * @dev ERC20 token with chess game betting functionality
 * @notice This contract manages token deposits, game bets, and prize distribution
 */
contract MyToken is ERC20, Ownable, ReentrancyGuard, Pausable {
    // Constants for gas optimization
    uint256 private constant EXCHANGE_RATE = 1_000_000; // 1 ETH = 1M tokens
    uint256 private constant MIN_BET = 10;
    uint256 private constant HOUSE_FEE_PERCENT = 10; // 10% house fee
    uint256 private constant WINNER_PERCENT = 90; // 90% to winner
    uint256 private constant PRECISION = 100;

    // Structs for efficient storage
    struct GameRoom {
        address player1;
        address player2;
        uint256 bet1;
        uint256 bet2;
        uint8 status; // 0: empty, 1: waiting, 2: active, 3: finished
        uint32 createdAt;
    }

    // State variables
    mapping(string => GameRoom) private rooms;
    mapping(address => uint256) private pendingWithdrawals;
    
    // Events
    event GameInitialized(string indexed roomId, uint256 totalPot);
    event GameFinished(string indexed roomId, address indexed winner, uint256 prize);
    event BetPlaced(string indexed roomId, address indexed player, uint256 amount, uint8 position);
    event TokensDeposited(address indexed user, uint256 ethAmount, uint256 tokenAmount);
    event TokensWithdrawn(address indexed user, uint256 tokenAmount, uint256 ethAmount);
    event EmergencyWithdrawal(address indexed user, uint256 amount);

    // Custom errors for gas optimization
    error InsufficientBet(uint256 provided, uint256 required);
    error RoomNotFound(string roomId);
    error RoomAlreadyExists(string roomId);
    error GameAlreadyActive(string roomId);
    error GameNotActive(string roomId);
    error UnauthorizedPlayer(address player);
    error InvalidPosition(uint8 position);
    error InsufficientBalance(uint256 available, uint256 required);
    error TransferFailed();
    error InvalidWinner(uint8 winner);

    constructor() ERC20("DeGenCoin", "DGC") {
        _transferOwnership(msg.sender);
    }

    /**
     * @notice Deposit ETH to receive DGC tokens
     * @dev Exchange rate: 1 ETH = 1,000,000 DGC
     */
    function deposit() external payable nonReentrant whenNotPaused {
        if (msg.value == 0) revert InsufficientBet(0, 1);
        
        uint256 tokenAmount = msg.value * EXCHANGE_RATE;
        _mint(msg.sender, tokenAmount);
        
        emit TokensDeposited(msg.sender, msg.value, tokenAmount);
    }

    /**
     * @notice Withdraw DGC tokens for ETH
     * @param tokenAmount Amount of tokens to withdraw
     */
    function withdrawTokens(uint256 tokenAmount) external nonReentrant whenNotPaused {
        if (tokenAmount == 0) revert InsufficientBet(0, 1);
        if (balanceOf(msg.sender) < tokenAmount) {
            revert InsufficientBalance(balanceOf(msg.sender), tokenAmount);
        }

        uint256 ethAmount = tokenAmount / EXCHANGE_RATE;
        if (address(this).balance < ethAmount) {
            revert InsufficientBalance(address(this).balance, ethAmount);
        }

        _burn(msg.sender, tokenAmount);
        
        (bool success, ) = payable(msg.sender).call{value: ethAmount}("");
        if (!success) revert TransferFailed();
        
        emit TokensWithdrawn(msg.sender, tokenAmount, ethAmount);
    }

    /**
     * @notice Place a bet and join/create a game room
     * @param betAmount Amount of tokens to bet
     * @param roomId Unique identifier for the game room
     * @param position Player position (0 or 1)
     */
    function placeBet(
        uint256 betAmount,
        string calldata roomId,
        uint8 position
    ) external nonReentrant whenNotPaused {
        if (betAmount < MIN_BET) revert InsufficientBet(betAmount, MIN_BET);
        if (position > 1) revert InvalidPosition(position);
        if (balanceOf(msg.sender) < betAmount) {
            revert InsufficientBalance(balanceOf(msg.sender), betAmount);
        }

        GameRoom storage room = rooms[roomId];
        
        // Create new room or join existing
        if (room.status == 0) {
            // Create new room
            room.player1 = msg.sender;
            room.bet1 = betAmount;
            room.status = 1; // waiting
            room.createdAt = uint32(block.timestamp);
        } else if (room.status == 1) {
            // Join existing room
            if (room.player1 == msg.sender) revert UnauthorizedPlayer(msg.sender);
            
            room.player2 = msg.sender;
            room.bet2 = betAmount;
            room.status = 2; // active
        } else {
            revert GameAlreadyActive(roomId);
        }

        // Transfer tokens to contract
        _transfer(msg.sender, address(this), betAmount);
        
        emit BetPlaced(roomId, msg.sender, betAmount, position);
        
        // Emit game initialization if room is now full
        if (room.status == 2) {
            uint256 totalPot = room.bet1 + room.bet2;
            emit GameInitialized(roomId, totalPot);
        }
    }

    /**
     * @notice Finish a game and distribute prizes
     * @param roomId Game room identifier
     * @param winner Winner position (0, 1, or 2 for draw)
     */
    function finishGame(string calldata roomId, uint8 winner) external onlyOwner nonReentrant {
        GameRoom storage room = rooms[roomId];
        
        if (room.status != 2) revert GameNotActive(roomId);
        if (winner > 2) revert InvalidWinner(winner);

        uint256 totalPot = room.bet1 + room.bet2;
        uint256 houseFee = (totalPot * HOUSE_FEE_PERCENT) / PRECISION;
        uint256 remainingPot = totalPot - houseFee;

        address player1 = room.player1;
        address player2 = room.player2;
        address gameWinner;
        uint256 prize;

        if (winner == 2) {
            // Draw - return 90% of original bets
            uint256 refund1 = (room.bet1 * WINNER_PERCENT) / PRECISION;
            uint256 refund2 = (room.bet2 * WINNER_PERCENT) / PRECISION;
            
            _transfer(address(this), player1, refund1);
            _transfer(address(this), player2, refund2);
            
            gameWinner = address(0); // No winner in draw
            prize = 0;
        } else {
            // Winner takes 90% of total pot
            gameWinner = (winner == 0) ? player1 : player2;
            prize = remainingPot;
            
            _transfer(address(this), gameWinner, prize);
        }

        // Mark room as finished
        room.status = 3;
        
        emit GameFinished(roomId, gameWinner, prize);
    }

    /**
     * @notice Emergency function to cancel a waiting game
     * @param roomId Game room identifier
     */
    function cancelWaitingGame(string calldata roomId) external nonReentrant {
        GameRoom storage room = rooms[roomId];
        
        if (room.status != 1) revert GameNotActive(roomId);
        if (room.player1 != msg.sender) revert UnauthorizedPlayer(msg.sender);

        // Refund the bet
        _transfer(address(this), msg.sender, room.bet1);
        
        // Reset room
        delete rooms[roomId];
        
        emit EmergencyWithdrawal(msg.sender, room.bet1);
    }

    /**
     * @notice Get game room information
     * @param roomId Game room identifier
     * @return Room details
     */
    function getRoom(string calldata roomId) external view returns (
        address player1,
        address player2,
        uint256 bet1,
        uint256 bet2,
        uint8 status,
        uint32 createdAt
    ) {
        GameRoom storage room = rooms[roomId];
        return (room.player1, room.player2, room.bet1, room.bet2, room.status, room.createdAt);
    }

    /**
     * @notice Check if a room exists and is active
     * @param roomId Game room identifier
     * @return exists Whether the room exists
     * @return isActive Whether the room is active (status == 2)
     */
    function isRoomActive(string calldata roomId) external view returns (bool exists, bool isActive) {
        GameRoom storage room = rooms[roomId];
        exists = room.status > 0;
        isActive = room.status == 2;
    }

    /**
     * @notice Get contract balance information
     * @return ethBalance ETH balance of the contract
     * @return tokenSupply Total token supply
     */
    function getContractInfo() external view returns (uint256 ethBalance, uint256 tokenSupply) {
        return (address(this).balance, totalSupply());
    }

    /**
     * @notice Emergency pause function
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Emergency withdrawal for owner (only house fees)
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner nonReentrant {
        if (address(this).balance < amount) {
            revert InsufficientBalance(address(this).balance, amount);
        }
        
        (bool success, ) = payable(owner()).call{value: amount}("");
        if (!success) revert TransferFailed();
    }

    /**
     * @notice Batch finish multiple games (gas optimization)
     * @param roomIds Array of room identifiers
     * @param winners Array of winners corresponding to rooms
     */
    function batchFinishGames(
        string[] calldata roomIds,
        uint8[] calldata winners
    ) external onlyOwner nonReentrant {
        if (roomIds.length != winners.length) revert InvalidPosition(0);
        
        for (uint256 i = 0; i < roomIds.length; i++) {
            // Internal call to avoid reentrancy issues
            _finishGameInternal(roomIds[i], winners[i]);
        }
    }

    /**
     * @dev Internal function to finish a game
     */
    function _finishGameInternal(string calldata roomId, uint8 winner) internal {
        GameRoom storage room = rooms[roomId];
        
        if (room.status != 2) return; // Skip invalid rooms
        if (winner > 2) return; // Skip invalid winners

        uint256 totalPot = room.bet1 + room.bet2;
        uint256 houseFee = (totalPot * HOUSE_FEE_PERCENT) / PRECISION;
        uint256 remainingPot = totalPot - houseFee;

        address player1 = room.player1;
        address player2 = room.player2;
        address gameWinner;
        uint256 prize;

        if (winner == 2) {
            // Draw
            uint256 refund1 = (room.bet1 * WINNER_PERCENT) / PRECISION;
            uint256 refund2 = (room.bet2 * WINNER_PERCENT) / PRECISION;
            
            _transfer(address(this), player1, refund1);
            _transfer(address(this), player2, refund2);
            
            gameWinner = address(0);
            prize = 0;
        } else {
            gameWinner = (winner == 0) ? player1 : player2;
            prize = remainingPot;
            
            _transfer(address(this), gameWinner, prize);
        }

        room.status = 3;
        emit GameFinished(roomId, gameWinner, prize);
    }

    /**
     * @notice Clean up finished games to free storage
     * @param roomIds Array of finished room IDs to clean up
     */
    function cleanupFinishedGames(string[] calldata roomIds) external onlyOwner {
        for (uint256 i = 0; i < roomIds.length; i++) {
            GameRoom storage room = rooms[roomIds[i]];
            if (room.status == 3) {
                delete rooms[roomIds[i]];
            }
        }
    }

    // Fallback function to receive ETH
    receive() external payable {
        // Allow contract to receive ETH for withdrawals
    }
}