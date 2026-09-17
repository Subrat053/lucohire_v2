const RecruiterLead = require('../../models/RecruiterLead');
const User = require('../../models/User');
const RecruiterProfile = require('../../models/RecruiterProfile');
const ProviderProfile = require('../../models/ProviderProfile');
const crypto = require('crypto');
const { pushToInstantlyCampaign, pushToMetaCloudGateway } = require('../../services/outreachGateway.service');

// Optional fallback queue if needed later, but ignored for CSV manual upload
const { outreachQueue } = require('../../queues/outreach.queue');

// Background processing function for manual triggers (CSV upload)
// This completely bypasses BullMQ to avoid Upstash Redis limits
const processManualOutreachBackground = async (leadsData) => {
  const frontendUrl = process.env.VITE_APP_URL || 'http://localhost:5173';

  for (const data of leadsData) {
    try {
      const { leadId, userId, name, companyName, contactDetails, isEmail, template, claimToken } = data;
      console.log(`[Manual Outreach] Processing Target: ${contactDetails} | isEmail: ${isEmail}`);

      const profileLink = `${frontendUrl}/claim-profile/${claimToken}`;
      const deleteLink = `${frontendUrl}/api/webhooks/delete-profile?token=${claimToken}`;

      // Email formatting (HTML)
      const profileButton = `<br/><a href="${profileLink}" style="display:inline-block; background-color:#4F46E5; color:white; padding:12px 24px; text-decoration:none; border-radius:6px; font-weight:bold; margin-top:10px; margin-bottom:10px;">Claim Profile</a><br/>`;
      const deleteButton = `<a href="${deleteLink}" style="color:#ef4444; text-decoration:underline; font-size:12px;">Opt-out & Delete Profile</a>`;
      let emailMessage = template.replace(/\n/g, '<br/>')
        .replace(/\{\{name\}\}/g, name)
        .replace(/\{\{company\}\}/g, companyName)
        .replace(/\{\{profile_link\}\}/g, profileButton)
        .replace(/\{\{delete_link\}\}/g, deleteButton);
      
      const wrappedEmailMessage = `<div style="font-family: sans-serif; color: #374151; font-size: 15px; line-height: 1.6; max-width: 600px;">${emailMessage}</div>`;

      // WhatsApp formatting (Plain Text)
      const whatsappMessage = template
        .replace(/\{\{name\}\}/g, name)
        .replace(/\{\{company\}\}/g, companyName)
        .replace(/\{\{profile_link\}\}/g, profileLink)
        .replace(/\{\{delete_link\}\}/g, deleteLink);

      if (isEmail) {
        await pushToInstantlyCampaign(
          { name, email: contactDetails, company: companyName },
          profileLink,
          wrappedEmailMessage
        );
      } else {
        await pushToMetaCloudGateway(
          { name, phone: contactDetails, company: companyName },
          profileLink,
          whatsappMessage
        );
      }
      
      // Update lead status
      await RecruiterLead.findByIdAndUpdate(leadId, { status: 'contacted' });

      // Small delay between sends to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (err) {
      console.error(`[Manual Outreach] Error processing ${data.contactDetails}:`, err.message);
    }
  }
};

// Automatic outreach function for system-found leads
const processAutoScrapeOutreach = async (lead, targetEmail) => {
  try {
    const frontendUrl = process.env.VITE_APP_URL || 'http://localhost:5173';
    console.log(`[Auto Scrape Outreach] Triggering for: ${targetEmail}`);

    let user = await User.findOne({ email: targetEmail });
    const claimToken = crypto.randomBytes(32).toString('hex');
    let finalClaimToken = claimToken;

    if (!user) {
      user = new User({
        name: lead.companyName || 'Recruiter',
        email: targetEmail,
        roles: ['recruiter'],
        activeRole: 'recruiter',
        source: 'ats_sync',
        partnerStatus: 'pending',
        claimToken
      });
      await user.save({ validateBeforeSave: false });
      
      await RecruiterProfile.create({
        user: user._id,
        companyName: lead.companyName,
        status: 'pending'
      });
    } else {
      if (user.partnerStatus === 'pending') {
        user.claimToken = claimToken;
        await user.save({ validateBeforeSave: false });
      } else {
        finalClaimToken = user.claimToken || 'already_active';
      }
    }

    const profileLink = `${frontendUrl}/claim-profile/${finalClaimToken}`;
    const deleteLink = `${frontendUrl}/api/webhooks/delete-profile?token=${finalClaimToken}`;

    const profileButton = `<br/><a href="${profileLink}" style="display:inline-block; background-color:#4F46E5; color:white; padding:12px 24px; text-decoration:none; border-radius:6px; font-weight:bold; margin-top:10px; margin-bottom:10px;">Claim Profile</a><br/>`;
    const deleteButton = `<a href="${deleteLink}" style="color:#ef4444; text-decoration:underline; font-size:12px;">Opt-out & Delete Profile</a>`;
    
    // System Default Template for Auto Scraped Leads
    const template = `Hi Sir/Madam,
We noticed ${lead.companyName} is actively hiring and we have pre-vetted candidates who match your exact requirements on Lucohire.
Claim your exclusive company profile to view them instantly.

{{profile_link}}

Thanks,
Lucohire Team

{{delete_link}}`;

    let emailMessage = template.replace(/\n/g, '<br/>')
      .replace(/\{\{profile_link\}\}/g, profileButton)
      .replace(/\{\{delete_link\}\}/g, deleteButton);
    
    const wrappedEmailMessage = `<div style="font-family: sans-serif; color: #374151; font-size: 15px; line-height: 1.6; max-width: 600px;">${emailMessage}</div>`;

    await pushToInstantlyCampaign(
      { name: lead.companyName, email: targetEmail, company: lead.companyName },
      profileLink,
      wrappedEmailMessage
    );

    // Update lead status
    await RecruiterLead.findByIdAndUpdate(lead._id, { status: 'contacted' });

  } catch (error) {
    console.error(`[Auto Scrape Outreach] Error processing ${targetEmail}:`, error.message);
  }
};

/**
 * Get all recruiter leads (Admin)
 */
const getRecruiterLeads = async (req, res) => {
  try {
    const { country, status, hiringLevel, search, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (country) filter.countryCode = String(country).toUpperCase();
    if (status) filter.status = status;
    if (hiringLevel) filter.hiringLevel = hiringLevel;

    if (search) {
      filter.$or = [
        { companyName: { $regex: search.trim(), $options: 'i' } },
        { companyDomain: { $regex: search.trim(), $options: 'i' } },
        { careersEmail: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    const skipVal = (parseInt(page) - 1) * parseInt(limit);
    const limitVal = parseInt(limit);

    const [leads, total] = await Promise.all([
      RecruiterLead.find(filter)
        .sort({ activeJobCount: -1, createdAt: -1 })
        .skip(skipVal)
        .limit(limitVal)
        .lean(),
      RecruiterLead.countDocuments(filter)
    ]);

    res.json({
      leads,
      pagination: {
        page: parseInt(page),
        limit: limitVal,
        total,
        pages: Math.ceil(total / limitVal)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Update recruiter lead status or details (Admin)
 */
const updateRecruiterLead = async (req, res) => {
  try {
    const lead = await RecruiterLead.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    res.json(lead);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Delete recruiter lead (Admin)
 */
const deleteRecruiterLead = async (req, res) => {
  try {
    const lead = await RecruiterLead.findByIdAndDelete(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    res.json({ message: 'Recruiter lead deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Get manual outreach leads (Admin)
 */
const getManualOutreachLeads = async (req, res) => {
  try {
    const leads = await RecruiterLead.find({ source: 'csv_upload' }).sort({ createdAt: -1 }).lean();
    
    // We want to attach whether the claimLink was clicked (partnerStatus active)
    const emails = leads.map(l => l.careersEmail).filter(Boolean);
    const users = await User.find({ email: { $in: emails } }).select('email partnerStatus').lean();
    const userMap = {};
    users.forEach(u => userMap[u.email] = u.partnerStatus);

    const enrichedLeads = leads.map(lead => ({
      ...lead,
      claimStatus: userMap[lead.careersEmail] === 'active' ? 'Claimed' : (userMap[lead.careersEmail] === 'pending' ? 'Pending' : 'Unknown')
    }));

    res.json(enrichedLeads);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Export recruiter leads to simple CSV format
 */
const exportRecruiterLeads = async (req, res) => {
  try {
    const { country, status } = req.query;
    const filter = {};
    if (country) filter.countryCode = String(country).toUpperCase();
    if (status) filter.status = status;

    const leads = await RecruiterLead.find(filter).sort({ activeJobCount: -1 }).lean();

    // Generate CSV string
    let csv = 'Company Name,Domain,Careers Email,Public HR Email,Country,Active Jobs,Hiring Level,Status,Created At\n';
    
    for (const lead of leads) {
      const row = [
        `"${String(lead.companyName || '').replace(/"/g, '""')}"`,
        lead.companyDomain || '',
        lead.careersEmail || '',
        lead.publicHrEmail || '',
        lead.countryCode || '',
        lead.activeJobCount || 0,
        lead.hiringLevel || 'normal',
        lead.status || 'new',
        lead.createdAt ? new Date(lead.createdAt).toISOString() : ''
      ].join(',');
      csv += row + '\n';
    }

    res.header('Content-Type', 'text/csv');
    res.attachment('recruiter_leads.csv');
    return res.send(csv);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Upload Recruiter Leads CSV, create ghost profiles, and enqueue outreach
 */
const uploadRecruiterLeadsCsv = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No CSV file uploaded" });

  try {
    let csvData = req.file.buffer.toString('utf8');
    if (csvData.startsWith('\uFEFF')) csvData = csvData.slice(1);
    const lines = csvData.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) return res.status(400).json({ message: "CSV is empty or missing headers" });

    const parseCSVLine = (line) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' && (i === 0 || line[i - 1] !== '\\')) {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result.map(s => s.replace(/^"|"$/g, '').replace(/""/g, '"'));
    };

    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
    
    // Expected headers: name, companyname, contactdetails, role
    const idxName = headers.indexOf('name');
    const idxCompany = headers.findIndex(h => h.includes('company'));
    const idxContact = headers.findIndex(h => h.includes('contact'));
    const idxRole = headers.indexOf('role');

    if (idxName === -1 || idxCompany === -1 || idxContact === -1 || idxRole === -1) {
      return res.status(400).json({ message: "CSV must contain headers: name, company name, contact details, role" });
    }

    const { recruiterTemplate, providerTemplate } = req.body; // HTML or text templates
    
    let successCount = 0;
    const outreachJobs = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length < 4) continue;

      const name = values[idxName] || 'User';
      let companyName = values[idxCompany];
      const contactDetails = values[idxContact];
      
      const isProvider = !companyName || companyName.trim().toLowerCase() === 'n/a' || companyName.trim() === '-' || companyName.trim() === '';
      const role = isProvider ? 'provider' : 'recruiter';
      const template = isProvider ? providerTemplate : recruiterTemplate;
      
      // Fallback company name if empty to avoid errors
      if (isProvider && !companyName) {
        companyName = 'N/A';
      }
      
      const isEmail = contactDetails.includes('@');
      const email = isEmail ? contactDetails.toLowerCase() : undefined;
      const phone = !isEmail ? contactDetails : undefined;

      // 1. Create or Find Ghost User
      let user = null;
      if (email) user = await User.findOne({ email });
      if (phone) user = await User.findOne({ phone });

      const claimToken = crypto.randomBytes(32).toString('hex');
      let finalClaimToken = claimToken;
      
      if (!user) {
        user = new User({
          name,
          email,
          phone,
          roles: [role],
          activeRole: role,
          source: 'partner', // placeholder source since csv_upload isn't an enum
          partnerStatus: 'pending', // using this as a ghost flag
          claimToken
        });
        await user.save({ validateBeforeSave: false }); // Skip strict validation for ghost user
        
        if (role === 'recruiter') {
          await RecruiterProfile.create({
            user: user._id,
            companyName,
            status: 'pending'
          });
        } else {
          await ProviderProfile.create({
            user: user._id,
            onboardingStep: 1,
            isProfileComplete: false
          });
        }
      } else {
        // User exists. Check if they are still pending
        if (user.partnerStatus === 'pending') {
          // Update their claim token to the new one so the new link works
          user.claimToken = claimToken;
          await user.save({ validateBeforeSave: false });
        } else {
          // If they are already active, they shouldn't get a claim link, but for safety:
          finalClaimToken = user.claimToken || 'already_active';
        }
      }

      // 2. Create or Update Lead Record (upsert to avoid E11000 duplicate key error)
      const companyDomain = email ? email.split('@')[1] : companyName.replace(/\s+/g, '').toLowerCase() + '.com';
      const countryCode = 'US'; // default

      const lead = await RecruiterLead.findOneAndUpdate(
        { companyDomain, countryCode },
        {
          $setOnInsert: {
            companyName,
            source: 'csv_upload',
            status: 'new'
          },
          $set: {
            careersEmail: email || undefined
          }
        },
        { upsert: true, new: true }
      );

      // 3. Queue for local background processing instead of Redis
      outreachJobs.push({
        leadId: lead._id,
        userId: user._id,
        name,
        companyName,
        contactDetails,
        isEmail,
        template,
        claimToken: finalClaimToken
      });
      
      successCount++;
    }

    // Fire and forget the background worker (Does not block the HTTP response)
    if (outreachJobs.length > 0) {
      processManualOutreachBackground(outreachJobs).catch(err => {
        console.error('[Manual Outreach] Fatal background error:', err);
      });
    }

    res.json({ message: `Successfully imported and queued ${successCount} leads for outreach.` });
  } catch (error) {
    console.error('CSV Upload Error:', error);
    res.status(500).json({ message: 'Server error processing CSV', error: error.message });
  }
};

const scrapeManualLeads = async (req, res) => {
  try {
    const { companyName } = req.body;
    if (!companyName) return res.status(400).json({ message: 'Company name is required' });

    // Ensure customScraper is required at the top or here
    const { scrapeLeadsForCompany } = require('../syncEngine/customScraper');
    const leads = await scrapeLeadsForCompany(companyName);

    if (!leads || leads.length === 0) {
      return res.status(404).json({ message: `No leads found for ${companyName}` });
    }

    let insertedCount = 0;
    for (const lead of leads) {
      const existing = await RecruiterLead.findOne({ contactDetails: lead.contactDetails });
      if (!existing) {
        await RecruiterLead.create({
          name: lead.name || 'HR/Recruiter',
          companyName: lead.companyName || companyName,
          contactDetails: lead.contactDetails, // Could be email or Linkedin URL
          isEmail: lead.contactDetails.includes('@'),
          source: 'auto_scraped',
          status: 'pending',
          role: lead.role || 'recruiter',
          uploadedBy: req.user._id
        });
        insertedCount++;
      }
    }

    res.json({ message: `Scraped and saved ${insertedCount} new leads for ${companyName}.`, leads });
  } catch (error) {
    console.error('Scrape Manual Leads Error:', error);
    res.status(500).json({ message: 'Server error processing manual scrape', error: error.message });
  }
};

module.exports = {
  getRecruiterLeads,
  getManualOutreachLeads,
  updateRecruiterLead,
  deleteRecruiterLead,
  exportRecruiterLeads,
  uploadRecruiterLeadsCsv,
  processAutoScrapeOutreach,
  scrapeManualLeads
};
