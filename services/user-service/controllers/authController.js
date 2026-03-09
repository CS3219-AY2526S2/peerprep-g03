const { createUser, getUserByUsername } = require("../models/userModel");
const { validateEmail, validatePassword, validateUsername } = require("../utils/validation");
const { decryptEmail } = require("../models/userModel");
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

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1h" });
    // give to frontend token + userid, username and role
    res.json({
      username: user.username,
      role: user.role,
      email: decryptEmail(user.email),                     // blank to avoid frontend crash
      proficiency: user.proficiency || "",
      JWToken: token
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};