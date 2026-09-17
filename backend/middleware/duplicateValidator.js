const crypto = require('crypto');
const prisma = require('../config/prisma');

/**
 * Checks if a job already exists based on external URL
 * @param {Object} jobData 
 * @returns {Boolean} true if duplicate
 */
async function checkJobDuplicate(jobData) {
  if (!jobData.externalUrl) return false;
  const exists = await prisma.jobPost.findFirst({
    where: { externalUrl: String(jobData.externalUrl) },
    select: { id: true },
  });
  return !!exists;
}

/**
 * Checks if a user already exists based on phone, email, or source URL
 * @param {Object} userData 
 * @returns {Boolean} true if duplicate
 */
async function checkUserDuplicate({ phone, email, source_profile_url }) {
  const OR = [];
  
  if (phone) {
    const phoneHash = crypto.createHash('sha256').update(phone.trim()).digest('hex');
    OR.push({ phone_hash: phoneHash });
  }
  
  if (email) {
    const emailHash = crypto.createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
    OR.push({ email_hash: emailHash });
  }
  
  if (source_profile_url) {
    OR.push({ source_profile_url });
  }
  
  if (OR.length === 0) return false;
  
  const exists = await prisma.user.findFirst({
    where: { OR },
    select: { id: true },
  });
  return !!exists;
}

/**
 * Express middleware to validate inbound candidate/recruiter data and instantly reject duplicates
 */
const inboundDuplicateValidator = async (req, res, next) => {
  try {
    const { phone, email, source_profile_url } = req.body;
    
    // Only apply if at least one dedup parameter is present
    if (phone || email || source_profile_url) {
      const isDuplicate = await checkUserDuplicate({ phone, email, source_profile_url });
      
      if (isDuplicate) {
        // Log this to console but drop silently to save tokens/credits further down the chain
        console.log(`[DuplicateValidator] Dropped inbound data stream - Duplicate detected (Phone: ${!!phone}, Email: ${!!email}, SourceUrl: ${!!source_profile_url})`);
        
        // Return 409 Conflict if caller expects a response, or just 200 OK with success: false if it's an asynchronous webhook
        return res.status(409).json({ 
          success: false, 
          message: 'Duplicate record detected and skipped.', 
          isDuplicate: true 
        });
      }
    }
    
    next();
  } catch (error) {
    console.error('Error in inboundDuplicateValidator:', error);
    // On error, let it pass rather than blocking legitimate data
    next();
  }
};

module.exports = {
  checkJobDuplicate,
  checkUserDuplicate,
  inboundDuplicateValidator
};
