const rateLimit = require('express-rate-limit');

// Rate limiting middleware
const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: true, message },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// General rate limit
const generalLimiter = createRateLimit(
  parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
  parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  'Too many requests from this IP, please try again later.'
);

// Strict rate limit for room operations
const roomOperationsLimiter = createRateLimit(
  60000, // 1 minute
  10, // 10 requests per minute
  'Too many room operations, please slow down.'
);

// Validation functions
const validateUsername = (username) => {
  if (!username || typeof username !== 'string') {
    return { isValid: false, error: 'Username is required' };
  }
  
  const trimmed = username.trim();
  if (trimmed.length < 2 || trimmed.length > 20) {
    return { isValid: false, error: 'Username must be 2-20 characters' };
  }
  
  if (!/^[a-zA-Z0-9\s\-_\.]+$/.test(trimmed)) {
    return { isValid: false, error: 'Username contains invalid characters' };
  }
  
  return { isValid: true, username: trimmed };
};

const validateRoomId = (roomId) => {
  if (!roomId || typeof roomId !== 'string') {
    return { isValid: false, error: 'Room ID is required' };
  }
  
  // UUID v4 format validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(roomId)) {
    return { isValid: false, error: 'Invalid room ID format' };
  }
  
  return { isValid: true, roomId };
};

const validateMove = (move) => {
  if (!move || typeof move !== 'object') {
    return { isValid: false, error: 'Invalid move data' };
  }
  
  const { from, to, piece, captured, san } = move;
  
  if (!from || !to || typeof from !== 'string' || typeof to !== 'string') {
    return { isValid: false, error: 'Invalid move coordinates' };
  }
  
  // Basic chess coordinate validation (a1-h8)
  const coordRegex = /^[a-h][1-8]$/;
  if (!coordRegex.test(from) || !coordRegex.test(to)) {
    return { isValid: false, error: 'Invalid chess coordinates' };
  }
  
  return { isValid: true, move };
};

// Socket event validation middleware
const validateSocketEvent = (eventName, validator) => {
  return (socket, next) => {
    const originalEmit = socket.emit;
    
    socket.emit = function(event, data, callback) {
      if (event === eventName) {
        const validation = validator(data);
        if (!validation.isValid) {
          if (callback) {
            callback({ error: true, message: validation.error });
          }
          return;
        }
      }
      return originalEmit.apply(this, arguments);
    };
    
    next();
  };
};

module.exports = {
  generalLimiter,
  roomOperationsLimiter,
  validateUsername,
  validateRoomId,
  validateMove,
  validateSocketEvent
};