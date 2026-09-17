const axios = require('axios');
const ProviderProfile = require('../../models/ProviderProfile');
const DocumentVerificationResult = require('../../models/DocumentVerificationResult');
const { detectDocumentText } = require('../googleVision.service');

function normalizeName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a, b) {
  const s = normalizeName(a);
  const t = normalizeName(b);
  if (!s && !t) return 0;
  if (!s) return t.length;
  if (!t) return s.length;

  const dp = Array.from({ length: s.length + 1 }, () => new Array(t.length + 1).fill(0));
  for (let i = 0; i <= s.length; i += 1) dp[i][0] = i;
  for (let j = 0; j <= t.length; j += 1) dp[0][j] = j;

  for (let i = 1; i <= s.length; i += 1) {
    for (let j = 1; j <= t.length; j += 1) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[s.length][t.length];
}

function similarityRatio(a, b) {
  const s = normalizeName(a);
  const t = normalizeName(b);
  const maxLen = Math.max(s.length, t.length, 1);
  const dist = levenshtein(s, t);
  return Math.max(0, 1 - dist / maxLen);
}

function extractAadhaarFromText(text) {
  const content = String(text || '');
  const aadhaarMatch = content.match(/\b\d{4}\s?\d{4}\s?\d{4}\b/);
  const dobMatch = content.match(/\b(\d{2}[\/-]\d{2}[\/-]\d{4})\b/);
  const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  let name = '';
  for (const line of lines) {
    if (/government|india|aadhaar|dob|male|female|year|birth|uidai/i.test(line)) continue;
    if (line.length >= 4 && line.length <= 40 && /^[a-z\s]+$/i.test(line)) {
      name = line;
      break;
    }
  }

  const aadhaarRaw = aadhaarMatch ? aadhaarMatch[0].replace(/\s+/g, '') : '';
  const aadhaarMasked = aadhaarRaw ? `XXXX-XXXX-${aadhaarRaw.slice(-4)}` : '';

  return {
    name,
    dob: dobMatch ? dobMatch[1] : '',
    aadhaarNumber: aadhaarRaw,
    aadhaarMasked,
  };
}

async function fetchImageBuffer(documentUrl) {
  const response = await axios.get(documentUrl, {
    responseType: 'arraybuffer',
    timeout: 12000,
  });
  return Buffer.from(response.data);
}

async function extractAadhaarFields({ documentUrl }) {
  if (!documentUrl) throw new Error('documentUrl is required');

  const buffer = await fetchImageBuffer(documentUrl);
  const result = await detectDocumentText(buffer);
  const text = result?.fullText || '';
  const fields = extractAadhaarFromText(text);

  const confidence = fields.aadhaarNumber ? 0.85 : 0.45;

  return {
    status: 'success',
    text,
    fields,
    confidence,
    reason: fields.aadhaarNumber ? 'OCR fields extracted' : 'Partial OCR extraction',
  };
}

function compareWithProfile({ extractedFields, providerProfile }) {
  const profileName = providerProfile?.user?.name || providerProfile?.name || '';
  const profileDob = String(providerProfile?.dob || providerProfile?.dateOfBirth || '').trim();

  const nameSimilarity = similarityRatio(extractedFields?.name, profileName);
  const nameMatch = nameSimilarity >= 0.7;
  const dobMatch = profileDob ? String(extractedFields?.dob || '') === profileDob : false;
  const overallMatch = nameMatch || (nameSimilarity >= 0.6 && dobMatch);

  const confidence = Number(Math.min(1, Math.max(0, (nameSimilarity * 0.7) + (dobMatch ? 0.3 : 0))).toFixed(2));

  return {
    nameSimilarity,
    nameMatch,
    dobMatch,
    overallMatch,
    confidence,
  };
}

function produceVerificationDecision({ ocrResult, comparison }) {
  if (!ocrResult?.fields?.aadhaarNumber) {
    return {
      status: 'needs_review',
      confidence: Math.min(0.6, Number(ocrResult?.confidence || 0.2)),
      reasons: ['Unable to confidently extract Aadhaar number from OCR'],
    };
  }

  if (comparison.overallMatch) {
    return {
      status: 'verified',
      confidence: Math.max(0.7, Number(comparison.confidence || 0.7)),
      reasons: ['Profile details match Aadhaar OCR fields'],
    };
  }

  return {
    status: 'needs_review',
    confidence: Number(comparison.confidence || 0.4),
    reasons: ['Profile details do not sufficiently match Aadhaar OCR fields'],
  };
}

async function processProviderDocumentVerification({ providerId, documentUrl }) {
  if (!providerId || !documentUrl) {
    throw new Error('providerId and documentUrl are required');
  }

  const verificationDoc = await DocumentVerificationResult.create({
    providerId,
    documentUrl,
    documentType: 'aadhaar',
    status: 'processing',
  });

  try {
    const providerProfile = await ProviderProfile.findOne({ user: providerId }).populate('user', 'name');
    const ocrResult = await extractAadhaarFields({ documentUrl });
    const comparison = compareWithProfile({ extractedFields: ocrResult.fields, providerProfile });
    const decision = produceVerificationDecision({ ocrResult, comparison });

    verificationDoc.status = decision.status;
    verificationDoc.extractedFields = {
      name: ocrResult.fields.name,
      dob: ocrResult.fields.dob,
      aadhaarMasked: ocrResult.fields.aadhaarMasked,
    };
    verificationDoc.profileComparison = {
      nameMatch: comparison.nameMatch,
      dobMatch: comparison.dobMatch,
      overallMatch: comparison.overallMatch,
    };
    verificationDoc.confidence = decision.confidence;
    verificationDoc.reasons = decision.reasons;
    verificationDoc.rawOcrText = String(ocrResult.text || '').slice(0, 10000);
    await verificationDoc.save();

    return verificationDoc;
  } catch (error) {
    verificationDoc.status = 'failed';
    verificationDoc.reasons = [error.message];
    await verificationDoc.save();
    return verificationDoc;
  }
}

module.exports = {
  extractAadhaarFields,
  compareWithProfile,
  produceVerificationDecision,
  processProviderDocumentVerification,
};
