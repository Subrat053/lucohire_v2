const StorageProvider = require('./storage.interface');
const { getCloudinaryInstance } = require('../../utils/cloudinary');

class CloudinaryStorageProvider extends StorageProvider {
  async upload({ buffer, filename, mimeType, folder = 'lucohire_resumes' }) {
    const cloudinary = await getCloudinaryInstance();
    const cleanPublicId = `${Date.now()}_${filename.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_')}`;

    return new Promise((resolve, reject) => {
      const isRaw = !mimeType.startsWith('image/');
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: cleanPublicId,
          resource_type: isRaw ? 'raw' : 'auto',
          use_filename: true,
        },
        (error, result) => {
          if (error) return reject(error);
          resolve({
            key: result.public_id,
            url: result.secure_url || result.url,
            provider: 'cloudinary',
            sizeBytes: result.bytes || buffer.length,
          });
        }
      );
      uploadStream.end(buffer);
    });
  }

  async getSignedUrl(key, expiresInSeconds = 900) {
    const cloudinary = await getCloudinaryInstance();
    // Return direct secure url or signed url
    return cloudinary.url(key, {
      secure: true,
      sign_url: true,
      resource_type: 'raw',
    });
  }

  async download(key) {
    const axios = require('axios');
    const url = await this.getSignedUrl(key);
    const res = await axios.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(res.data);
  }

  async delete(key) {
    try {
      const cloudinary = await getCloudinaryInstance();
      await cloudinary.uploader.destroy(key, { resource_type: 'raw' });
      return true;
    } catch {
      return false;
    }
  }

  async exists(key) {
    try {
      const cloudinary = await getCloudinaryInstance();
      const res = await cloudinary.api.resource(key, { resource_type: 'raw' });
      return Boolean(res);
    } catch {
      return false;
    }
  }
}

module.exports = CloudinaryStorageProvider;
