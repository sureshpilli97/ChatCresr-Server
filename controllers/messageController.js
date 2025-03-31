const { v4: uuidv4 } = require("uuid");
const { Op } = require("sequelize");
const PrivateChat = require("../models/PrivateChat");
const PrivateMessage = require("../models/PrivateMessage");
const GroupChat = require("../models/GroupChat");
const GroupParticipants = require("../models/GroupParticipants");
const GroupMessage = require("../models/GroupMessage");
const User = require("../models/User");

exports.createPrivateChat = async (req, resOrSocket) => {
  const { receiverEmail, senderEmail } = req.body || req;

  if (!receiverEmail) {
    return resOrSocket.json
      ? resOrSocket.status(400).json({ error: "Receiver email is required." })
      : resOrSocket({ error: "Receiver email is required." });
  }

  try {
    let chat = await PrivateChat.findOne({
      where: {
        [Op.or]: [
          { senderEmail, receiverEmail },
          { senderEmail: receiverEmail, receiverEmail: senderEmail },
        ],
      },
    });

    if (!chat) {
      chat = await PrivateChat.create({
        id: uuidv4(),
        senderEmail,
        receiverEmail,
      });
    }

    const response = {
      message: "Private chat created successfully",
      id: chat.id,
      receiverEmail: receiverEmail,
      updatedAt: chat.updatedAt,
    };

    return resOrSocket.json
      ? resOrSocket.json(response)
      : resOrSocket(response);
  } catch (error) {
    return resOrSocket.json
      ? resOrSocket.status(500).json({ error: error.message })
      : resOrSocket({ error: error.message });
  }
};

exports.sendPrivateMessage = async (req, resOrSocket) => {
  const { senderEmail, chatId, messageText, messageType } = req.body || req;

  if (!chatId || !messageText) {
    return resOrSocket.json
      ? resOrSocket
          .status(400)
          .json({ error: "chatId and messageText are required." })
      : resOrSocket({ error: "chatId and messageText are required." });
  }

  try {
    const chat = await PrivateChat.findByPk(chatId);
    if (!chat) {
      return resOrSocket.json
        ? resOrSocket.status(404).json({ error: "Chat not found." })
        : resOrSocket({ error: "Chat not found." });
    }

    const message = await PrivateMessage.create({
      chatId,
      senderEmail,
      messageText,
      messageType: messageType || "text",
      status: "sent",
    });

    chat.updatedAt = message.createdAt;
    chat.changed("updatedAt", true);
    await chat.save();

    const receiverEmail =
      chat.senderEmail === senderEmail ? chat.receiverEmail : chat.senderEmail;

    const response = {
      message: "Private message sent",
      messageChat: message.dataValues,
      receiverEmail,
    };

    return resOrSocket.json
      ? resOrSocket.json(response)
      : resOrSocket(response);
  } catch (error) {
    return resOrSocket.json
      ? resOrSocket.status(500).json({ error: error.message })
      : resOrSocket({ error: error.message });
  }
};

exports.createGroupChat = async (req, resOrSocket) => {
  const { adminEmail, groupName, users } = req.body || req;
  if (!groupName || users.length === 0) {
    return resOrSocket.json
      ? resOrSocket
          .status(400)
          .json({ error: "Group name and users are required." })
      : resOrSocket({ error: "Group name and users are required." });
  }

  try {
    const chatId = uuidv4();

    const chat = await GroupChat.create({
      id: chatId,
      groupName,
      adminEmail: adminEmail,
    });

    await Promise.all(
      users.map((email) =>
        GroupParticipants.create({ chatId, userEmail: email })
      )
    );
    await GroupParticipants.create({
      chatId,
      userEmail: adminEmail,
      role: "admin",
    });

    const response = {
      message: `Group '${groupName}' created successfully`,
      id: chatId,
      groupName,
      type: "group",
      updatedAt: chat.updatedAt,
    };

    return resOrSocket.json
      ? resOrSocket.json(response)
      : resOrSocket(response);
  } catch (error) {
    return resOrSocket.json
      ? resOrSocket.status(500).json({ error: error.message })
      : resOrSocket({ error: error.message });
  }
};

exports.sendGroupMessage = async (req, resOrSocket) => {
  const { chatId, messageText, messageType, senderEmail } = req.body || req;

  if (!chatId || !messageText) {
    return resOrSocket.json
      ? resOrSocket
          .status(400)
          .json({ error: "chatId and messageText are required." })
      : resOrSocket({ error: "chatId and messageText are required." });
  }

  try {
    const chat = await GroupChat.findByPk(chatId);
    if (!chat) {
      return resOrSocket.json
        ? resOrSocket.status(404).json({ error: "Group chat not found." })
        : resOrSocket({ error: "Group chat not found." });
    }

    const message = await GroupMessage.create({
      chatId,
      senderEmail,
      messageText,
      messageType: messageType || "text",
      status: "sent",
    });

    chat.updatedAt = message.createdAt;
    chat.changed("updatedAt", true);
    await chat.save();

    // get all group participants
    const participants = await GroupParticipants.findAll({
      where: { chatId },
    });

    const participantEmails = participants.map((p) => p.userEmail);

    const senderName = await User.findOne({
      where: { email: senderEmail },
      attributes: ["username"],
    });

    const response = {
      message: "Group message sent",
      messageChat: {
        ...message.dataValues,
        senderName: senderName.username,
      },
      participants: participantEmails,
    };

    return resOrSocket.json
      ? resOrSocket.json(response)
      : resOrSocket(response);
  } catch (error) {
    return resOrSocket.json
      ? resOrSocket.status(500).json({ error: error.message })
      : resOrSocket({ error: error.message });
  }
};
