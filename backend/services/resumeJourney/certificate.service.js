const crypto = require('crypto');
const prisma = require('../../config/prisma');
const { ROLE_BY_PATH } = require('./readiness.service');

function generateVerificationCode(userId, pathSlug) {
  const hash = crypto.createHash('sha256').update(`${userId}:${pathSlug}:${Date.now()}`).digest('hex').toUpperCase();
  const year = new Date().getFullYear();
  return `LH-VER-${year}-${hash.slice(0, 6)}`;
}

async function getOrCreateCertificate({ userId, careerPathSlug = 'p1' }) {
  const careerPath = await prisma.careerPath.findUnique({
    where: { slug: careerPathSlug },
  });

  if (!careerPath) throw new Error(`Career path ${careerPathSlug} not found`);

  // Check existing active certificate
  const existingCert = await prisma.journeyCertificate.findFirst({
    where: {
      userId,
      careerPathId: careerPath.id,
      status: 'active',
    },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
      careerPath: true,
    },
  });

  if (existingCert) {
    return {
      certificateId: existingCert.id,
      verificationId: existingCert.verificationId,
      candidateName: existingCert.user?.name || 'Verified Freelancer',
      targetRole: existingCert.targetRole,
      compositeScore: existingCert.compositeScore,
      assessmentScore: existingCert.assessmentScore,
      atsScore: existingCert.atsScore,
      issuedAt: existingCert.issuedAt,
      status: existingCert.status,
      isExisting: true,
    };
  }

  // Fetch latest readiness result
  const readiness = await prisma.readinessResult.findFirst({
    where: { userId, careerPathId: careerPath.id },
    orderBy: { createdAt: 'desc' },
  });

  if (!readiness || readiness.compositeScore < 70) {
    throw new Error('Candidate does not yet meet the 70% composite benchmark to unlock official certificate.');
  }

  const roleInfo = ROLE_BY_PATH[careerPathSlug] || ROLE_BY_PATH.p1;
  const verificationId = generateVerificationCode(userId, careerPathSlug);

  const newCert = await prisma.journeyCertificate.create({
    data: {
      verificationId,
      userId,
      careerPathId: careerPath.id,
      targetRole: roleInfo.role,
      compositeScore: readiness.compositeScore,
      assessmentScore: readiness.assessmentScore || 75,
      atsScore: readiness.atsScore,
      issuedAt: new Date(),
      status: 'active',
      metadata: {
        careerPathSlug,
        bandLabel: readiness.bandLabel,
      },
    },
    include: {
      user: { select: { name: true } },
    },
  });

  return {
    certificateId: newCert.id,
    verificationId: newCert.verificationId,
    candidateName: newCert.user?.name || 'Verified Freelancer',
    targetRole: newCert.targetRole,
    compositeScore: newCert.compositeScore,
    assessmentScore: newCert.assessmentScore,
    atsScore: newCert.atsScore,
    issuedAt: newCert.issuedAt,
    status: newCert.status,
    isExisting: false,
  };
}

async function verifyPublicCertificate(verificationId) {
  if (!verificationId) {
    return { valid: false, reason: 'No verification ID provided' };
  }

  const cert = await prisma.journeyCertificate.findUnique({
    where: { verificationId: verificationId.trim().toUpperCase() },
    include: {
      user: {
        select: { name: true },
      },
      careerPath: {
        select: { title: true, slug: true },
      },
    },
  });

  if (!cert) {
    return { valid: false, status: 'invalid', message: 'Certificate verification ID was not found on LucoHire public registry.' };
  }

  if (cert.status !== 'active') {
    return {
      valid: false,
      status: cert.status,
      message: `This certificate status is ${cert.status}.`,
    };
  }

  return {
    valid: true,
    verificationId: cert.verificationId,
    candidateName: cert.user?.name || 'Verified Candidate',
    targetRole: cert.targetRole,
    careerPath: cert.careerPath?.title || 'Engineering',
    compositeScore: cert.compositeScore,
    assessmentScore: cert.assessmentScore,
    issuedAt: cert.issuedAt,
    status: 'active',
    issuer: 'LucoHire Technical Assessment Authority',
  };
}

module.exports = {
  getOrCreateCertificate,
  verifyPublicCertificate,
};
