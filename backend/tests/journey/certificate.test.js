const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { verifyPublicCertificate } = require('../../services/resumeJourney/certificate.service');
const prisma = require('../../config/prisma');

describe('Certificate Registry & Public Verification Tests', () => {
  test('verifyPublicCertificate rejects nonexistent or empty ID', async () => {
    const res1 = await verifyPublicCertificate('');
    assert.equal(res1.valid, false);

    const res2 = await verifyPublicCertificate('LH-NONEXISTENT-9999');
    assert.equal(res2.valid, false);
    assert.equal(res2.status, 'invalid');
  });

  test('verifyPublicCertificate verifies a valid active certificate', async () => {
    // Look for any existing certificate in DB or create temporary record
    const user = await prisma.user.findFirst();
    const path = await prisma.careerPath.findFirst();

    if (user && path) {
      const testVerId = `LH-TEST-${Date.now()}`;
      const cert = await prisma.journeyCertificate.create({
        data: {
          verificationId: testVerId,
          userId: user.id,
          careerPathId: path.id,
          targetRole: 'Test Engineer',
          compositeScore: 88,
          assessmentScore: 85,
          atsScore: 90,
          status: 'active',
        },
      });

      const verification = await verifyPublicCertificate(testVerId);
      assert.equal(verification.valid, true);
      assert.equal(verification.verificationId, testVerId);
      assert.equal(verification.status, 'active');
      assert.equal(verification.compositeScore, 88);

      // Clean up
      await prisma.journeyCertificate.delete({ where: { id: cert.id } });
    }
  });
});
