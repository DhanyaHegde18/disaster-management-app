const jwt = require('jsonwebtoken');

// Accepts "9876543210", "+919876543210" or "919876543210" and returns "+919876543210"
function normalizePhone(input) {
  const digits = String(input || '').replace(/\D/g, '');
  let ten = digits;
  if (digits.length === 12 && digits.startsWith('91')) {
    ten = digits.slice(2);
  }
  if (!/^[6-9]\d{9}$/.test(ten)) {
    return null;  // not a valid Indian mobile number
  }
  return `+91${ten}`;
}

// Creates the login token. Villagers stay logged in for 30 days, NGO/admin for 12 hours.
function createToken(user) {
  return jwt.sign(
    { id: user._id.toString(), role: user.role, ngo: user.ngo ? user.ngo.toString() : null },
    process.env.JWT_SECRET,
    { expiresIn: user.role === 'villager' ? '30d' : '12h' }
  );
}

// Reads the token from the "Authorization: Bearer ..." header. Returns null if missing or invalid.
function readToken(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(header.slice(7), process.env.JWT_SECRET);
  } catch (err) {
    return null;
  }
}

// Logged in or not, the request continues. Used for SOS, so help requests are never blocked.
function optionalAuth(req, res, next) {
  req.user = readToken(req);
  next();
}

// Must be logged in
function requireAuth(req, res, next) {
  const user = readToken(req);
  if (!user) {
    return res.status(401).json({ error: 'Please log in' });
  }
  req.user = user;
  next();
}

// Must be logged in AND have one of these roles, e.g. requireRole('ngo', 'admin')
function requireRole(...roles) {
  return (req, res, next) => {
    const user = readToken(req);
    if (!user) {
      return res.status(401).json({ error: 'Please log in' });
    }
    if (!roles.includes(user.role)) {
      return res.status(403).json({ error: 'You do not have permission to do this' });
    }
    req.user = user;
    next();
  };
}

module.exports = { normalizePhone, createToken, optionalAuth, requireAuth, requireRole };