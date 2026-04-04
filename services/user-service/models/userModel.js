const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

// Initialize Pool with the connection string
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

//const EMAIL_PEPPER = process.env.EMAIL_PEPPER;
const BCRYPT_SALT_ROUNDS = 12;

// function hashEmail(email) {
//   return crypto.createHmac("sha256", EMAIL_PEPPER).update(email.toLowerCase()).digest("hex");
// }

const ENCRYPTION_KEY = Buffer.from(process.env.EMAIL_ENCRYPTION_KEY, "hex"); // 32 bytes
const IV_LENGTH = 16;

function encryptEmail(email) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);

  let encrypted = cipher.update(email, "utf8", "hex");
  encrypted += cipher.final("hex");

  // store IV and ciphertext together
  return iv.toString("hex") + ":" + encrypted;
}

function decryptEmail(data) {
  const [ivHex, encrypted] = data.split(":");
  const iv = Buffer.from(ivHex, "hex");

  const decipher = crypto.createDecipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}


// Create a user and store in the database
async function createUser(username, password, email, role = "User") {
  const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  const encryptedEmail = encryptEmail(email);
  const usernameLower = username.toLowerCase();

  const res = await pool.query(
    "INSERT INTO users(username, password, email, role) VALUES($1, $2, $3, $4) RETURNING *",
    [usernameLower, hashedPassword, encryptedEmail, role]
  );
  return res.rows[0];
}

// Retrieve a user by their username
async function getUserByUsername(username) {
  const res = await pool.query(
    "SELECT * FROM users WHERE LOWER(username) = LOWER($1)",
    [username]
  );
  return res.rows[0];
}

async function getUserById(id) {
  const res = await pool.query(
    "SELECT * FROM users WHERE id = $1",
    [id]
  );
  return res.rows[0];
}

async function getAllUsers() {
  const res = await pool.query(
    "SELECT id, username, role FROM users ORDER BY id ASC"
  );
  return res.rows;
}

async function updateUserRole(id, role) {
  const res = await pool.query(
    "UPDATE users SET role = $1 WHERE id = $2 RETURNING id, username, role",
    [role, id]
  );
  return res.rows[0];
}

module.exports = { 
  createUser, 
  getUserByUsername, 
  decryptEmail, 
  getUserById,
  getAllUsers,
  updateUserRole
};
