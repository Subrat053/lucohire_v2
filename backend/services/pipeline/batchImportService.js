const ImportBatch = require('../../models/ImportBatch');
const User = require('../../models/User');
const ProviderProfile = require('../../models/ProviderProfile');
const { getCoordinatesFromText } = require('../locationService');
const { searchPlaces, getPlaceDetails } = require('../googlePlacesService');
const logger = require('../../utils/logger');

// Helper to parse a line respecting quotes
const parseCSVLine = (line, delim) => {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delim && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
};

// Sleep helper
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const processProviderBatch = async (batchId) => {
  try {
    const batch = await ImportBatch.findById(batchId).select('+csvData');
    if (!batch) return;

    if (batch.status === 'paused' || batch.status === 'stopped' || batch.status === 'failed' || batch.status === 'completed') {
      return;
    }

    batch.status = 'processing';
    await batch.save();

    const csvData = batch.csvData;
    const lines = csvData.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) {
      batch.status = 'failed';
      await batch.save();
      return;
    }

    let delimiter = ',';
    const firstLine = lines[0];
    const commas = (firstLine.match(/,/g) || []).length;
    const semicolons = (firstLine.match(/;/g) || []).length;
    if (semicolons > commas) {
      delimiter = ';';
    }

    const headers = parseCSVLine(lines[0], delimiter).map(h => h.toLowerCase().trim());
    const emailIdx = headers.indexOf('email');
    const nameIdx = headers.indexOf('name');
    const phoneIdx = headers.indexOf('phone');
    const cityIdx = headers.indexOf('city');
    const countryIdx = headers.indexOf('country');
    const skillsIdx = headers.indexOf('skills');
    const hourlyRateIdx = headers.indexOf('hourly_rate_inr') !== -1 ? headers.indexOf('hourly_rate_inr') : headers.indexOf('hourly_rate');
    const expIdx = headers.indexOf('experience_years') !== -1 ? headers.indexOf('experience_years') : headers.indexOf('experience');
    const bioIdx = headers.indexOf('bio') !== -1 ? headers.indexOf('bio') : headers.indexOf('description');
    const photoIdx = headers.indexOf('profile_photo_url') !== -1 ? headers.indexOf('profile_photo_url') : headers.indexOf('photo');

    // Starting row based on processedRows (if resumed)
    const startIndex = Math.max(1, batch.processedRows + 1);

    for (let i = startIndex; i < lines.length; i++) {
      // Refresh batch from DB to check status
      const currentBatch = await ImportBatch.findById(batchId).select('status');
      if (currentBatch.status === 'paused') {
        logger.info(`Batch ${batchId} paused at row ${i}`);
        return;
      }
      if (currentBatch.status === 'stopped') {
        logger.info(`Batch ${batchId} stopped at row ${i}`);
        return;
      }

      const values = parseCSVLine(lines[i], delimiter);
      let email = emailIdx !== -1 ? values[emailIdx] : '';
      const name = nameIdx !== -1 ? values[nameIdx] : '';
      const phone = phoneIdx !== -1 ? values[phoneIdx] : '';
      let city = cityIdx !== -1 ? values[cityIdx] : '';
      let country = countryIdx !== -1 ? values[countryIdx] : '';
      const skillsStr = skillsIdx !== -1 ? values[skillsIdx] : '';
      const hourlyRateStr = hourlyRateIdx !== -1 ? values[hourlyRateIdx] : '';
      const expStr = expIdx !== -1 ? values[expIdx] : '';
      const bioStr = bioIdx !== -1 ? values[bioIdx] : '';
      const photoStr = photoIdx !== -1 ? values[photoIdx] : '';

      if (!email || !name) {
        batch.failedCount++;
        batch.errors.push({ row: i + 1, message: 'Missing name or email' });
        batch.processedRows = i;
        await batch.save();
        continue;
      }

      email = email.toLowerCase().trim();

      let expVal = '';
      if (expStr) {
        const cleanExp = expStr.trim().toLowerCase();
        const matchNum = cleanExp.match(/^(\d+)/);
        if (matchNum) {
          const num = parseInt(matchNum[1]);
          expVal = `${num} ${num === 1 ? 'year' : 'years'}`;
        } else {
          expVal = expStr.trim();
        }
      }

      try {
        const skillsArray = skillsStr 
          ? skillsStr.split(/[;,]/).map(s => s.trim()).filter(Boolean) 
          : [];

        let latVal = null;
        let lngVal = null;
        let placeIdVal = '';
        let resolvedCity = city;
        let resolvedCountry = country;
        const searchLoc = [city, country].filter(Boolean).join(', ');
        
        if (searchLoc) {
          try {
            const places = await searchPlaces(searchLoc);
            if (places && places.length > 0) {
              const details = await getPlaceDetails(places[0].placeId);
              if (details) {
                latVal = details.latitude ?? null;
                lngVal = details.longitude ?? null;
                placeIdVal = details.placeId ?? '';
                if (details.city) resolvedCity = details.city;
                if (details.country) resolvedCountry = details.country;
              }
            } else {
              const geocoded = await getCoordinatesFromText(searchLoc);
              if (geocoded && geocoded.lat && geocoded.lon) {
                latVal = geocoded.lat;
                lngVal = geocoded.lon;
              }
            }
          } catch (geoErr) {
            logger.warn(`Geocoding failed for row ${i+1}: ${geoErr.message}`);
          }
        }

        let pricingEntries = [];
        let hourlyRate = 0;
        if (hourlyRateStr) {
          hourlyRate = parseFloat(hourlyRateStr.replace(/[^0-9.]/g, '')) || 0;
        }

        if (hourlyRate > 0) {
          pricingEntries = [{
            specialitySlug: skillsArray[0] ? skillsArray[0].toLowerCase().replace(/\s+/g, '-') : 'general',
            locationPlaceId: placeIdVal,
            perHour: hourlyRate,
            perDay: hourlyRate * 8,
            perMonth: hourlyRate * 8 * 22,
            currency: 'INR',
            source: 'csv_upload'
          }];
        }

        const existing = await User.findOne({ email });
        if (existing) {
          if (existing.role !== 'provider') {
            existing.role = 'provider';
            if (!existing.roles.includes('provider')) {
              existing.roles.push('provider');
            }
            existing.activeRole = 'provider';
            await existing.save();
          }
          if (photoStr) {
            existing.avatar = photoStr;
            await existing.save();
          }

          let profile = await ProviderProfile.findOne({ user: existing._id });
          if (profile) {
            profile.profileName = name;
            profile.name = name;
            profile.city = resolvedCity;
            profile.skills = skillsArray;
            profile.experience = expVal;
            profile.description = bioStr || '';
            profile.photo = photoStr || '';
            profile.profilePhoto = photoStr || '';
            profile.pricing = hourlyRate ? String(hourlyRate) : '';
            profile.pricingType = hourlyRate ? 'hourly' : '';
            profile.pricingEntries = pricingEntries;
            profile.latitude = latVal;
            profile.longitude = lngVal;
            profile.location = {
              city: resolvedCity,
              country: resolvedCountry,
              latitude: latVal,
              longitude: lngVal,
              placeId: placeIdVal,
              source: 'csv_upload'
            };
            profile.isApproved = true;
            profile.isVerified = true;
            await profile.save();
          } else {
            await ProviderProfile.create({
              user: existing._id,
              profileName: name,
              name,
              city: resolvedCity,
              skills: skillsArray,
              tier: 'skilled',
              skillLevel: 'skilled',
              latitude: latVal,
              longitude: lngVal,
              experience: expVal,
              description: bioStr || '',
              photo: photoStr || '',
              profilePhoto: photoStr || '',
              pricing: hourlyRate ? String(hourlyRate) : '',
              pricingType: hourlyRate ? 'hourly' : '',
              pricingEntries,
              location: {
                city: resolvedCity,
                country: resolvedCountry,
                latitude: latVal,
                longitude: lngVal,
                placeId: placeIdVal,
                source: 'csv_upload'
              },
              isApproved: true,
              isVerified: true
            });
          }
          batch.successCount++;
        } else {
          const user = await User.create({
            name,
            email,
            phone: phone || undefined,
            avatar: photoStr || undefined,
            password: "password123",
            role: "provider",
            roles: ["provider"],
            activeRole: "provider",
            approvalStatus: "approved",
            isEmailVerified: true
          });

          await ProviderProfile.create({
            user: user._id,
            profileName: name,
            name,
            city: resolvedCity,
            skills: skillsArray,
            tier: 'skilled',
            skillLevel: 'skilled',
            latitude: latVal,
            longitude: lngVal,
            experience: expVal,
            description: bioStr || '',
            photo: photoStr || '',
            profilePhoto: photoStr || '',
            pricing: hourlyRate ? String(hourlyRate) : '',
            pricingType: hourlyRate ? 'hourly' : '',
            pricingEntries,
            location: {
              city: resolvedCity,
              country: resolvedCountry,
              latitude: latVal,
              longitude: lngVal,
              placeId: placeIdVal,
              source: 'csv_upload'
            },
            isApproved: true,
            isVerified: true
          });

          batch.successCount++;
        }
      } catch (err) {
        batch.failedCount++;
        batch.errors.push({ row: i + 1, message: err.message });
      }

      batch.processedRows = i;
      // Save every row to provide real-time updates to UI
      await batch.save();
      
      // Throttle slightly to avoid API rate limits and DB lockups
      await sleep(500); 
    }

    batch.status = 'completed';
    batch.completedAt = new Date();
    await batch.save();

  } catch (error) {
    logger.error('Error processing batch:', error);
    try {
      await ImportBatch.findByIdAndUpdate(batchId, { status: 'failed' });
    } catch (e) {}
  }
};

const processRecruiterBatch = async (batchId) => {
  try {
    const batch = await ImportBatch.findById(batchId).select('+csvData');
    if (!batch) return;

    if (batch.status === 'paused' || batch.status === 'stopped' || batch.status === 'failed' || batch.status === 'completed') {
      return;
    }

    batch.status = 'processing';
    await batch.save();

    const csvData = batch.csvData;
    const lines = csvData.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) {
      batch.status = 'failed';
      await batch.save();
      return;
    }

    let delimiter = ',';
    const firstLine = lines[0];
    const commas = (firstLine.match(/,/g) || []).length;
    const semicolons = (firstLine.match(/;/g) || []).length;
    if (semicolons > commas) {
      delimiter = ';';
    }

    const headers = parseCSVLine(lines[0], delimiter).map(h => h.toLowerCase().trim());
    const emailIdx = headers.indexOf('email');
    const nameIdx = headers.indexOf('name');
    const phoneIdx = headers.indexOf('phone');
    const companyIdx = headers.indexOf('company') !== -1 ? headers.indexOf('company') : headers.indexOf('company_name');
    const cityIdx = headers.indexOf('city');
    const countryIdx = headers.indexOf('country');

    const startIndex = Math.max(1, batch.processedRows + 1);
    const RecruiterProfile = require('../../models/RecruiterProfile');

    for (let i = startIndex; i < lines.length; i++) {
      const currentBatch = await ImportBatch.findById(batchId).select('status');
      if (currentBatch.status === 'paused') {
        logger.info(`Batch ${batchId} paused at row ${i}`);
        return;
      }
      if (currentBatch.status === 'stopped') {
        logger.info(`Batch ${batchId} stopped at row ${i}`);
        return;
      }

      const values = parseCSVLine(lines[i], delimiter);
      let email = emailIdx !== -1 ? values[emailIdx] : '';
      const name = nameIdx !== -1 ? values[nameIdx] : '';
      const phone = phoneIdx !== -1 ? values[phoneIdx] : '';
      const company = companyIdx !== -1 ? values[companyIdx] : '';
      let city = cityIdx !== -1 ? values[cityIdx] : '';
      let country = countryIdx !== -1 ? values[countryIdx] : '';

      if (!email || !name) {
        batch.failedCount++;
        batch.errors.push({ row: i + 1, message: 'Missing name or email' });
        batch.processedRows = i;
        await batch.save();
        continue;
      }

      email = email.toLowerCase().trim();

      try {
        const existing = await User.findOne({ email });
        if (existing) {
          if (existing.role !== 'recruiter') {
            existing.role = 'recruiter';
            if (!existing.roles.includes('recruiter')) {
              existing.roles.push('recruiter');
            }
            existing.activeRole = 'recruiter';
            await existing.save();
          }

          let profile = await RecruiterProfile.findOne({ user: existing._id });
          if (profile) {
            profile.profileName = name;
            if (company) profile.companyName = company;
            if (city) profile.city = city;
            profile.isApproved = true;
            await profile.save();
          } else {
            await RecruiterProfile.create({
              user: existing._id,
              profileName: name,
              companyName: company || name,
              city: city,
              isApproved: true,
            });
          }
          batch.successCount++;
        } else {
          const user = await User.create({
            name,
            email,
            phone: phone || undefined,
            password: "password123",
            role: "recruiter",
            roles: ["recruiter"],
            activeRole: "recruiter",
            approvalStatus: "approved",
            isEmailVerified: true,
            provider: "csv_upload"
          });

          await RecruiterProfile.create({
            user: user._id,
            profileName: name,
            companyName: company || name,
            city: city,
            isApproved: true,
          });
          batch.successCount++;
        }
      } catch (err) {
        batch.failedCount++;
        batch.errors.push({ row: i + 1, message: err.message });
      }

      batch.processedRows = i;
      await batch.save();
      await sleep(500); 
    }

    batch.status = 'completed';
    batch.completedAt = new Date();
    await batch.save();

  } catch (error) {
    logger.error('Error processing recruiter batch:', error);
    try {
      await ImportBatch.findByIdAndUpdate(batchId, { status: 'failed' });
    } catch (e) {}
  }
};

module.exports = {
  processProviderBatch,
  processRecruiterBatch
};
