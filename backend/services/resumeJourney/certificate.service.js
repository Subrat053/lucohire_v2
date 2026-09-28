const crypto = require('crypto');
const prisma = require('../../config/prisma');
const { ROLE_BY_PATH } = require('./readiness.service');

function generateVerificationCode(userId, pathSlug) {
  const hash = crypto.createHash('sha256').update(`${userId}:${pathSlug}:${Date.now()}`).digest('hex').toUpperCase();
  const year = new Date().getFullYear();
  return `LH-VER-${year}-${hash.slice(0, 6)}`;
}

async function resolveCandidateName(userId, initialUser = null) {
  if (initialUser?.name && initialUser.name.trim()) {
    return initialUser.name.trim();
  }
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        providerProfileIdRecord: {
          select: { profileName: true },
        },
      },
    });
    const candidateName =
      user?.name?.trim() ||
      user?.providerProfileIdRecord?.profileName?.trim() ||
      user?.providerProfileIdRecord?.name?.trim() ||
      'Verified Candidate';
    return candidateName;
  } catch {
    return initialUser?.name || 'Verified Candidate';
  }
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
    const candidateName =
      existingCert.metadata?.candidateName ||
      (await resolveCandidateName(userId, existingCert.user));

    return {
      certificateId: existingCert.id,
      verificationId: existingCert.verificationId,
      candidateName,
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

  const roleInfo = ROLE_BY_PATH[careerPathSlug] || { role: careerPath.title || 'Software Developer' };
  const verificationId = generateVerificationCode(userId, careerPathSlug);
  const candidateName = await resolveCandidateName(userId);

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
        candidateName,
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
    candidateName,
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
        select: {
          id: true,
          name: true,
          providerProfileIdRecord: {
            select: { profileName: true },
          },
        },
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

  const candidateName =
    cert.metadata?.candidateName ||
    cert.user?.name?.trim() ||
    cert.user?.providerProfileIdRecord?.profileName?.trim() ||
    cert.user?.providerProfileIdRecord?.name?.trim() ||
    'Verified Candidate';

  return {
    valid: true,
    verificationId: cert.verificationId,
    candidateName,
    targetRole: cert.targetRole,
    careerPath: cert.careerPath?.title || 'Engineering',
    compositeScore: cert.compositeScore,
    assessmentScore: cert.assessmentScore,
    atsScore: cert.atsScore,
    issuedAt: cert.issuedAt,
    status: 'active',
    issuer: 'LucoHire Technical Assessment Authority',
  };
}

module.exports = {
  getOrCreateCertificate,
  verifyPublicCertificate,
};

