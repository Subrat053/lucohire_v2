const jwt = require('jsonwebtoken');

const generateToken = (id, role) => {
  return jwt.sign({ id, userId: id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

module.exports = generateToken;
