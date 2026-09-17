const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

let s3Client = null;

/**
 * Initializes and returns the S3 client for Cloudflare R2.
 * @returns {S3Client|null}
 */
function getR2Client() {
  if (s3Client) return s3Client;

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const endpoint = process.env.R2_ENDPOINT || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : "");

  if (!accessKeyId || !secretAccessKey || !endpoint) {
    console.warn("[R2 Service] Cloudflare R2 is not fully configured in environment variables. Falling back to mock URL generator.");
    return null;
  }

  s3Client = new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return s3Client;
}

/**
 * Generates a signed temporary URL for a resume object key stored in R2.
 * @param {String} objectKey - Object key in the bucket
 * @returns {Promise<String>}
 */
async function generateSignedResumeUrl(objectKey) {
  const client = getR2Client();
  const bucketName = process.env.R2_BUCKET_NAME || "servicehub-resumes";

  if (!client) {
    // Development fallback
    return `https://mock-r2-storage.local/${bucketName}/${objectKey}?token=mock_signed_15min_expiry`;
  }

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: objectKey,
  });

  // Signed URL valid for 15 minutes (900 seconds)
  const signedUrl = await getSignedUrl(client, command, { expiresIn: 900 });
  return signedUrl;
}

module.exports = {
  generateSignedResumeUrl,
};
