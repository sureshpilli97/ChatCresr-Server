const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const User = sequelize.define(
  "users",
  {
    id: { type: DataTypes.STRING, primaryKey: true, allowNull: false },
    username: { type: DataTypes.STRING, unique: true, allowNull: false },
    email: { type: DataTypes.STRING, unique: true, allowNull: false },
    profilePicture: { type: DataTypes.STRING, allowNull: true },
    preferredLanguage: { type: DataTypes.STRING, defaultValue: "en" },
    isOnline: { type: DataTypes.BOOLEAN, defaultValue: false },
    lastSeen: { type: DataTypes.DATE, allowNull: true },
  },
  { timestamps: true }
);

module.exports = User;
