const express = require("express");
const {
    createPrivateChat,
    sendPrivateMessage,
    createGroupChat,
    sendGroupMessage
} = require("../controllers/messageController");
const authenticateJWT = require("../middleware/authenticateJWT");

const router = express.Router();

router.post("/private/chat", authenticateJWT, createPrivateChat);
router.post("/private/message", authenticateJWT, sendPrivateMessage);

router.post("/group/chat", authenticateJWT, createGroupChat);
router.post("/group/message", authenticateJWT, sendGroupMessage);

module.exports = router;
