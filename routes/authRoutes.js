const express = require("express");
const { register, login, forgotPassword, resetPassword, forgotPasswordOtp, resetPasswordOtp } = require("../controllers/authController");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);


router.post("/forgot-password",forgotPassword);
router.post("/reset-password/:token",resetPassword);

router.post("/forgot-password-otp", forgotPasswordOtp);
router.post("/reset-password-otp", resetPasswordOtp);
module.exports = router;
