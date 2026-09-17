const mongoose = require('mongoose');

const locationMasterSchema = new mongoose.Schema({
  canonicalName: { type: String, required: true, unique: true },
  city: { type: String, default: null },
  state: { type: String, default: null },
  country: { type: String, default: null },
  aliases: [{ type: String }],
  normalizedKey: { type: String, required: true, unique: true } // lowercase, space stripped
}, { timestamps: true });

module.exports = mongoose.model('PipelineLocationMaster', locationMasterSchema);
