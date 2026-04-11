const { Schema, model } = require('mongoose');

const settingsSchema = new Schema({
  guildId: String,
  automodEnabled: { type: Boolean, default: false },
  antiLink: { type: Boolean, default: false },
  antiSpam: { type: Boolean, default: false },
  antiGhostPing: { type: Boolean, default: false },
  logChannelId: { type: String, default: null },
  welcomeChannelId: { type: String, default: null },
  welcomeImageUrl: { type: String, default: null },
  farewellChannelId: { type: String, default: null },
  farewellImageUrl: { type: String, default: null },
  antiDeleteEnabled: { type: Boolean, default: true },
  antiDeleteChannelId: { type: String, default: null },
  nsfwEnabled: { type: Boolean, default: true },
  autoRoleIds: { type: [String], default: [] },
  chatbotEnabled: { type: Boolean, default: false },
  chatbotChannelId: { type: String, default: null },
  autoplayEnabled: { type: Boolean, default: true },
  musicChannelId: { type: String, default: null },
});




module.exports = model('GuildSettings', settingsSchema);
