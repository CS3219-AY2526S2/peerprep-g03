const zxcvbn = require("zxcvbn"); // Passwords

function validateEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email.toLowerCase()) ? true : "Invalid Email Address";
}

function validatePassword(password) {
  if (password.length <= 7) return "Password is too short."; // at least 8 letters
  if (!/[a-z]/.test(password)) return "Password must contain a lowercase letter."; // no lowercase
  if (!/[A-Z]/.test(password)) return "Password must contain an uppercase letter."; // no uppercase
  if (!/[0-9]/.test(password)) return "Password must contain a number."; // no numbers
  if (zxcvbn(password).score < 2) return "Password is too weak. Try another combination of letters, numbers, and symbols"; // weak password
  return true;
}

function validateUsername(username) {
  if (username.length < 6 || username.length > 20) return "Username length must be between 6 to 20 characters"; // 6 to 20 characters 
  if (/__/.test(username)) return "Username must not have consecutive underlines"; // no double underlines
  if (!/^[A-Za-z0-9_]+$/.test(username)) return "Username must consist of only letters, numbers or underlines"; //allows only uppercase/lowercase/numbers and underlines
  if (!/[A-Za-z0-9]/.test(username)) return "Usernames must contain at least a letter or a number"; // requires at least uppercase/lowercase or a number at least
  return true;
}

module.exports = { validateEmail, validatePassword, validateUsername };