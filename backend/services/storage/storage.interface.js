/**
 * StorageProvider Interface Contract
 * All storage implementations (R2, Cloudinary, Local) must conform to this interface.
 */
class StorageProvider {
  /**
   * Uploads a file buffer
   * @param {Object} params
   * @param {Buffer} params.buffer
   * @param {string} params.filename
   * @param {string} params.mimeType
   * @param {string} [params.folder]
   * @returns {Promise<{ key: string, url: string, provider: string, sizeBytes: number }>}
   */
  async upload({ buffer, filename, mimeType, folder = 'resumes' }) {
    throw new Error('StorageProvider.upload must be implemented');
  }

  /**
   * Generates a signed, time-limited URL for secure access
   * @param {string} key
   * @param {number} [expiresInSeconds=900]
   * @returns {Promise<string>}
   */
  async getSignedUrl(key, expiresInSeconds = 900) {
    throw new Error('StorageProvider.getSignedUrl must be implemented');
  }

  /**
   * Downloads file buffer by key
   * @param {string} key
   * @returns {Promise<Buffer>}
   */
  async download(key) {
    throw new Error('StorageProvider.download must be implemented');
  }

  /**
   * Deletes a file by key
   * @param {string} key
   * @returns {Promise<boolean>}
   */
  async delete(key) {
    throw new Error('StorageProvider.delete must be implemented');
  }

  /**
   * Checks if a file exists
   * @param {string} key
   * @returns {Promise<boolean>}
   */
  async exists(key) {
    throw new Error('StorageProvider.exists must be implemented');
  }
}

module.exports = StorageProvider;
