// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract MyToken is ERC20, Ownable, ReentrancyGuard, Pausable {
    uint256 private constant EXCHANGE_RATE = 1_000_000;
    uint256 private constant MIN_BET = 10;
    uint256 private constant HOUSE_FEE_PERCENT = 10;
    uint256 private constant WINNER_PERCENT = 90;
    uint256 private constant PRECISION = 100;

    struct GameRoom {
        address player1;
        address player2;
        uint128 bet1;
        uint128 bet2;
        uint8 status;
        uint32 createdAt;
    }

    mapping(string => GameRoom) private rooms;
    
    event GameInitialized(string indexed roomId, uint256 totalPot);
    event GameFinished(string indexed roomId, address indexed winner, uint256 prize);
    event BetPlaced(string indexed roomId, address indexed player, uint256 amount, uint8 position);
    event TokensDeposited(address indexed user, uint256 ethAmount, uint256 tokenAmount);
    event TokensWithdrawn(address indexed user, uint256 tokenAmount, uint256 ethAmount);
    event EmergencyWithdrawal(address indexed user, uint256 amount);

    error InsufficientBet(uint256 provided, uint256 required);
    error RoomNotFound(string roomId);
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

    function deposit() external payable nonReentrant whenNotPaused {
        if (msg.value == 0) revert InsufficientBet(0, 1);
        
        uint256 tokenAmount;
        unchecked {
            tokenAmount = msg.value * EXCHANGE_RATE;
        }
        
        _mint(msg.sender, tokenAmount);
        emit TokensDeposited(msg.sender, msg.value, tokenAmount);
    }

    function withdrawTokens(uint256 tokenAmount) external nonReentrant whenNotPaused {
        if (tokenAmount == 0) revert InsufficientBet(0, 1);
        
        uint256 userBalance = balanceOf(msg.sender);
        if (userBalance < tokenAmount) {
            revert InsufficientBalance(userBalance, tokenAmount);
        }

        uint256 ethAmount;
        unchecked {
            ethAmount = tokenAmount / EXCHANGE_RATE;
        }
        
        if (address(this).balance < ethAmount) {
            revert InsufficientBalance(address(this).balance, ethAmount);
        }

        _burn(msg.sender, tokenAmount);
        
        (bool success, ) = payable(msg.sender).call{value: ethAmount}("");
        if (!success) revert TransferFailed();
        
        emit TokensWithdrawn(msg.sender, tokenAmount, ethAmount);
    }

    function placeBet(
        uint256 betAmount,
        string calldata roomId,
        uint8 position
    ) external nonReentrant whenNotPaused {
        if (betAmount < MIN_BET) revert InsufficientBet(betAmount, MIN_BET);
        if (position > 1) revert InvalidPosition(position);
        if (betAmount > type(uint128).max) revert InsufficientBet(betAmount, type(uint128).max);
        
        uint256 userBalance = balanceOf(msg.sender);
        if (userBalance < betAmount) {
            revert InsufficientBalance(userBalance, betAmount);
        }

        GameRoom storage room = rooms[roomId];
        
        if (room.status == 0) {
            room.player1 = msg.sender;
            room.bet1 = uint128(betAmount);
            room.status = 1;
            room.createdAt = uint32(block.timestamp);
        } else if (room.status == 1) {
            if (room.player1 == msg.sender) revert UnauthorizedPlayer(msg.sender);
            
            room.player2 = msg.sender;
            room.bet2 = uint128(betAmount);
            room.status = 2;
        } else {
            revert GameAlreadyActive(roomId);
        }

        _transfer(msg.sender, address(this), betAmount);
        emit BetPlaced(roomId, msg.sender, betAmount, position);
        
        if (room.status == 2) {
            uint256 totalPot;
            unchecked {
                totalPot = uint256(room.bet1) + uint256(room.bet2);
            }
            emit GameInitialized(roomId, totalPot);
        }
    }

    function finishGame(string calldata roomId, uint8 winner) external onlyOwner nonReentrant {
        GameRoom storage room = rooms[roomId];
        
        if (room.status != 2) revert GameNotActive(roomId);
        if (winner > 2) revert InvalidWinner(winner);

        uint256 totalPot;
        unchecked {
            totalPot = uint256(room.bet1) + uint256(room.bet2);
        }
        
        uint256 houseFee;
        uint256 remainingPot;
        unchecked {
            houseFee = (totalPot * HOUSE_FEE_PERCENT) / PRECISION;
            remainingPot = totalPot - houseFee;
        }

        address player1 = room.player1;
        address player2 = room.player2;
        address gameWinner;
        uint256 prize;

        if (winner == 2) {
            uint256 refund1;
            uint256 refund2;
            unchecked {
                refund1 = (uint256(room.bet1) * WINNER_PERCENT) / PRECISION;
                refund2 = (uint256(room.bet2) * WINNER_PERCENT) / PRECISION;
            }
            
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

    function cancelWaitingGame(string calldata roomId) external nonReentrant {
        GameRoom storage room = rooms[roomId];
        
        if (room.status != 1) revert GameNotActive(roomId);
        if (room.player1 != msg.sender) revert UnauthorizedPlayer(msg.sender);

        uint256 refundAmount = uint256(room.bet1);
        _transfer(address(this), msg.sender, refundAmount);
        
        delete rooms[roomId];
        emit EmergencyWithdrawal(msg.sender, refundAmount);
    }

    function getRoom(string calldata roomId) external view returns (
        address player1,
        address player2,
        uint256 bet1,
        uint256 bet2,
        uint8 status,
        uint32 createdAt
    ) {
        GameRoom storage room = rooms[roomId];
        return (
            room.player1, 
            room.player2, 
            uint256(room.bet1), 
            uint256(room.bet2), 
            room.status, 
            room.createdAt
        );
    }

    function isRoomActive(string calldata roomId) external view returns (bool exists, bool isActive) {
        GameRoom storage room = rooms[roomId];
        exists = room.status > 0;
        isActive = room.status == 2;
    }

    function getContractInfo() external view returns (uint256 ethBalance, uint256 tokenSupply) {
        return (address(this).balance, totalSupply());
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function emergencyWithdraw(uint256 amount) external onlyOwner nonReentrant {
        if (address(this).balance < amount) {
            revert InsufficientBalance(address(this).balance, amount);
        }
        
        (bool success, ) = payable(owner()).call{value: amount}("");
        if (!success) revert TransferFailed();
    }

    function batchFinishGames(
        string[] calldata roomIds,
        uint8[] calldata winners
    ) external onlyOwner nonReentrant {
        uint256 length = roomIds.length;
        if (length != winners.length) revert InvalidPosition(0);
        
        for (uint256 i; i < length;) {
            _finishGameInternal(roomIds[i], winners[i]);
            unchecked { ++i; }
        }
    }

    function _finishGameInternal(string calldata roomId, uint8 winner) internal {
        GameRoom storage room = rooms[roomId];
        
        if (room.status != 2 || winner > 2) return;

        uint256 totalPot;
        unchecked {
            totalPot = uint256(room.bet1) + uint256(room.bet2);
        }
        
        uint256 houseFee;
        uint256 remainingPot;
        unchecked {
            houseFee = (totalPot * HOUSE_FEE_PERCENT) / PRECISION;
            remainingPot = totalPot - houseFee;
        }

        address player1 = room.player1;
        address player2 = room.player2;
        address gameWinner;
        uint256 prize;

        if (winner == 2) {
            uint256 refund1;
            uint256 refund2;
            unchecked {
                refund1 = (uint256(room.bet1) * WINNER_PERCENT) / PRECISION;
                refund2 = (uint256(room.bet2) * WINNER_PERCENT) / PRECISION;
            }
            
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

    function cleanupFinishedGames(string[] calldata roomIds) external onlyOwner {
        uint256 length = roomIds.length;
        for (uint256 i; i < length;) {
            GameRoom storage room = rooms[roomIds[i]];
            if (room.status == 3) {
                delete rooms[roomIds[i]];
            }
            unchecked { ++i; }
        }
    }

    receive() external payable {}
}