const express = require("express");
const {
  sendOtp,
  verifyOtpAndRegister,
  login,
  updateUser,
  getUser,
} = require("../controllers/authController");
const authenticateJWT = require("../middleware/authenticateJWT");

const router = express.Router();

router.post("/send-otp", sendOtp);
router.post("/register", verifyOtpAndRegister);

router.post("/login", login);

router.put("/update", authenticateJWT, updateUser);
router.get("/", authenticateJWT, getUser);

module.exports = router;
