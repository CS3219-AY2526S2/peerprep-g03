const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

router.post("/register", authController.registerUser);
router.post("/login", authController.loginUser);
router.post("/refresh", authController.refreshToken);
router.get("/users", authController.getAllUsers);
router.patch("/users/:id/role", authController.updateUserRole);

module.exports = router;