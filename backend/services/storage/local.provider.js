const fs = require('fs');
const path = require('path');
const StorageProvider = require('./storage.interface');

class LocalStorageProvider extends StorageProvider {
  constructor() {
    super();
    this.uploadDir = path.join(__dirname, '..', '..', 'uploads', 'resumes');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async upload({ buffer, filename, mimeType, folder = 'resumes' }) {
    const cleanFilename = `${Date.now()}_${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const filePath = path.join(this.uploadDir, cleanFilename);
    fs.writeFileSync(filePath, buffer);

    const relativeUrl = `/uploads/resumes/${cleanFilename}`;
    return {
      key: cleanFilename,
      url: relativeUrl,
      provider: 'local',
      sizeBytes: buffer.length,
    };
  }

  async getSignedUrl(key, expiresInSeconds = 900) {
    return `/uploads/resumes/${key}`;
  }

  async download(key) {
    const filePath = path.join(this.uploadDir, key);
    if (!fs.existsSync(filePath)) throw new Error(`File ${key} not found on local storage`);
    return fs.readFileSync(filePath);
  }

  async delete(key) {
    const filePath = path.join(this.uploadDir, key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  }

  async exists(key) {
    const filePath = path.join(this.uploadDir, key);
    return fs.existsSync(filePath);
  }
}

module.exports = LocalStorageProvider;
