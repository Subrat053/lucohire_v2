const crypto = require('crypto');
const prisma = require('../../config/prisma');
const { getStorageProvider } = require('../storage/storage.factory');
const { getResumeParser } = require('../resumeParser/parser.factory');

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
];

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

function verifyFileSignature(buffer, mimeType) {
  if (!buffer || buffer.length < 4) return false;

  // PDF magic bytes: %PDF (0x25 0x50 0x44 0x46)
  if (mimeType === 'application/pdf') {
    return buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
  }

  // DOCX magic bytes: PK (0x50 0x4B 0x03 0x04)
  if (mimeType.includes('openxmlformats-officedocument')) {
    return buffer[0] === 0x50 && buffer[1] === 0x4B;
  }

  // DOC legacy magic bytes: 0xD0 0xCF 0x11 0xE0
  if (mimeType === 'application/msword') {
    return buffer[0] === 0xD0 && buffer[1] === 0xCF;
  }

  return true;
}

async function processResumeUpload({ userId, fileBuffer, originalFilename, mimeType }) {
  if (!fileBuffer || fileBuffer.length === 0) {
    throw new Error('No resume file content provided.');
  }

  if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
    throw new Error('Resume file exceeds maximum allowed size of 10MB.');
  }

  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new Error('Invalid document format. Please upload PDF or DOCX format.');
  }

  if (!verifyFileSignature(fileBuffer, mimeType)) {
    throw new Error('File content does not match reported MIME type. Potential corrupted or disguised document.');
  }

  const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

  // 1. Upload to storage provider
  const storage = getStorageProvider();
  const storageResult = await storage.upload({
    buffer: fileBuffer,
    filename: originalFilename,
    mimeType,
    folder: `resumes/${userId}`,
  });

  // 2. Parse resume
  const parser = getResumeParser();
  const parseResult = await parser.parse(fileBuffer, mimeType, { userId });

  // 3. Persist CandidateResume record
  const candidateResume = await prisma.candidateResume.create({
    data: {
      userId,
      originalFilename,
      mimeType,
      fileSizeBytes: fileBuffer.length,
      fileHash,
      storageProvider: storageResult.provider,
      storageKey: storageResult.key,
      storageUrl: storageResult.url,
      status: 'ready',
      isActive: true,
    },
  });

  // 4. Create immutable ResumeVersion
  const resumeVersion = await prisma.resumeVersion.create({
    data: {
      resumeId: candidateResume.id,
      versionNumber: 1,
      rawText: parseResult.rawText || '',
      canonicalData: parseResult.canonicalData || {},
      targetRole: parseResult.canonicalData?.headline || 'Software Engineer',
      generationMethod: 'uploaded',
    },
  });

  // 5. Create ResumeEvidence records
  if (Array.isArray(parseResult.evidences) && parseResult.evidences.length > 0) {
    const evidenceData = parseResult.evidences.map((ev) => ({
      resumeVersionId: resumeVersion.id,
      entityType: ev.entityType || 'skill',
      entityValue: ev.entityValue || '',
      normalizedValue: ev.normalizedValue || '',
      sourceSection: ev.sourceSection || 'EXPERIENCE',
      pageNumber: ev.pageNumber || 1,
      textEvidence: ev.textEvidence || '',
      confidence: ev.confidence || 0.9,
    }));

    await prisma.resumeEvidence.createMany({
      data: evidenceData,
    });
  }

  // 6. Update ProviderProfile for backward compatibility
  try {
    await prisma.providerProfile.updateMany({
      where: { user: userId },
      data: {
        resumeUrl: storageResult.url,
        parsedResumeData: parseResult.canonicalData,
      },
    });
  } catch (err) {
    console.warn('[ResumeIntelligence] ProviderProfile update skipped:', err.message);
  }

  return {
    resumeId: candidateResume.id,
    versionId: resumeVersion.id,
    storageUrl: storageResult.url,
    originalFilename,
    fileSizeBytes: fileBuffer.length,
    canonicalData: parseResult.canonicalData,
    confidenceScore: parseResult.confidenceScore,
  };
}

module.exports = {
  processResumeUpload,
  verifyFileSignature,
};
