const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const GroupChat = sequelize.define("group_chats", {
    id: { type: DataTypes.STRING, primaryKey: true },
    groupName: { type: DataTypes.STRING, allowNull: false },
    adminEmail: { type: DataTypes.STRING, allowNull: false }
}, { timestamps: true });

module.exports = GroupChat;
