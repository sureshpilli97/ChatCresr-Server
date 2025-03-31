const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const PrivateChat = sequelize.define("private_chats", {
    id: { type: DataTypes.STRING, primaryKey: true },
    senderEmail: { type: DataTypes.STRING, allowNull: false },
    receiverEmail: { type: DataTypes.STRING, allowNull: false }
}, { timestamps: true });

module.exports = PrivateChat;
