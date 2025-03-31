const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const sequelize = require("./config/db");
const User = require("./models/User");
require("./models/associations");

const {
  sendPrivateMessage,
  sendGroupMessage,
  createPrivateChat,
  createGroupChat,
} = require("./controllers/messageController");

const {
  getPrivateChatParticipants,
  getGroupChatParticipants,
  getPrivateChatMessages,
  getGroupChatMessages,
} = require("./controllers/chatController");

const authRoutes = require("./routes/authRoutes");
const chatRoutes = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

app.use("/lstm/auth", authRoutes);
app.use("/lstm/chats", chatRoutes);
app.use("/lstm/messages", messageRoutes);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
  pingInterval: 25000,
  pingTimeout: 60000,
});

let onlineUsers = {};

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Set user online
  socket.on("setOnline", async (email) => {
    if (!email) {
      console.log("Received setOnline event but no email provided.");
      return;
    }
    onlineUsers[email] = socket.id;
    console.log(`User set online: ${email}, socketId: ${socket.id}`);

    try {
      await User.update({ isOnline: true }, { where: { email } });
      io.emit("userStatusUpdate", { email, isOnline: true });
    } catch (error) {
      console.error("Error updating user status:", error.message);
    }
  });

  // Create Private Chat
  socket.on("createPrivateChat", async (data) => {
    try {
      await createPrivateChat(data, (response) => {
        if (onlineUsers[data.receiverEmail]) {
          io.to(onlineUsers[data.receiverEmail]).emit("newChatCreated", {
            ...response,
            receiverEmail: data.senderEmail,
            isOnline: true,
            type: "private",
          });
        }
        io.to(onlineUsers[data.senderEmail]).emit("newChatCreated", {
          ...response,
          receiverEmail: data.senderEmail,
          isOnline: true,
          type: "private",
        });
      });
    } catch (error) {
      socket.emit("error", { error: error.message });
    }
  });

  // Send Private Message
  socket.on("sendPrivateMessage", async (data) => {
    try {
      await sendPrivateMessage(data, (response) => {
        const receiverEmail = response?.receiverEmail;

        if (receiverEmail) {
          io.to(onlineUsers[receiverEmail]).emit(
            "receivePrivateMessage",
            response.messageChat
          );
          if (receiverEmail !== data.senderEmail) {
            io.to(onlineUsers[data.senderEmail]).emit(
              "receivePrivateMessage",
              response.messageChat
            );
          }
        } else {
          console.log(
            `Receiver is offline or email is missing. receiverEmail: ${receiverEmail}`
          );
        }
      });
    } catch (error) {
      socket.emit("error", { error: error.message });
    }
  });

  // Create Group Chat
  socket.on("createGroupChat", async (data) => {
    try {
      await createGroupChat(data, (response) => {
        io.to(onlineUsers[data.adminEmail]).emit("groupChatCreated", response);
        data.users.forEach((email) => {
          if (onlineUsers[email]) {
            io.to(onlineUsers[email]).emit("groupChatCreated", response);
          }
        });
      });
    } catch (error) {
      socket.emit("error", { error: error.message });
    }
  });

  // Send Group Message
  socket.on("sendGroupMessage", async (data) => {
    try {
      await sendGroupMessage(data, (response) => {
        response.participants.forEach((participant) => {
          if (onlineUsers[participant]) {
            io.to(onlineUsers[participant]).emit(
              "receiveGroupMessage",
              response.messageChat
            );
          }
        });
      });
    } catch (error) {
      socket.emit("error", { error: error.message });
    }
  });

  // Fetch Chat Participants
  socket.on("getChatParticipants", async (data) => {
    try {
      await getPrivateChatParticipants(data, (response) => {
        const updatedParticipants = response.privateChats.map((chat) => {
          const otherParticipant =
            chat.senderEmail === data.userEmail
              ? chat.receiverEmail
              : chat.senderEmail;

          return {
            ...chat,
            receiverEmail: otherParticipant,
            isOnline: onlineUsers[otherParticipant] ? true : false,
          };
        });
        socket.emit("chatParticipants", {
          privateChats: updatedParticipants,
          type: "private",
        });
      });
    } catch (error) {
      socket.emit("error", { error: error.message });
    }
  });

  socket.on("getGroupChatParticipants", async (data) => {
    try {
      await getGroupChatParticipants(data, (response) => {
        socket.emit("groupChatParticipants", { ...response, type: "group" });
      });
    } catch (error) {
      socket.emit("error", { error: error.message });
    }
  });

  // Fetch Private Chat Messages
  socket.on("getPrivateChatMessages", async (data) => {
    try {
      await getPrivateChatMessages(
        { chatId: data.chatId, receiverEmail: data.email },
        (response) => {
          socket.emit("privateChatMessages", response.messages);
        }
      );
    } catch (error) {
      socket.emit("error", { error: error.message });
    }
  });

  // Fetch Group Chat Messages
  socket.on("getGroupChatMessages", async (data) => {
    try {
      await getGroupChatMessages(data, (response) => {
        if (onlineUsers[data.email]) {
          io.to(onlineUsers[data.email]).emit(
            "groupMessages",
            response.messages
          );
        }
      });
    } catch (error) {
      socket.emit("error", { error: error.message });
    }
  });

  // Handle User Disconnect
  socket.on("disconnect", async () => {
    const email = Object.keys(onlineUsers).find(
      (key) => onlineUsers[key] === socket.id
    );

    if (email) {
      delete onlineUsers[email];
      await User.update({ isOnline: false }, { where: { email } });
      getPrivateChatParticipants({ userEmail: email }, (response) => {
        if (!response.privateChats) return;
        response.privateChats.forEach((chat) => {
          const otherParticipant =
            chat.senderEmail === email ? chat.receiverEmail : chat.senderEmail;

          if (onlineUsers[otherParticipant]) {
            io.to(onlineUsers[otherParticipant]).emit("userStatusUpdate", {
              email,
              isOnline: false,
            });
          }
        });
      });
    }

    console.log(`User disconnected: ${socket.id}`);
  });
});

server.listen(5001, async () => {
  try {
    await sequelize.sync();
    console.log("Server running on port 5001");
  } catch (error) {
    console.error("Error during server startup:", error);
  }
});
