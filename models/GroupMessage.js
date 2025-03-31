const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const GroupMessage = sequelize.define("group_messages", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    chatId: { type: DataTypes.STRING, allowNull: false },
    senderEmail: { type: DataTypes.STRING, allowNull: false },
    messageText: { type: DataTypes.TEXT, allowNull: true },
    messageType: { type: DataTypes.ENUM("text", "image", "video"), defaultValue: "text" },
    mediaUrl: { type: DataTypes.STRING, allowNull: true },
    status: { type: DataTypes.ENUM("sent", "delivered", "read"), defaultValue: "sent" }
}, { timestamps: true });

module.exports = GroupMessage;
