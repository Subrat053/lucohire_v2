const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const { generateReferralCode } = require('../utils/generateReferralCode');

function isBcryptHash(value) {
  return typeof value === 'string' && /^\$2[aby]\$/.test(value);
}

function validCoordinates(latitude, longitude) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  return Number.isFinite(lat) && Number.isFinite(lng)
    && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function slugify(value, maxLength = Infinity) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, maxLength);
}

function encryptionKey() {
  const secret = process.env.ENCRYPTION_SECRET;
  return secret ? crypto.createHash('sha256').update(secret).digest() : null;
}

function encryptValue(value) {
  if (!value || typeof value !== 'string' || value.startsWith('enc:v1:')) return value;
  const key = encryptionKey();
  if (!key) return value;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:v1:${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

function decryptValue(value) {
  if (typeof value !== 'string' || !value.startsWith('enc:v1:')) return value;
  const key = encryptionKey();
  if (!key) return value;
  try {
    const [, , ivValue, tagValue, encryptedValue] = value.split(':');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivValue, 'base64'));
    decipher.setAuthTag(Buffer.from(tagValue, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedValue, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  } catch (_) {
    return value;
  }
}

function protectBankDetails(bankDetails, operation) {
  if (!bankDetails || typeof bankDetails !== 'object') return bankDetails;
  const result = { ...bankDetails };
  for (const field of ['accountHolderName', 'accountNumber', 'upiId']) {
    if (result[field]) result[field] = operation(result[field]);
  }
  return result;
}

async function beforeSave(modelName, source, context = {}) {
  const data = { ...source };
  const modified = context.modified || new Set(Object.keys(data));

  if (modelName === 'Admin') {
    if (modified.has('password') && data.password && !isBcryptHash(data.password)) {
      data.password = await bcrypt.hash(data.password, 10);
    }
  }

  if (modelName === 'User') {
    const lat = Number(data.latitude);
    const lng = Number(data.longitude);
    data.location = validCoordinates(lat, lng) ? { type: 'Point', coordinates: [lng, lat] } : undefined;
    data.roles = Array.isArray(data.roles) ? [...data.roles] : [];
    if (!data.activeRole) data.activeRole = data.roles[0] || data.role || null;
    if (data.activeRole && !data.roles.includes(data.activeRole)) data.roles.push(data.activeRole);
    if (!data.roles.length && data.role) {
      data.roles = [data.role];
      data.activeRole = data.role;
    }
    if (data.activeRole) data.role = data.activeRole;
    if (!data.roleIntent) {
      const provider = data.roles.includes('provider');
      const recruiter = data.roles.includes('recruiter');
      if (provider && recruiter) data.roleIntent = 'both';
      else if (recruiter) data.roleIntent = 'recruiter';
      else if (provider) data.roleIntent = 'provider';
    }
    if (context.isNew && !data.panelAccess) {
      data.panelAccess = {
        provider: { enabled: true, source: 'free_plan' },
        recruiter: { enabled: true, source: 'free_plan' },
      };
    }
    if (context.isNew && !data.approvalStatus) data.approvalStatus = 'approved';
    if (data.fullPhone) data.phone = data.fullPhone;
    else if (data.phone) {
      const { parsePhoneString } = require('../utils/phoneValidation');
      const parsed = parsePhoneString(data.phone);
      Object.assign(data, parsed, { phone: parsed.fullPhone });
    }
    if (data.phone === '') data.phone = undefined;
    if (!data.referralCode) data.referralCode = generateReferralCode();
    if (modified.has('password') && data.password && !isBcryptHash(data.password)) {
      data.password = await bcrypt.hash(data.password, 10);
      data.hasPassword = true;
    }
    if (modified.has('phone') && data.phone) {
      data.phone_hash = crypto.createHash('sha256').update(data.phone.trim()).digest('hex');
    }
    if (modified.has('email') && data.email) {
      data.email = data.email.trim().toLowerCase();
      data.email_hash = crypto.createHash('sha256').update(data.email).digest('hex');
    }
    if (data.bankDetails) data.bankDetails = protectBankDetails(data.bankDetails, encryptValue);
  }

  if (modelName === 'AIPromptTemplate') {
    if (data.feature_name && !data.key) data.key = data.feature_name;
    if (data.key && !data.feature_name) data.feature_name = data.key;
    if (data.prompt_template && !data.template) data.template = data.prompt_template;
    if (data.template && !data.prompt_template) data.prompt_template = data.template;
    if (data.is_active !== undefined) data.isActive = data.is_active;
    if (data.isActive !== undefined) data.is_active = data.isActive;
  }

  if (modelName === 'CountryConfig' && !data.slug && data.countryName) data.slug = slugify(data.countryName);

  if (modelName === 'ExternalJob' && !data.seoSlug && data.title) {
    const base = [
      slugify(data.title, 50),
      slugify(data.companyName, 30),
      slugify(data.city),
      slugify(data.countryCode),
    ].filter(Boolean).join('-');
    data.seoSlug = `${base}-${Math.random().toString(36).slice(2, 7)}`;
  }

  if (modelName === 'JobPost') {
    const location = data.location || {};
    if (typeof location.latitude === 'number' && data.latitude === undefined) data.latitude = location.latitude;
    if (typeof location.longitude === 'number' && data.longitude === undefined) data.longitude = location.longitude;
    if (location.city && !data.cityName) data.cityName = location.city;
    if (location.country && !data.countryCode) data.countryCode = location.country;
    if (!data.cityName && data.city) data.cityName = data.city;
    if (data.budgetMin !== undefined && data.minBudget === undefined) data.minBudget = data.budgetMin;
    if (data.budgetMax !== undefined && data.maxBudget === undefined) data.maxBudget = data.budgetMax;
    if (data.budgetType && !data.pricingType) {
      data.pricingType = ['hourly', 'monthly', 'fixed'].includes(data.budgetType) ? data.budgetType : 'fixed';
    }
    data.isActive = data.status === 'active';
    const latitude = data.latitude ?? location.latitude ?? data.locationData?.latitude ?? data.jobLocationData?.latitude;
    const longitude = data.longitude ?? location.longitude ?? data.locationData?.longitude ?? data.jobLocationData?.longitude;
    if (validCoordinates(latitude, longitude)) {
      data.latitude = Number(latitude);
      data.longitude = Number(longitude);
      data.geoPoint = { type: 'Point', coordinates: [Number(longitude), Number(latitude)] };
    } else data.geoPoint = undefined;
    if (!data.seoSlug && data.title && data.isExternal) {
      const base = [slugify(data.title, 50), slugify(data.companyName, 30), slugify(data.city), slugify(data.countryCode)]
        .filter(Boolean).join('-');
      data.seoSlug = `${base}-${Math.random().toString(36).slice(2, 7)}`;
    }
  }

  if (modelName === 'ProviderProfile') {
    if (Array.isArray(data.skills) && data.skills.length) {
      const { canonicalizeSpeciality } = require('../services/providerIntelligenceService');
      let highestLevel = 'unskilled';
      for (const skill of data.skills) {
        const level = canonicalizeSpeciality(skill).skillLevel;
        if (level === 'skilled') { highestLevel = 'skilled'; break; }
        if (level === 'semi-skilled') highestLevel = 'semi-skilled';
      }
      data.tier = highestLevel;
      data.skillLevel = highestLevel;
    }
    if (validCoordinates(data.latitude, data.longitude)) {
      data.geoPoint = { type: 'Point', coordinates: [Number(data.longitude), Number(data.latitude)] };
    } else data.geoPoint = undefined;
    if (modified.has('skills')) data.expandedSkills = [];
  }

  if (modelName === 'RecruiterProfile') {
    const latitude = data.location?.latitude ?? data.locationData?.latitude;
    const longitude = data.location?.longitude ?? data.locationData?.longitude;
    data.geoPoint = validCoordinates(latitude, longitude)
      ? { type: 'Point', coordinates: [Number(longitude), Number(latitude)] }
      : undefined;
  }

  if (modelName === 'Review') {
    if (!data.reviewerId && data.recruiter) data.reviewerId = data.recruiter;
    if (!data.revieweeId && data.provider) data.revieweeId = data.provider;
  }

  if (modelName === 'SkillCategory') {
    if (!data.type && data.tier) data.type = data.tier === 'semi-skilled' ? 'semi_skilled' : data.tier;
    if (!data.tier && data.type) data.tier = data.type === 'semi_skilled' ? 'semi-skilled' : data.type;
  }

  if (modelName === 'UserSubscription') {
    if (!data.audience) data.audience = data.role;
    if (!data.startedAt) data.startedAt = data.startDate;
    if (!data.expiresAt) data.expiresAt = data.endDate;
  }

  return data;
}

function afterLoad(modelName, source) {
  const data = { ...source };
  if (modelName === 'User' && data.bankDetails) data.bankDetails = protectBankDetails(data.bankDetails, decryptValue);
  if (modelName === 'ProviderProfile' && Array.isArray(data.portfolioLinks)) {
    data.portfolioLinks = data.portfolioLinks.map((link) => {
      if (typeof link !== 'string') return link;
      const { detectPlatform } = require('../utils/urlSafetyService');
      return { platform: detectPlatform(link), url: link, status: 'approved', submittedAt: new Date() };
    });
  }
  return data;
}

function attachDocumentMethods(modelName, document) {
  if (modelName === 'User' || modelName === 'Admin') {
    Object.defineProperty(document, 'matchPassword', {
      enumerable: false,
      value: async (enteredPassword) => Boolean(document.password)
        && bcrypt.compare(enteredPassword, document.password),
    });
  }
  if (modelName === 'User') {
    Object.defineProperty(document, 'createPasswordResetToken', {
      enumerable: false,
      value: () => {
        const token = crypto.randomBytes(32).toString('hex');
        document.passwordResetToken = crypto.createHash('sha256').update(token).digest('hex');
        document.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);
        return token;
      },
    });
    Object.defineProperty(document, 'createMagicLinkToken', {
      enumerable: false,
      value: () => {
        const token = crypto.randomBytes(32).toString('hex');
        document.magicLinkToken = crypto.createHash('sha256').update(token).digest('hex');
        document.magicLinkExpires = new Date(Date.now() + 15 * 60 * 1000);
        return token;
      },
    });
  }
}

function attachStatics(modelName, Model) {
  if (modelName === 'AdminSetting') {
    Model.getValue = async (key, fallback = null) => (await Model.findOne({ key }))?.value ?? fallback;
    Model.isFeatureEnabled = async (key, fallback = true) => {
      const value = await Model.getValue(key, null);
      return value === null ? fallback : Number(value) === 1 || value === true || String(value).toLowerCase() === 'true';
    };
  }
  if (modelName === 'AIPromptTemplate') {
    Model.getActivePrompt = async (featureName) => {
      const defaults = require('../services/ai/defaultPrompts');
      try {
        return (await Model.findOne({ feature_name: featureName, is_active: true }).lean())?.prompt_template
          || defaults[featureName] || '';
      } catch (_) {
        return defaults[featureName] || '';
      }
    };
  }
  if (modelName === 'BillingRule') Model.getActive = () => Model.findOne({ isActive: true }).sort({ version: -1 });
  if (modelName === 'IngestionSettings') {
    Model.getSettings = async () => {
      let settings = await Model.findOne();
      if (!settings) settings = await Model.create({});
      const now = new Date();
      const last = settings.lastResetDate || now;
      const newDay = now.toDateString() !== new Date(last).toDateString();
      const newMonth = now.getMonth() !== new Date(last).getMonth() || now.getFullYear() !== new Date(last).getFullYear();
      if (newDay) { settings.dailyRecordsUsed = 0; settings.dailySpendUsed = 0; }
      if (newMonth) { settings.monthlyRecordsUsed = 0; settings.monthlySpendUsed = 0; }
      if (newDay || newMonth) { settings.lastResetDate = now; await settings.save(); }
      return settings;
    };
  }
}

module.exports = {
  afterLoad,
  attachDocumentMethods,
  attachStatics,
  beforeSave,
};

