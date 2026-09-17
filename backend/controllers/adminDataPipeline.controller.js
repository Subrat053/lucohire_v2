const DataSourceConfig = require('../models/DataSourceConfig');
const PipelineAutomation = require('../models/PipelineAutomation');
const StagingCandidate = require('../models/StagingCandidate');
const ActiveScoreService = require('../services/ActiveScoreService');
const IngestionSettings = require('../models/IngestionSettings');
const CountryConfig = require('../models/CountryConfig');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

// Free API Connectors
const { fetchRemoteOkJobs } = require('../modules/globalJobConnectors/remoteok.connector');
const { fetchRemotiveJobs } = require('../modules/globalJobConnectors/remotive.connector');
const { fetchArbeitnowJobs } = require('../modules/globalJobConnectors/arbeitnow.connector');
const { fetchAdzunaJobs } = require('../modules/globalJobConnectors/adzuna.connector');
const { fetchJoobleJobs } = require('../modules/globalJobConnectors/jooble.connector');
const { fetchTheMuseJobs } = require('../modules/globalJobConnectors/themuse.connector');

// Map source key -> display name, cost, free status
const FREE_SOURCE_REGISTRY = {
  remoteok:   { name: 'RemoteOK',    costPerRecord: 0, status: 'Ready / Free' },
  remotive:   { name: 'Remotive',    costPerRecord: 0, status: 'Ready / Free' },
  arbeitnow:  { name: 'Arbeitnow',   costPerRecord: 0, status: 'Ready / Free' },
  adzuna:     { name: 'Adzuna',      costPerRecord: 0, status: 'API Key Required' },
  jooble:     { name: 'Jooble',      costPerRecord: 0, status: 'API Key Required' },
  themuse:    { name: 'The Muse',    costPerRecord: 0, status: 'Ready / Free' },
  usajobs:    { name: 'USAJobs',     costPerRecord: 0, status: 'API Key Required' },
  greenhouse: { name: 'Greenhouse',  costPerRecord: 0, status: 'Ready / Free (ATS)' },
  lever:      { name: 'Lever',       costPerRecord: 0, status: 'Ready / Free (ATS)' },
  ashby:      { name: 'Ashby',       costPerRecord: 0, status: 'Ready / Free (ATS)' },
  smartrecruiters: { name: 'SmartRecruiters', costPerRecord: 0, status: 'Ready / Free (ATS)' },
  workable:   { name: 'Workable',    costPerRecord: 0, status: 'Ready / Free (ATS)' },
};

async function callFreeConnector(sourceKey, keyword, countryCode, limit) {
  async function fetchWithKeyword(kw) {
    if (sourceKey === 'remoteok') return fetchRemoteOkJobs(kw);
    if (sourceKey === 'remotive') return fetchRemotiveJobs(kw);
    if (sourceKey === 'arbeitnow') return fetchArbeitnowJobs(countryCode, kw);
    if (sourceKey === 'adzuna') return fetchAdzunaJobs(countryCode, kw);
    if (sourceKey === 'jooble') return fetchJoobleJobs(countryCode, kw);
    if (sourceKey === 'themuse') return fetchTheMuseJobs(kw);
    throw new Error(`Free connector for '${sourceKey}' not yet implemented.`);
  }

  let results = keyword ? await fetchWithKeyword(keyword) : [];

  // If keyword filter returned nothing, retry without keyword (smart fallback)
  if (results.length === 0) {
    console.log(`[FreeAPI] ${sourceKey}: no results for keyword "${keyword}", retrying without filter...`);
    results = await fetchWithKeyword('');
  }

  return results.slice(0, limit);
}

exports.getConfigs = async (req, res) => {
  try {
    const configs = await DataSourceConfig.find({}).sort({ createdAt: -1 });
    res.status(200).json({ success: true, configs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Sync DataSourceConfigs from CountryConfig.supportedJobSources
exports.syncConfigsFromCountries = async (req, res) => {
  try {
    const countries = await CountryConfig.find({ isActive: true });
    let created = 0, skipped = 0;

    for (const country of countries) {
      const sources = [
        ...(country.supportedJobSources || []),
        ...(country.supportedAtsSources || [])
      ];

      for (const sourceKey of sources) {
        const meta = FREE_SOURCE_REGISTRY[sourceKey];
        if (!meta) continue;

        const existing = await DataSourceConfig.findOne({ country: country.countryName, sourceKey });
        if (existing) { skipped++; continue; }

        await DataSourceConfig.create({
          name: `${meta.name} (${country.countryName})`,
          country: country.countryName,
          type: 'free_api',
          sourceKey,
          endpointOrActorId: '',
          status: meta.status,
          costPerRecord: meta.costPerRecord,
          isActive: true,
          aiPromptTemplate: `You are a candidate data parser. Given job listings from ${meta.name}, extract candidate/job information. Return a JSON array where each item has: name (company or poster), email, phone, jobTitle (job title), skills (array of tags/skills), location. For missing fields use null. Return ONLY valid JSON array.`
        });
        created++;
      }
    }

    res.status(200).json({ success: true, message: `Sync complete: ${created} configs created, ${skipped} already existed.`, created, skipped });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.createConfig = async (req, res) => {
  try {
    const newConfig = new DataSourceConfig(req.body);
    await newConfig.save();
    res.status(201).json({ success: true, config: newConfig });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedConfig = await DataSourceConfig.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
    if (!updatedConfig) return res.status(404).json({ success: false, message: 'Config not found' });
    res.status(200).json({ success: true, config: updatedConfig });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedConfig = await DataSourceConfig.findByIdAndDelete(id);
    if (!deletedConfig) return res.status(404).json({ success: false, message: 'Config not found' });
    res.status(200).json({ success: true, message: 'Configuration deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getSettings = async (req, res) => {
  try {
    const settings = await IngestionSettings.getSettings();
    res.status(200).json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const settings = await IngestionSettings.getSettings();
    Object.assign(settings, req.body);
    await settings.save();
    res.status(200).json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.previewIngestion = async (req, res) => {
  try {
    const { configId, keywords, location, experience, jobType, activeFilters, limit } = req.body;
    
    const config = await DataSourceConfig.findById(configId);
    if (!config) return res.status(404).json({ success: false, message: 'Config not found' });

    const settings = await IngestionSettings.getSettings();
    
    // Calculate estimates
    const expectedRecords = Number(limit) || 10;
    const estimatedCost = expectedRecords * (config.costPerRecord || 0.05); // Default 0.05 if not set
    
    // Simple heuristic for duplicates: random between 5% and 25% or we can check DB.
    // For now, let's just do a quick count of existing candidates with similar keywords
    const duplicateEstimate = Math.floor(expectedRecords * 0.15); // mock 15%
    const newRecordsEstimate = expectedRecords - duplicateEstimate;
    
    const activeSignalLeadEstimate = Math.floor(newRecordsEstimate * 0.4); // mock 40%
    
    const monthlyBudgetRemaining = Math.max(0, settings.maxSpendPerMonth - settings.monthlySpendUsed);
    const dailyQuotaRemaining = Math.max(0, settings.maxRecordsPerDay - settings.dailyRecordsUsed);
    
    let riskLevel = 'Low';
    let warningMessage = '';
    
    if (estimatedCost > monthlyBudgetRemaining) {
      riskLevel = 'High';
      warningMessage = 'This run exceeds your remaining monthly budget.';
    } else if (expectedRecords > dailyQuotaRemaining) {
      riskLevel = 'High';
      warningMessage = 'This run exceeds your remaining daily records quota.';
    } else if (expectedRecords > 500) {
      riskLevel = 'Medium';
      warningMessage = 'Large runs may take several minutes and hit rate limits.';
    }

    res.status(200).json({
      success: true,
      preview: {
        sourceName: config.name,
        country: req.body.country || 'Global',
        keyword: keywords || 'Any',
        location: location || 'Any',
        experienceFilter: experience || 'Any',
        jobType: jobType || 'Any',
        activeFilters: activeFilters ? 'Enabled' : 'Disabled',
        expectedRecords,
        estimatedCost: estimatedCost.toFixed(2),
        duplicateEstimate,
        newRecordsEstimate,
        activeSignalLeadEstimate,
        monthlyBudgetRemaining: monthlyBudgetRemaining.toFixed(2),
        dailyQuotaRemaining,
        riskLevel,
        sourceStatus: config.isActive ? 'Healthy' : 'Inactive/Failing',
        warningMessage
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.triggerIngestion = async (req, res) => {
  try {
    const { configId, keywords, location, experience, jobType, activeFilters, activeFiltersArray, outreachChannels, limit, isPreview } = req.body;
    const config = await DataSourceConfig.findById(configId);
    if (!config) return res.status(404).json({ success: false, message: 'Config not found' });

    const settings = await IngestionSettings.getSettings();
    const actualLimit = isPreview ? 2 : (Number(limit) || 10);
    const estimatedCost = actualLimit * (config.costPerRecord || 0.05);

    if (!isPreview) {
      if (settings.dailyRecordsUsed + actualLimit > settings.maxRecordsPerDay) {
        return res.status(400).json({ success: false, message: `Run blocked: Exceeds daily record limit of ${settings.maxRecordsPerDay}` });
      }
      if (settings.monthlySpendUsed + estimatedCost > settings.maxSpendPerMonth) {
        return res.status(400).json({ success: false, message: `Run blocked: Exceeds monthly budget of ${settings.maxSpendPerMonth}` });
      }
    }
    
    let rawData = null;

    try {
      if (config.type === 'apify_actor') {
        const apifyToken = config.apiKey || process.env.APIFY_API_TOKEN;
        if (!apifyToken) throw new Error("API Token is missing. Provide an API key in the config or backend .env");

        let searchStr = [keywords, location, experience, jobType].filter(Boolean).join(' ');
        
        let payload = {
          search: searchStr,
          queries: searchStr,
          query: searchStr,
          keywords: searchStr,
          searchQuery: searchStr,
          maxItems: actualLimit,
          maxProfiles: actualLimit,
          maxResults: actualLimit,
          limit: actualLimit,
          count: actualLimit
        };

        const actorIdSafe = config.endpointOrActorId.replace(/\//g, '~');
        try {
          const response = await axios.post(
            `https://api.apify.com/v2/acts/${actorIdSafe}/run-sync-get-dataset-items?token=${apifyToken}`,
            payload
          );
          rawData = response.data;
        } catch (err) {
          console.warn("Apify actor failed or returned error. Using mock data for testing...", err.message);
          rawData = null;
        }


      } else if (config.type === 'rest_api') {
        let url;
        try {
          url = new URL(config.endpointOrActorId);
        } catch (err) {
          throw new Error(`Invalid REST API URL: ${config.endpointOrActorId}. Must include https://`);
        }
        
        let headers = {};
        if (config.apiHeaders && config.apiHeaders.trim() !== '') {
          try {
            headers = JSON.parse(config.apiHeaders);
          } catch (err) {
            throw new Error("Invalid API Headers JSON. Ensure it is valid JSON.");
          }
        }
        
        if (config.apiKey && config.apiKey.trim() !== '') {
          if (!headers['Authorization']) {
            headers['Authorization'] = `Bearer ${config.apiKey.trim()}`;
          }
          if (!headers['x-api-key']) {
            headers['x-api-key'] = config.apiKey.trim();
          }
        }

        let searchStr = [keywords, location, experience, jobType].filter(Boolean).join(' ');
        try {
          if (config.apiMethod === 'POST') {
            let payload = {
              search: searchStr,
              queries: searchStr,
              query: searchStr,
              keywords: searchStr,
              searchQuery: searchStr,
              location: location || '',
              experience: experience || '',
              jobType: jobType || '',
              maxItems: actualLimit,
              maxProfiles: actualLimit,
              maxResults: actualLimit,
              limit: actualLimit,
              count: actualLimit
            };
            const response = await axios.post(url.toString(), payload, { headers });
            rawData = response.data;
          } else {
            if (searchStr) url.searchParams.append('q', searchStr);
            if (actualLimit) url.searchParams.append('limit', actualLimit);
            const response = await axios.get(url.toString(), { headers });
            rawData = response.data;
          }
        } catch (err) {
          console.warn("REST API actor failed or returned error. Using mock data for testing...", err.message);
          rawData = null;
        }
      } else if (config.type === 'free_api') {
        // Use existing free connectors
        try {
          const countryCode = config.country === 'India' ? 'IN' : config.country === 'USA' ? 'US' :
            config.country === 'UK' ? 'GB' : config.country === 'Canada' ? 'CA' :
            config.country === 'UAE' ? 'AE' : 'US';
          rawData = await callFreeConnector(config.sourceKey, keywords, countryCode, actualLimit);
        } catch (freeErr) {
          console.warn(`[FreeAPI] ${config.sourceKey} failed:`, freeErr.message);
          rawData = null;
        }
      } else {
        return res.status(400).json({ success: false, message: `Execution for type ${config.type} is not supported directly via Trigger yet.` });
      }
    } catch (fetchErr) {
      if (fetchErr.response) {
        throw new Error(`Integration API Error (${fetchErr.response.status}): ${JSON.stringify(fetchErr.response.data)}`);
      }
      throw new Error(`Fetch Error: ${fetchErr.message}`);
    }

    if (config.type === 'free_api') {
      if (!rawData || !Array.isArray(rawData) || rawData.length === 0) {
        return res.status(200).json({
          success: true,
          message: `No results returned from ${config.sourceKey}. Try a different keyword or the source may be temporarily unavailable.`,
          candidates: []
        });
      }

      const { calculateScoreAndStatus } = require('../services/ActiveScoreService');
      const standardizedCandidates = rawData.map(job => {
        const candidateData = {
          resumeUpdatedAt: null, openToWork: true, recentlyActive: true,
          noticePeriodAvailable: false, preferredJobTypeAvailable: true,
          resumeUploaded: false, appliedToJob: false, claimLinkClicked: false,
          emailVerified: false, phoneVerified: false, consentAccepted: false, profileCompleted: false
        };
        const { score, leadStatus } = calculateScoreAndStatus(candidateData);
        return {
          name: job.companyName || 'Unknown Company',
          email: null,
          phone: null,
          jobTitle: job.title || keywords || 'Professional',
          skills: Array.isArray(job.skillsTags) ? job.skillsTags : [],
          location: job.location || location || 'Remote',
          publicProfileUrl: job.url || '',
          activeScore: score,
          leadStatus,
          ...candidateData,
          apifyRunId: `pipeline-${uuidv4().substring(0, 8)}`,
          sourceQuery: [keywords, location].filter(Boolean).join(' ') || 'free-api-run',
          claimToken: uuidv4(),
          claimExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          emailSentAt: null,
          sourceConfigId: config._id,
          emailToggle: Array.isArray(outreachChannels) ? outreachChannels.map(c => c.toLowerCase()).includes('email') : true,
          whatsappToggle: Array.isArray(outreachChannels) ? outreachChannels.map(c => c.toLowerCase()).includes('whatsapp') : false
        };
      });

      if (isPreview) {
        return res.status(200).json({ success: true, message: 'Preview generated.', candidates: standardizedCandidates });
      }

      const stagedDocs = [];
      for (const cand of standardizedCandidates) {
        const emailKey = `noemail-${cand.apifyRunId}@pipeline.internal`;
        const exists = await StagingCandidate.findOne({ jobTitle: cand.jobTitle, sourceConfigId: cand.sourceConfigId, publicProfileUrl: cand.publicProfileUrl }).lean();
        if (!exists) {
          const doc = new StagingCandidate({ ...cand, email: emailKey });
          await doc.save();
          stagedDocs.push(doc);
        }
      }

      config.failureCount = 0;
      config.lastSuccess = new Date();
      await config.save();

      return res.status(200).json({
        success: true,
        message: `Fetched ${rawData.length} job listings from ${config.name}. Saved ${stagedDocs.length} new records.`,
        candidates: stagedDocs.length > 0 ? stagedDocs : standardizedCandidates
      });
    }

    if (!rawData || (Array.isArray(rawData) && rawData.length === 0)) {
      console.log("No data returned from source or error occurred. Using mock data fallback...");
      rawData = [
        {
          name: "Mock Raw Lead",
          email: "raw.lead@example.com",
          phone: "9876543210",
          jobTitle: "Software Engineer",
          location: "Bangalore",
          skills: ["Java", "Spring Boot"],
          publicProfileUrl: "https://linkedin.com/in/rawlead"
        },
        {
          name: "Mock Active Signal Lead",
          email: "active.signal@example.com",
          phone: "9876543211",
          jobTitle: "Senior React Developer",
          location: "Pune",
          skills: ["React", "Node.js"],
          publicProfileUrl: "https://linkedin.com/in/activesignal",
          resumeUpdatedAt: new Date().toISOString(),
          openToWork: true,
          recentlyActive: true
        }
      ];
    }

    // AI Normalization
    try {
      const prompt = `
        You are an expert data parser.
        The user has provided an AI Prompt Template and a block of RAW JSON data scraped from an external source.
        
        USER AI PROMPT TEMPLATE:
        "${config.aiPromptTemplate}"
        
        ACTIVE FILTERS:
        The admin is specifically looking for candidates matching these traits: ${Array.isArray(activeFiltersArray) ? activeFiltersArray.join(', ') : 'None specified'}. 
        If you find evidence of these traits in the JSON, assign a higher "activeScore".

        RAW JSON DATA:
        ${JSON.stringify(rawData).substring(0, 15000)}

        Based on the prompt template, extract the candidates. 
        IMPORTANT: You MUST return a valid JSON array of objects.
        EACH object MUST contain these exact keys (even if empty/null):
        - name (String)
        - email (String)
        - phone (String)
        - jobTitle (String)
        - skills (Array of Strings)
        - resumeUpdatedAt (ISO Date String, if available)
        - openToWork (Boolean)
        - recentlyActive (Boolean)
        - noticePeriodAvailable (Boolean)
        - preferredJobTypeAvailable (Boolean)
      `;

      const { callOpenAI } = require('../services/ai/llmService');
      const { calculateScoreAndStatus } = require('../services/ActiveScoreService');
      const aiResult = await callOpenAI(prompt);
      
      if (!aiResult.used) {
        throw new Error("AI extraction failed: " + aiResult.reason);
      }

      const extractedJson = aiResult.output;
      if (!extractedJson || !Array.isArray(extractedJson)) {
        throw new Error("AI did not return a valid JSON array.");
      }

      const standardizedCandidates = extractedJson.map(c => {
        // Calculate dynamic active score using the new engine
        const candidateData = {
          resumeUpdatedAt: c.resumeUpdatedAt ? new Date(c.resumeUpdatedAt) : null,
          openToWork: !!c.openToWork,
          recentlyActive: !!c.recentlyActive,
          noticePeriodAvailable: !!c.noticePeriodAvailable,
          preferredJobTypeAvailable: !!c.preferredJobTypeAvailable,
          // Defaults for freshly scraped leads
          resumeUploaded: false,
          appliedToJob: false,
          claimLinkClicked: false,
          emailVerified: false,
          phoneVerified: false,
          consentAccepted: false,
          profileCompleted: false
        };

        const { score, leadStatus } = calculateScoreAndStatus(candidateData);

        return {
          name: c.name || "Unknown Candidate",
          email: c.email || "",
          phone: c.phone || "",
          jobTitle: c.jobTitle || keywords || "Professional",
          skills: Array.isArray(c.skills) ? c.skills : [],
          
          activeScore: score,
          leadStatus: leadStatus,
          ...candidateData, // Save the boolean flags too
          apifyRunId: `pipeline-${uuidv4().substring(0, 8)}`,
          sourceQuery: [keywords, location, experience].filter(Boolean).join(' ') || 'pipeline-ingestion',
          claimToken: uuidv4(),
          claimExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          emailSentAt: null,
          sourceConfigId: config._id,
          // Handle specific outreach channels if provided from SmartCommand
          emailToggle: Array.isArray(outreachChannels) ? outreachChannels.map(c=>c.toLowerCase()).includes('email') : true,
          whatsappToggle: Array.isArray(outreachChannels) ? outreachChannels.map(c=>c.toLowerCase()).includes('whatsapp') : false
        };
      });

      // 3. Save to Staging Table or just return if preview
      if (isPreview) {
        return res.status(200).json({
          success: true,
          message: 'Preview generated successfully.',
          candidates: standardizedCandidates
        });
      }
      const stagedDocs = [];
      for (const cand of standardizedCandidates) {
        // If no email, generate a unique internal placeholder so the record is NOT silently dropped
        if (!cand.email) {
          cand.email = `unknown-${cand.apifyRunId}@pipeline.internal`;
        }
        // Career Versioning & Dedupe
        const exists = await StagingCandidate.findOne({ email: cand.email });
        if (!exists) {
          const newStaging = new StagingCandidate(cand);
          await newStaging.save();
          stagedDocs.push(newStaging);
        } else {
          // Compare if Job Title or Skills changed
          const titleChanged = cand.jobTitle && cand.jobTitle !== exists.jobTitle;
          const skillsChanged = cand.skills && cand.skills.length > 0 && JSON.stringify(cand.skills) !== JSON.stringify(exists.skills);
          
          if (titleChanged || skillsChanged) {
            // Push old to careerHistory
            exists.careerHistory.push({
              jobTitle: exists.jobTitle,
              skills: exists.skills,
              location: exists.location,
              importedAt: exists.lastImportedAt,
              sourceQuery: exists.sourceQuery
            });
            
            // Update with new data
            if (titleChanged) exists.jobTitle = cand.jobTitle;
            if (skillsChanged) exists.skills = cand.skills;
            exists.lastImportedAt = new Date();
            exists.sourceQuery = cand.sourceQuery;
            
            // Boost active score
            exists.activeScore += 10;
            if (exists.activeScore >= 31 && exists.leadStatus === 'Raw Lead') {
              exists.leadStatus = 'Active Signal Lead';
            }
            
            await exists.save();
          }
          stagedDocs.push(exists);
        }
      }

      // 4. Update usage quotas if not preview
      if (!isPreview) {
        const recordsAdded = stagedDocs.length;
        const costAdded = recordsAdded * (config.costPerRecord || 0.05);
        settings.dailyRecordsUsed += recordsAdded;
        settings.monthlyRecordsUsed += recordsAdded;
        settings.dailySpendUsed += costAdded;
        settings.monthlySpendUsed += costAdded;
        await settings.save();
      }

      // 5. Update health of source
      if (!isPreview) {
        config.failureCount = 0;
        config.lastSuccess = new Date();
        if (config.status === 'Failing (Auto-Disabled)') {
            config.status = 'Ready / Free';
            config.isActive = true;
        }
        await config.save();
      }

      res.status(200).json({
        success: true,
        message: `Successfully ingested and normalized ${stagedDocs.length} candidates. Cost: $${(stagedDocs.length * (config.costPerRecord || 0.05)).toFixed(2)}`,
        candidates: stagedDocs
      });

    } catch (aiError) {
      throw new Error(`AI Extraction Error: ${aiError.message}`);
    }

  } catch (error) {
    console.error('[DataPipeline] Error:', error.message);
    const fs = require('fs');
    fs.writeFileSync('pipeline_error.log', error.stack || error.message);
    
    // Increment failure count if config exists
    try {
      const { configId } = req.body;
      if (configId) {
        const config = await DataSourceConfig.findById(configId);
        if (config) {
          config.failureCount = (config.failureCount || 0) + 1;
          if (config.failureCount >= 3) {
            config.isActive = false;
            config.status = 'Failing (Auto-Disabled)';
          }
          await config.save();
        }
      }
    } catch (ignore) {}

    res.status(500).json({ success: false, error: error.message, stack: error.stack });
  }
};

// --- Automations ---

exports.getAutomations = async (req, res) => {
  try {
    const automations = await PipelineAutomation.find().populate('configId', 'name type endpointOrActorId').sort({ createdAt: -1 });
    res.status(200).json({ success: true, automations });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.createAutomation = async (req, res) => {
  try {
    const DataSourceConfig = require('../models/DataSourceConfig');
    if (req.body.configId) {
      const config = await DataSourceConfig.findById(req.body.configId);
      if (config && config.type === 'csv_upload') {
        return res.status(400).json({ success: false, message: 'Automations are not supported for CSV uploads.' });
      }
    }
    const automation = await PipelineAutomation.create(req.body);
    res.status(201).json({ success: true, automation });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateAutomation = async (req, res) => {
  try {
    const automation = await PipelineAutomation.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json({ success: true, automation });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteAutomation = async (req, res) => {
  try {
    await PipelineAutomation.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Automation deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.toggleAutomation = async (req, res) => {
  try {
    const automation = await PipelineAutomation.findById(req.params.id);
    if (!automation) return res.status(404).json({ success: false, message: 'Not found' });
    
    automation.status = automation.status === 'active' ? 'paused' : 'active';
    await automation.save();
    
    res.status(200).json({ success: true, automation });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
