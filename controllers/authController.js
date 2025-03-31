const User = require("../models/User");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

let otpStorage = {};

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendOtpEmail = async (email, otp, name) => {
  try {
    const templatePath = path.join(__dirname, "../templates/template.html");
    let htmlTemplate = fs.readFileSync(templatePath, "utf-8");

    htmlTemplate = htmlTemplate
      .replace("{{name}}", name)
      .replace("{{otp}}", otp);

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "ChatCrest U! Registration OTP",
      html: htmlTemplate,
    });
  } catch (error) {
    console.error("Error sending OTP email:", error);
  }
};

exports.sendOtp = async (req, res) => {
  const { email, username } = req.body;
  if (!email || !username) {
    return res.status(400).json({ message: "Email and Username are required" });
  }

  const otp = crypto.randomInt(1000, 9999).toString();
  otpStorage[email] = { otp: otp, expiresAt: Date.now() + 600000 };

  await sendOtpEmail(email, otp, username);
  res.status(200).json({ message: "OTP sent successfully" });
};

exports.verifyOtpAndRegister = async (req, res) => {
  const { id, username, email, otp, preferredLanguage } = req.body;

  if (!id || !email || !otp || !username) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const storedOtp = otpStorage[email];
  console.log(storedOtp, "-----", Date.now());
  if (!storedOtp || storedOtp.expiresAt < Date.now()) {
    return res.status(400).json({ message: "OTP expired or invalid" });
  }

  if (String(storedOtp.otp) !== String(otp.trim())) {
    return res.status(400).json({ message: "Incorrect OTP" });
  }

  try {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ message: "User already registered" });
    }

    const user = await User.create({
      id,
      username,
      email,
      preferredLanguage: preferredLanguage || "en",
    });

    delete otpStorage[email];

    res
      .status(201)
      .json({ message: "User registered successfully", userId: user.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.login = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ where: { email } });
  if (!user) return res.status(400).json({ error: "User not found" });

  const token = jwt.sign(
    { id: user.id, email: email, username: user.username },
    process.env.JWT_SECRET
  );

  res.json({
    message: "Login successful",
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      preferredLanguage: user.preferredLanguage,
      profilePicture: user.profilePicture,
      token,
    },
  });
};

exports.updateUser = async (req, res) => {
  const { username, email, preferredLanguage } = req.body;
  const userEmail = req.user.email;
  const profilePicture = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    const user = await User.findOne({ where: { email: userEmail } });
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    if (username) user.username = username;
    if (email) user.email = email;
    if (preferredLanguage) user.preferredLanguage = preferredLanguage;
    if (profilePicture) {
      if (user.profilePicture) {
        const oldPath = path.join(__dirname, "..", user.profilePicture);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      user.profilePicture = profilePicture;
    }

    await user.save();
    res.json({ message: "User updated successfully", user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getUser = async (req, res) => {
  const { id, email } = req.user;

  if (!id && !email) {
    return res.status(400).json({ error: "User ID or Email is required." });
  }

  try {
    const user = await User.findOne({
      where: id ? { id } : { email },
      attributes: { exclude: ["password"] },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    res.json({ message: "User details fetched successfully", user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
