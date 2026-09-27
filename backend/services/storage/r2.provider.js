const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const StorageProvider = require('./storage.interface');

class R2StorageProvider extends StorageProvider {
  constructor() {
    super();
    this.accountId = process.env.R2_ACCOUNT_ID;
    this.accessKeyId = process.env.R2_ACCESS_KEY_ID;
    this.secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    this.bucketName = process.env.R2_BUCKET_NAME || 'servicehub-resumes';
    this.endpoint = process.env.R2_ENDPOINT || (this.accountId ? `https://${this.accountId}.r2.cloudflarestorage.com` : '');

    this.client = null;
    if (this.accessKeyId && this.secretAccessKey && this.endpoint) {
      this.client = new S3Client({
        region: 'auto',
        endpoint: this.endpoint,
        credentials: {
          accessKeyId: this.accessKeyId,
          secretAccessKey: this.secretAccessKey,
        },
      });
    }
  }

  isConfigured() {
    return Boolean(this.client);
  }

  async upload({ buffer, filename, mimeType, folder = 'resumes' }) {
    const key = `${folder}/${Date.now()}_${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    if (!this.client) {
      throw new Error('Cloudflare R2 is not configured with credentials in environment.');
    }

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    });

    await this.client.send(command);
    const signedUrl = await this.getSignedUrl(key, 3600);

    return {
      key,
      url: signedUrl,
      provider: 'r2',
      sizeBytes: buffer.length,
    };
  }

  async getSignedUrl(key, expiresInSeconds = 900) {
    if (!this.client) return `/uploads/${key}`;
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  async download(key) {
    if (!this.client) throw new Error('R2 client not configured.');
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });
    const response = await this.client.send(command);
    const streamToBuffer = async (stream) => {
      const chunks = [];
      for await (const chunk of stream) chunks.push(chunk);
      return Buffer.concat(chunks);
    };
    return streamToBuffer(response.Body);
  }

  async delete(key) {
    if (!this.client) return false;
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });
    await this.client.send(command);
    return true;
  }

  async exists(key) {
    if (!this.client) return false;
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      await this.client.send(command);
      return true;
    } catch (err) {
      if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) return false;
      throw err;
    }
  }
}

module.exports = R2StorageProvider;
