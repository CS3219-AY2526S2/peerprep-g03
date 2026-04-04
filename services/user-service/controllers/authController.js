const { createUser, getUserByUsername, getUserById } = require("../models/userModel");
const { validateEmail, validatePassword, validateUsername } = require("../utils/validation");
const { decryptEmail } = require("../models/userModel");
// for superadmin to get all users and update roles
const { getAllUsers, updateUserRole } = require("../models/userModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.DATABASE_URL})

exports.registerUser = async (req, res) => {
  const { username, password, email } = req.body;

  const emailcheck = validateEmail(email);
  const passwordcheck = validatePassword(password);
  const usernamecheck = validateUsername(username);
  if (emailcheck !== true) return res.status(400).json({ error: emailcheck });
  if (passwordcheck !== true) return res.status(400).json({ error: passwordcheck });
  if (usernamecheck !== true) return res.status(400).json({ error: usernamecheck });

  const existingUser = await getUserByUsername(username);
  if (existingUser) return res.status(409).json({ error: "Username already exists" });

  try {
    const user = await createUser(username, password, email, "User");
    res.status(201).json({ message: "User created", id: user.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.loginUser = async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await getUserByUsername(username);
    if (!user) return res.status(404).json({ error: "User not found" });

    const now = new Date();

    // Check if account is temporarily locked
    if (user.locked_until && new Date(user.locked_until) > now) {
      return res.status(403).json({ 
        //${new Date(user.locked_until).toLocaleTimeString()}`
        error: `Account locked. Try again at ${new Date(user.locked_until).toISOString()}`
      });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      let failedAttempts = user.failed_attempts || 0;
      const lastFailed = user.last_failed_at ? new Date(user.last_failed_at) : null;

      // Reset failed attempts if last attempt > 5 mins ago
      if (!lastFailed || (now - lastFailed) / 1000 / 60 > 5) {
        failedAttempts = 0;
      } else {
        failedAttempts += 1;
      }

      // Lock account for 5 minutes if failed attempts >= 5
      const lockedUntil = failedAttempts >= 4 ? new Date(now.getTime() + 5 * 60 * 1000) : null;

      // Update user in DB
      await pool.query(
        "UPDATE users SET failed_attempts = $1, last_failed_at = $2, locked_until = $3 WHERE id = $4",
        [failedAttempts, now, lockedUntil, user.id]
      );

      return res.status(401).json({ error: "Invalid password" });
    } 

    // Successful login, reset counters
    await pool.query(
      "UPDATE users SET failed_attempts = 0, last_failed_at = NULL, locked_until = NULL WHERE id = $1",
      [user.id]
    );

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "15m" });
    // give to frontend token + userid, username and role
    res.json({
      username: user.username,
      role: user.role,
      email: decryptEmail(user.email),
      proficiency: user.proficiency || "",
      JWToken: token
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    // 1. Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    // 2. Decode token
    const decodedRaw = jwt.verify(token, process.env.JWT_SECRET);
    
    // Ensure it's an object
    const decoded = typeof decodedRaw === "string" ? JSON.parse(decodedRaw) : decodedRaw;
    //console.log("Decoded token payload:", JSON.stringify(decoded, null, 2));
    console.log("decoded typeof: ", decoded, typeof decoded);

    // 3. Get latest user data from DB
    const user = await getUserById(Number(decoded.id));
    console.log("User found:", user);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // 4. Create NEW token with UPDATED role
    const newToken = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    // 5. Send back
    res.json({ JWToken: newToken });

  } catch (err) {
    console.error("Caught error in refreshToken:", err);

    // Distinguish between JWT errors and other errors
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid token" });
    } else if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired" });
    } else {
      // Any other error (like DB query issues)
      return res.status(500).json({ error: "Internal server error", details: err.message });
    }
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "No token" });

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "SuperAdmin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const users = await getAllUsers();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "No token" });

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // only superadmin can update roles
    if (decoded.role !== "SuperAdmin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { id } = req.params;
    const { role } = req.body;

    if (!["User", "Admin"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const updatedUser = await updateUserRole(id, role);

    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};