const { v4: uuidv4 } = require("uuid");
const { Op } = require("sequelize");
const PrivateChat = require("../models/PrivateChat");
const PrivateMessage = require("../models/PrivateMessage");
const GroupChat = require("../models/GroupChat");
const GroupParticipants = require("../models/GroupParticipants");
const GroupMessage = require("../models/GroupMessage");
const User = require("../models/User");

exports.getGroupChatMessages = async (req, resOrSocket) => {
  const { chatId } = req.params || req;

  try {
    const messages = await GroupMessage.findAll({
      where: { chatId },
      order: [["createdAt", "ASC"]],
    });

    // get correspoiding email to user name

    const updatedMessages = await Promise.all(
      messages.map(async (message) => {
        senderName = await User.findOne({
          where: { email: message.senderEmail },
          attributes: ["username"],
        });
        return {
          ...message.dataValues,
          senderName: senderName.username,
        };
      })
    );

    const response = {
      message: "Group messages fetched successfully",
      messages: updatedMessages,
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

exports.getPrivateChatMessages = async (req, resOrSocket) => {
  const { chatId, receiverEmail } = req.params || req;
  try {
    const messages = await PrivateMessage.findAll({
      where: { chatId },
      order: [["updatedAt", "ASC"]],
    });

    await PrivateMessage.update(
      { status: "read" },
      {
        where: {
          chatId,
          status: "sent",
          senderEmail: { [Op.ne]: receiverEmail },
        },
      }
    );

    const response = {
      message: "Private messages fetched successfully",
      messages,
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

exports.getPrivateChatParticipants = async (req, resOrSocket) => {
  try {
    const { userEmail } = req.body || req;

    // Fetch private chats for the user
    const privateChats = await PrivateChat.findAll({
      where: {
        [Op.or]: [{ senderEmail: userEmail }, { receiverEmail: userEmail }],
      },
      raw: true,
    });

    const chatIds = privateChats.map((chat) => chat.id);

    if (chatIds.length === 0) {
      console.log("No private chats found for user.");
      return resOrSocket.json
        ? resOrSocket.json({
            message: "No private chats found",
            privateChats: [],
          })
        : resOrSocket({ message: "No private chats found", privateChats: [] });
    }
    const unreadMessages = await PrivateMessage.findAll({
      where: {
        chatId: { [Op.in]: chatIds.length ? chatIds : [0] },
        status: "sent",
        senderEmail: { [Op.ne]: userEmail },
      },
      attributes: ["chatId"],
      raw: true,
    });
    const unreadMap = unreadMessages.reduce((acc, msg) => {
      acc[msg.chatId] = (acc[msg.chatId] || 0) + 1;
      return acc;
    }, {});

    const updatedPrivateChats = privateChats.map((chat) => ({
      ...chat,
      unreadCount: unreadMap[chat.id] || 0,
    }));

    return resOrSocket.json
      ? resOrSocket.json({
          message: "Private chats fetched successfully",
          privateChats: updatedPrivateChats,
        })
      : resOrSocket({
          message: "Private chats fetched successfully",
          privateChats: updatedPrivateChats,
        });
  } catch (error) {
    console.error("Error in getPrivateChatParticipants:", error.message);
    return resOrSocket.json
      ? resOrSocket.status(500).json({ error: error.message })
      : resOrSocket({ error: error.message });
  }
};

exports.getGroupChatParticipants = async (req, resOrSocket) => {
  try {
    const { userEmail } = req.body || req;

    // Fetch group chats where the user is a participant
    const groupChats = await GroupChat.findAll({
      include: [
        {
          model: GroupParticipants,
          where: { userEmail },
          attributes: [],
        },
      ],
      raw: true,
    });

    const groupChatIds = groupChats.map((chat) => chat.id);

    if (groupChatIds.length === 0) {
      return resOrSocket.json
        ? resOrSocket.json({
            message: "No group chats found",
            groupChats: [],
          })
        : resOrSocket({ message: "No group chats found", groupChats: [] });
    }

    const unreadMessages = await GroupMessage.findAll({
      where: {
        chatId: { [Op.in]: groupChatIds },
        status: "sent",
        senderEmail: { [Op.ne]: userEmail },
      },
      attributes: ["chatId"],
      raw: true,
    });

    const unreadMap = unreadMessages.reduce((acc, msg) => {
      acc[msg.chatId] = (acc[msg.chatId] || 0) + 1;
      return acc;
    }, {});

    const updatedGroupChats = groupChats.map((chat) => ({
      ...chat,
      unreadCount: unreadMap[chat.id] || 0,
    }));

    return resOrSocket.json
      ? resOrSocket.json({
          message: "Group chats fetched successfully",
          groupChats: updatedGroupChats,
        })
      : resOrSocket({
          message: "Group chats fetched successfully",
          groupChats: updatedGroupChats,
        });
  } catch (error) {
    console.error("Error in getGroupChatParticipants:", error.message);
    return resOrSocket.json
      ? resOrSocket.status(500).json({ error: error.message })
      : resOrSocket({ error: error.message });
  }
};
