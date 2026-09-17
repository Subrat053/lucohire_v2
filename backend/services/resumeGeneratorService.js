const PDFDocument = require('pdfkit');
const { normalizeText } = require('./providerIntelligenceService');

/**
 * Generates a clean, professional, and visually appealing PDF resume
 * from provider profile and user account details.
 * 
 * @param {Object} profile - The ProviderProfile document
 * @param {Object} user - The User document associated with the profile
 * @returns {Promise<Buffer>} Buffer containing the generated PDF
 */
function generateResumePdf(profile, user) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, bufferPages: true });
      const buffers = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // --- Header Banner ---
      const name = user.name || profile.profileName || 'Service Provider';
      doc.fillColor('#081B3A')
         .fontSize(22)
         .font('Helvetica-Bold')
         .text(name, { align: 'center' });

      doc.moveDown(0.25);

      // --- Subtitle (Skill Tier and Primary Skills) ---
      const primarySkills = profile.skills && profile.skills.length > 0 
        ? profile.skills.slice(0, 4).join(', ') 
        : '';
      const subtitle = [
        profile.tier ? `${profile.tier.toUpperCase()} PROVIDER` : '',
        primarySkills
      ].filter(Boolean).join('  |  ');

      if (subtitle) {
        doc.fillColor('#0066FF')
           .fontSize(10)
           .font('Helvetica-Bold')
           .text(subtitle, { align: 'center' });
      }

      doc.moveDown(0.4);

      // --- Contact Information Row ---
      const contactParts = [];
      if (user.phone) contactParts.push(`Phone: ${user.phone}`);
      
      // Filter out dummy email addresses
      const email = user.email && !user.email.endsWith('@phone.lucohire.local') ? user.email : '';
      if (email) contactParts.push(`Email: ${email}`);
      
      const location = [profile.city, profile.state].filter(Boolean).join(', ');
      if (location) contactParts.push(`Location: ${location}`);

      doc.fillColor('#555555')
         .fontSize(9)
         .font('Helvetica')
         .text(contactParts.join('   •   '), { align: 'center' });

      doc.moveDown(0.8);

      // --- Divider Line ---
      doc.moveTo(50, doc.y)
         .lineTo(562, doc.y)
         .strokeColor('#E5EAF3')
         .lineWidth(1)
         .stroke();

      doc.moveDown(0.8);

      // Helper function to render sections with a stylish title accent
      const addSectionHeader = (title) => {
        doc.moveDown(0.6);
        doc.fillColor('#081B3A')
           .fontSize(12)
           .font('Helvetica-Bold')
           .text(title.toUpperCase());
        doc.moveDown(0.25);
        doc.moveTo(50, doc.y)
           .lineTo(150, doc.y)
           .strokeColor('#0066FF')
           .lineWidth(1.5)
           .stroke();
        doc.moveDown(0.4);
      };

      // --- Professional Summary ---
      const summary = profile.description || '';
      if (summary) {
        addSectionHeader('Professional Summary');
        doc.fillColor('#333333')
           .fontSize(9.5)
           .font('Helvetica')
           .text(summary, { align: 'justify', lineGap: 3.5 });
      }

      // --- Core Specialities & Skills ---
      if (profile.skills && profile.skills.length > 0) {
        addSectionHeader('Core Specialities & Skills');
        doc.font('Helvetica')
           .fontSize(9.5)
           .fillColor('#333333');
        
        // Render skills in a two-column or bulleted layout
        const list = profile.skills;
        list.forEach((skill) => {
          doc.text(`•  ${skill}`);
          doc.moveDown(0.15);
        });
      }

      // --- Work Experience & Classifications ---
      addSectionHeader('Professional Details');
      
      const expText = profile.experience 
        ? `${profile.experience} years of experience` 
        : 'Not specified';
      
      doc.fontSize(9.5);
      
      doc.fillColor('#333333')
         .font('Helvetica-Bold')
         .text('Experience Level: ', { continued: true })
         .font('Helvetica')
         .text(expText);
      doc.moveDown(0.3);

      if (profile.tier) {
        doc.fillColor('#333333')
           .font('Helvetica-Bold')
           .text('Skill Level Classification: ', { continued: true })
           .font('Helvetica')
           .text(profile.tier.charAt(0).toUpperCase() + profile.tier.slice(1));
        doc.moveDown(0.3);
      }

      const pricingAmount = profile.pricing;
      const pricingUnit = profile.pricingType || 'day';
      if (pricingAmount) {
        doc.fillColor('#333333')
           .font('Helvetica-Bold')
           .text('Expected Payout / Rate: ', { continued: true })
           .font('Helvetica')
           .text(`₹${pricingAmount} per ${pricingUnit}`);
        doc.moveDown(0.3);
      }

      // --- Languages ---
      if (profile.languages && profile.languages.length > 0) {
        addSectionHeader('Languages');
        doc.fillColor('#333333')
           .fontSize(9.5)
           .font('Helvetica')
           .text(profile.languages.join(', '));
      }

      // --- Portfolio & Social Links ---
      if (profile.portfolioLinks && profile.portfolioLinks.length > 0) {
        addSectionHeader('Portfolio & Links');
        profile.portfolioLinks.forEach((link) => {
          doc.fillColor('#0066FF')
             .fontSize(9.5)
             .font('Helvetica-Bold')
             .text(`${link.platform || 'Link'}: `, { continued: true })
             .fillColor('#333333')
             .font('Helvetica')
             .text(link.url);
          doc.moveDown(0.25);
        });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateResumePdf };
