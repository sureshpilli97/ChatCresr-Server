const express = require("express");
const {
    getPrivateChatMessages,
    getGroupChatMessages
} = require("../controllers/chatController");
const authenticateJWT = require("../middleware/authenticateJWT");

const router = express.Router();

router.get("/private/:chatId", authenticateJWT, getPrivateChatMessages);

router.get("/group/:chatId", authenticateJWT, getGroupChatMessages);

module.exports = router;
