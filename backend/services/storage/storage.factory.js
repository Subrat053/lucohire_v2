const R2StorageProvider = require('./r2.provider');
const CloudinaryStorageProvider = require('./cloudinary.provider');
const LocalStorageProvider = require('./local.provider');

let instance = null;
let currentProviderName = null;

function getStorageProvider(overrideName = null) {
  const providerName = (overrideName || process.env.STORAGE_PROVIDER || 'local').toLowerCase().trim();

  if (instance && currentProviderName === providerName) {
    return instance;
  }

  currentProviderName = providerName;

  switch (providerName) {
    case 'r2': {
      const r2 = new R2StorageProvider();
      if (r2.isConfigured()) {
        instance = r2;
        break;
      }
      console.warn('[StorageFactory] R2 not fully configured. Falling back to local storage.');
      instance = new LocalStorageProvider();
      break;
    }
    case 'cloudinary':
      instance = new CloudinaryStorageProvider();
      break;
    case 'local':
    default:
      instance = new LocalStorageProvider();
      break;
  }

  return instance;
}

module.exports = {
  getStorageProvider,
};
