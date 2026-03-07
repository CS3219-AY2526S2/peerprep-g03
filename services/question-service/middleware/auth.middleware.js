const jwt = require('jsonwebtoken');

const verifyAdmin = (req, res, next) => {
  console.log("Headers received:", req.headers.authorization);

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: "No token provided." });
  }

  try {
  
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;


    if (req.user.role !== 'Admin') {
      return res.status(403).json({ 
        message: "Permission Denied: Administrative access required." 
      });
    }

    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
};

module.exports = { verifyAdmin };