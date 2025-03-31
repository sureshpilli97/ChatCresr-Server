const GroupChat = require("./GroupChat");
const GroupParticipants = require("./GroupParticipants");

GroupChat.hasMany(GroupParticipants, {
  foreignKey: "chatId",
  onDelete: "CASCADE",
});
GroupParticipants.belongsTo(GroupChat, { foreignKey: "chatId" });

module.exports = { GroupChat, GroupParticipants };
