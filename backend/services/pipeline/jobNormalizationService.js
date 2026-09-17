const CompanyMaster = require('../../models/pipeline/CompanyMaster');
const CompanyAliasSuggestion = require('../../models/pipeline/CompanyAliasSuggestion');
const LocationMaster = require('../../models/pipeline/LocationMaster');

/**
 * Normalizes salary, company, and location data.
 */

const normalizeSalary = (rawSalary) => {
  if (!rawSalary) return null;

  const text = rawSalary.toLowerCase();
  
  // Very basic regex to extract numbers
  // This logic can be expanded significantly for production
  const numbers = rawSalary.match(/\d+(?:,\d+)*(?:\.\d+)?/g);
  if (!numbers) return null;

  let min = parseFloat(numbers[0].replace(/,/g, ''));
  let max = numbers.length > 1 ? parseFloat(numbers[1].replace(/,/g, '')) : min;

  // Handle 'k' multiplier (e.g. 120k)
  if (text.includes('k')) {
    min *= 1000;
    max *= 1000;
  }

  // Convert to annual
  let annualMultiplier = 1;
  if (text.includes('hour') || text.includes('/hr')) {
    annualMultiplier = 40 * 52; // 40 hours/week, 52 weeks
  } else if (text.includes('month') || text.includes('/mo')) {
    annualMultiplier = 12;
  } else if (text.includes('lpa')) { // Lakhs per annum (India)
    min *= 100000;
    max *= 100000;
    annualMultiplier = 1;
  }

  const normalizedAnnualMin = min * annualMultiplier;
  const normalizedAnnualMax = max * annualMultiplier;
  const normalizedAnnual = (normalizedAnnualMin + normalizedAnnualMax) / 2;

  // Guess currency
  let currency = 'USD';
  if (text.includes('₹') || text.includes('rs') || text.includes('inr') || text.includes('lpa')) currency = 'INR';
  else if (text.includes('£') || text.includes('gbp')) currency = 'GBP';
  else if (text.includes('€') || text.includes('eur')) currency = 'EUR';
  else if (text.includes('aed')) currency = 'AED';
  else if (text.includes('cad')) currency = 'CAD';

  return {
    salaryNormalizedAnnual: normalizedAnnual,
    salaryCurrency: currency,
    salaryMin: normalizedAnnualMin,
    salaryMax: normalizedAnnualMax,
    salaryUnit: 'YEAR'
  };
};

const normalizeCompany = async (rawCompanyName, jobId) => {
  if (!rawCompanyName) return { canonicalId: null, domain: null, finalName: null };

  const searchName = rawCompanyName.trim();
  
  // Exact or alias match
  const company = await CompanyMaster.findOne({
    $or: [
      { canonicalName: { $regex: new RegExp(`^${searchName}$`, 'i') } },
      { aliases: { $regex: new RegExp(`^${searchName}$`, 'i') } }
    ],
    status: 'active'
  });

  if (company) {
    return {
      canonicalId: company._id,
      domain: company.companyDomain,
      finalName: company.canonicalName
    };
  }

  // Create suggestion
  let suggestion = await CompanyAliasSuggestion.findOne({ rawCompanyName: searchName });
  if (!suggestion) {
    suggestion = await CompanyAliasSuggestion.create({
      rawCompanyName: searchName,
      status: 'pending',
      sampleJobIds: jobId ? [jobId] : []
    });
  } else {
    if (jobId && !suggestion.sampleJobIds.includes(jobId) && suggestion.sampleJobIds.length < 10) {
      suggestion.sampleJobIds.push(jobId);
      await suggestion.save();
    }
  }

  return { canonicalId: null, domain: null, finalName: searchName };
};

const normalizeLocation = async (rawLocation) => {
  if (!rawLocation) return { canonicalId: null, finalLocationText: null, city: null, state: null, country: null };

  const searchLoc = rawLocation.trim();
  const normalizedKey = searchLoc.toLowerCase().replace(/\s+/g, '');

  const location = await LocationMaster.findOne({
    $or: [
      { canonicalName: { $regex: new RegExp(`^${searchLoc}$`, 'i') } },
      { aliases: { $regex: new RegExp(`^${searchLoc}$`, 'i') } },
      { normalizedKey: normalizedKey }
    ]
  });

  if (location) {
    return {
      canonicalId: location._id,
      finalLocationText: location.canonicalName,
      city: location.city,
      state: location.state,
      country: location.country
    };
  }

  // Fallback to raw string
  return {
    canonicalId: null,
    finalLocationText: searchLoc,
    city: null,
    state: null,
    country: null
  };
};

module.exports = {
  normalizeSalary,
  normalizeCompany,
  normalizeLocation
};
