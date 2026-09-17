const { Resend } = require('resend');

// Initialize Resend
// Note: In development, if RESEND_API_KEY is missing, we'll mock the sending.
const resend = new Resend(process.env.RESEND_API_KEY || 're_mock_key');

// Helper to send email
const sendOutreachEmail = async (jobData) => {
  const { candidateEmail, candidateName, jobTitle, recruiterName, jobUrl, messageTemplate } = jobData;

  let html = '';
  
  if (messageTemplate) {
    let customMessage = messageTemplate
      .replace(/\[Candidate Name\]/gi, candidateName)
      .replace(/\[Recruiter Name\]/gi, recruiterName)
      .replace(/\[Job Title\]/gi, jobTitle);
      
    customMessage = customMessage.replace(/\n/g, '<br/>');

    html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6; color: #333;">
        <p>${customMessage}</p>
        <p><a href="${jobUrl}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 20px; font-weight: bold;">View Job Details</a></p>
      </div>
    `;
  } else {
    html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">You're a match for a new role!</h2>
        <p>Hi ${candidateName},</p>
        <p>My name is ${recruiterName} and I'm recruiting for a <strong>${jobTitle}</strong> position. Based on your profile and skills, I think you would be a great fit for this role.</p>
        <p>You can view the full details of the job and apply directly here:</p>
        <a href="${jobUrl}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px; font-weight: bold;">View Job Details</a>
        <p style="margin-top: 30px;">Looking forward to hearing from you!</p>
        <p>Best regards,<br/>${recruiterName}</p>
      </div>
    `;
  }

  if (process.env.RESEND_API_KEY) {
    return await resend.emails.send({
      from: 'Lucohire <noreply@lucohire.com>', // Replace with your verified domain
      to: candidateEmail,
      subject: `Interview Invitation: ${jobTitle}`,
      html: html
    });
  } else {
    // Mocking for local dev without API key
    console.log(`[MOCK EMAIL] Sent to ${candidateEmail} for ${jobTitle}`);
    return { id: 'mock_id', status: 'mocked' };
  }
};

// In-Memory Queue to replace BullMQ and avoid Redis dependency
class InMemoryQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
  }

  async add(name, data) {
    this.queue.push({ name, data });
    console.log(`[OutreachQueue] Job added. Pending jobs: ${this.queue.length}`);
    this.processQueue();
  }

  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const job = this.queue.shift();
      try {
        console.log(`[OutreachQueue] Processing outreach email to ${job.data.candidateEmail}`);
        await sendOutreachEmail(job.data);
        console.log(`[OutreachQueue] Job completed for ${job.data.candidateEmail}`);
        
        // Add a 2-second delay between emails to prevent spamming APIs (rate limiting)
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (err) {
        console.error(`[OutreachQueue] Failed to send email to ${job.data.candidateEmail}`, err);
      }
    }

    this.isProcessing = false;
  }
}

const outreachQueue = new InMemoryQueue();

module.exports = {
  outreachQueue
};
