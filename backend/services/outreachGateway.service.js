const axios = require('axios');
const { Resend } = require('resend');
const { enabled } = require('../middleware/operationalFeatureGate');

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY || 're_mock_key_for_dev');

// Meta Cloud API Setup
const META_ACCESS_TOKEN = process.env.META_WHATSAPP_TOKEN || 'mock_meta_token';
const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID || 'mock_phone_id';

/**
 * Pushes a formatted email to the candidate via Resend.
 */
exports.pushToInstantlyCampaign = async (candidate, claimLink, customHtml = null) => {
  if (!enabled('ENABLE_OUTREACH') || !enabled('ENABLE_COMMUNICATION_PROVIDERS')) {
    return { success: false, disabled: true, error: 'Outreach communication providers are disabled' };
  }
  console.log(`[OutreachGateway] Sending Email to ${candidate.email}`);
  
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('[OutreachGateway] Missing RESEND_API_KEY. Simulating email send.');
      return { success: true };
    }

    const defaultHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Hi ${candidate.name},</h2>
        <p>Top companies on Lucohire are looking to hire a <strong>${candidate.jobTitle || 'Professional'}</strong> with your exact skills.</p>
        <p>We have pre-built a private profile for you to start matching with jobs instantly.</p>
        <br/>
        <a href="${claimLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Claim Your Profile
        </a>
        <br/><br/>
        <p>Best,<br/>The Lucohire Team</p>
      </div>
    `;

    const htmlContent = customHtml || defaultHtml;

    const response = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@lucohire.com',
      to: candidate.email,
      subject: 'Top companies are looking for your skills on Lucohire',
      html: htmlContent
    });

    return { success: true, data: response };
  } catch (error) {
    console.error(`[OutreachGateway] Email failed:`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Pushes a WhatsApp template message to the candidate via Meta Cloud API.
 */
exports.pushToMetaCloudGateway = async (candidate, claimLink, customText = null) => {
  if (!enabled('ENABLE_OUTREACH') || !enabled('ENABLE_COMMUNICATION_PROVIDERS')) {
    return { success: false, disabled: true, error: 'Outreach communication providers are disabled' };
  }
  console.log(`[OutreachGateway] Sending WhatsApp to ${candidate.phone}`);
  
  try {
    if (!process.env.META_WHATSAPP_TOKEN) {
      console.warn('[OutreachGateway] Missing META_WHATSAPP_TOKEN. Simulating WhatsApp send.');
      return { success: true };
    }

    // WhatsApp expects standard E.164 format without the + (e.g., 919999999999)
    let cleanPhone = candidate.phone.replace(/[^0-9]/g, '');

    const response = await axios.post(
      `https://graph.facebook.com/v17.0/${META_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: cleanPhone,
        type: 'template',
        template: {
          name: 'claim_profile_alert', // You must create this template in Meta Business Manager
          language: { code: 'en' },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: candidate.name },
                { type: 'text', text: candidate.jobTitle || 'Professional' }
              ]
            },
            {
              type: 'button',
              sub_type: 'url',
              index: '0',
              parameters: [
                { type: 'text', text: claimLink.split('/').pop() } // if using dynamic URL parameters
              ]
            }
          ]
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${META_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return { success: true, data: response.data };
  } catch (error) {
    console.error(`[OutreachGateway] WhatsApp failed:`, error.response?.data || error.message);
    return { success: false, error: error.message };
  }
};
