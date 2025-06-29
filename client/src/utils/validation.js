// Validation utilities for blockchain operations
export const validateEthereumAddress = (address) => {
  const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
  return ethAddressRegex.test(address);
};

export const validateTokenAmount = (amount, minAmount = 10) => {
  const numAmount = parseFloat(amount);
  
  if (isNaN(numAmount)) {
    return { isValid: false, error: "Please enter a valid number" };
  }
  
  if (numAmount <= 0) {
    return { isValid: false, error: "Amount must be greater than 0" };
  }
  
  if (numAmount < minAmount) {
    return { isValid: false, error: `Minimum amount is ${minAmount} tokens` };
  }
  
  if (numAmount > 1000000) {
    return { isValid: false, error: "Amount too large. Maximum is 1,000,000 tokens" };
  }
  
  return { isValid: true, error: null };
};

export const validateEthAmount = (amount) => {
  const numAmount = parseFloat(amount);
  
  if (isNaN(numAmount)) {
    return { isValid: false, error: "Please enter a valid ETH amount" };
  }
  
  if (numAmount <= 0) {
    return { isValid: false, error: "ETH amount must be greater than 0" };
  }
  
  if (numAmount < 0.001) {
    return { isValid: false, error: "Minimum ETH amount is 0.001" };
  }
  
  if (numAmount > 100) {
    return { isValid: false, error: "Maximum ETH amount is 100" };
  }
  
  return { isValid: true, error: null };
};

export const validateRoomId = (roomId) => {
  if (!roomId || typeof roomId !== 'string') {
    return { isValid: false, error: "Room ID is required" };
  }
  
  if (roomId.trim().length === 0) {
    return { isValid: false, error: "Room ID cannot be empty" };
  }
  
  if (roomId.length < 10) {
    return { isValid: false, error: "Room ID must be at least 10 characters" };
  }
  
  if (roomId.length > 100) {
    return { isValid: false, error: "Room ID is too long" };
  }
  
  // Check for valid UUID format (optional but recommended)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(roomId)) {
    return { isValid: false, error: "Invalid room ID format" };
  }
  
  return { isValid: true, error: null };
};

export const validateUsername = (username) => {
  if (!username || typeof username !== 'string') {
    return { isValid: false, error: "Username is required" };
  }
  
  const trimmed = username.trim();
  
  if (trimmed.length === 0) {
    return { isValid: false, error: "Username cannot be empty" };
  }
  
  if (trimmed.length < 2) {
    return { isValid: false, error: "Username must be at least 2 characters" };
  }
  
  if (trimmed.length > 20) {
    return { isValid: false, error: "Username must be less than 20 characters" };
  }
  
  // Allow only alphanumeric characters, spaces, and common symbols
  const validUsernameRegex = /^[a-zA-Z0-9\s\-_\.]+$/;
  if (!validUsernameRegex.test(trimmed)) {
    return { isValid: false, error: "Username contains invalid characters" };
  }
  
  return { isValid: true, error: null };
};

// Check if user has sufficient balance before transaction
export const validateSufficientBalance = (userBalance, requiredAmount) => {
  const balance = parseFloat(userBalance);
  const required = parseFloat(requiredAmount);
  
  if (isNaN(balance) || isNaN(required)) {
    return { isValid: false, error: "Invalid balance or amount" };
  }
  
  if (balance < required) {
    return { 
      isValid: false, 
      error: `Insufficient balance. You have ${balance.toFixed(2)} but need ${required.toFixed(2)}` 
    };
  }
  
  return { isValid: true, error: null };
};