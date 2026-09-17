const mongoose = require('mongoose');

const aiPromptTemplateSchema = new mongoose.Schema({
  key: { type: String, trim: true, index: true },
  feature_name: { type: String, required: true, unique: true, trim: true, index: true },
  description: { type: String, default: '', trim: true },
  role: { type: String, enum: ['provider', 'recruiter', 'admin', 'system'], default: 'system', index: true },
  template: { type: String, trim: true },
  prompt_template: { type: String, required: true, trim: true },
  outputSchema: { type: mongoose.Schema.Types.Mixed, default: {} },
  temperature: { type: Number, default: 0.2, min: 0, max: 1 },
  maxTokens: { type: Number, default: 800, min: 32 },
  isActive: { type: Boolean, default: true, index: true },
  is_active: { type: Boolean, default: true, index: true },
  model_name: { type: String, default: 'gemini-1.5-flash', trim: true },
  version: { type: Number, default: 1 },
  updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// Pre-save hook to keep backward-compatible properties in sync
aiPromptTemplateSchema.pre('save', function (next) {
  if (this.feature_name && !this.key) this.key = this.feature_name;
  if (this.key && !this.feature_name) this.feature_name = this.key;
  if (this.prompt_template && !this.template) this.template = this.prompt_template;
  if (this.template && !this.prompt_template) this.prompt_template = this.template;
  if (this.is_active !== undefined) this.isActive = this.is_active;
  if (this.isActive !== undefined) this.is_active = this.isActive;
  next();
});

aiPromptTemplateSchema.index({ key: 1, isActive: 1 });
aiPromptTemplateSchema.index({ feature_name: 1, is_active: 1 });

// Static method to get the active prompt (from DB or fallback to default)
aiPromptTemplateSchema.statics.getActivePrompt = async function (feature_name) {
  const defaultPrompts = require('../services/ai/defaultPrompts');
  const fallback = defaultPrompts[feature_name] || '';
  
  try {
    const template = await this.findOne({ feature_name, is_active: true }).lean();
    if (template && template.prompt_template) {
      return template.prompt_template;
    }
  } catch (err) {
    console.error(`Error fetching prompt template for ${feature_name}:`, err);
  }
  return fallback;
};

module.exports = mongoose.model('AIPromptTemplate', aiPromptTemplateSchema, 'ai_prompt_templates');

