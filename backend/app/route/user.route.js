
const express = require("express");
const router = express.Router();

const {
  registerUser,
  loginUser,
  getMe,
  updateProfile,
  updateLocation,
  changePassword,
  deleteAccount,
} = require("../controller/user.controller.js");

const { userAuth } = require("../middleWare/middleware.js");

// Public routes
router.post("/register", registerUser);
router.post("/login", loginUser);

// Protected routes
router.get("/me", userAuth, getMe);
router.patch("/profile", userAuth, updateProfile);
router.patch("/location", userAuth, updateLocation);
router.patch("/password", userAuth, changePassword);
router.delete("/account", userAuth, deleteAccount);

module.exports = router;
