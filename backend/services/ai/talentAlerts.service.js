const { Resend } = require('resend');
const logger = require('../../utils/logger');

// Initialize Resend
// User requires 'resend' package: npm i resend
const resend = new Resend(process.env.RESEND_API_KEY || 're_mock_key_123');

/**
 * Feature #8: Proactive Talent Alerts
 * Sends an email notification to recruiters when a candidate matching their high-priority query registers or updates.
 */
exports.sendProactiveTalentAlert = async (recruiterEmail, candidateName, matchScore, matchingSkills, jdTitle) => {
  try {
    const htmlContent = `
      <div style="font-family: sans-serif; max-w-lg; margin: auto;">
        <h2 style="color: #4f46e5;">New High-Match Talent Alert 🚀</h2>
        <p>A new candidate has just entered the pool matching your alert criteria for <strong>${jdTitle}</strong>.</p>
        
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">${candidateName}</h3>
          <p style="margin: 5px 0;"><strong>AI Match Score:</strong> <span style="color: #10b981; font-weight: bold;">${matchScore}%</span></p>
          <p style="margin: 5px 0;"><strong>Matching Skills:</strong> ${matchingSkills.join(', ')}</p>
        </div>
        
        <p>Log in to your <strong>Recruiter Copilot Command Center</strong> to view full analytics and unlock this candidate.</p>
        <a href="https://yourdomain.com/recruiter/copilot" style="display: inline-block; padding: 10px 20px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">View Candidate in Copilot</a>
      </div>
    `;

    const { data, error } = await resend.emails.send({
      from: 'Acme Alerts <onboarding@resend.dev>',
      to: [recruiterEmail],
      subject: `[Talent Alert] ${matchScore}% Match for ${jdTitle}`,
      html: htmlContent,
    });

    if (error) {
      logger.error('Failed to send Resend talent alert', error);
      return false;
    }

    logger.info(`Proactive Talent Alert sent to ${recruiterEmail} for candidate ${candidateName}`);
    return true;
  } catch (err) {
    logger.error('Error in sendProactiveTalentAlert', err);
    return false;
  }
};
