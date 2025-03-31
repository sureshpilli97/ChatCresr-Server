const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const GroupParticipants = sequelize.define("group_participants", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    chatId: { type: DataTypes.STRING, allowNull: false },
    userEmail: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.ENUM("admin", "member"), defaultValue: "member" }
}, { timestamps: true });

module.exports = GroupParticipants;
