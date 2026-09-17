const CountryPipelineConfig = require('../models/pipeline/CountryPipelineConfig');
const JSearchScanRun = require('../models/pipeline/JSearchScanRun');
const RawJobImport = require('../models/pipeline/RawJobImport');
const JobPost = require('../models/JobPost');
const PipelineAuditLog = require('../models/pipeline/PipelineAuditLog');
const Category = require('../models/pipeline/Category');
const CategorySuggestion = require('../models/pipeline/CategorySuggestion');
const CompanyMaster = require('../models/pipeline/CompanyMaster');
const CompanyAliasSuggestion = require('../models/pipeline/CompanyAliasSuggestion');
const LocationMaster = require('../models/pipeline/LocationMaster');
const SourceConfidence = require('../models/pipeline/SourceConfidence');
const DuplicateGroup = require('../models/pipeline/DuplicateGroup');
const JobAnalyticsMetric = require('../models/pipeline/JobAnalyticsMetric');
const { verifyJobStatus } = require('../utils/jobHealthChecker');

const { runQueryScan } = require('../services/pipeline/jsearchScanService');

// ─── Pipeline Config ────────────────────────────────────────────────────────
exports.getCountries = async (req, res) => {
  try {
    const countries = await CountryPipelineConfig.find();
    res.json({ success: true, data: countries });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateCountry = async (req, res) => {
  try {
    const { id } = req.params;
    const update = req.body;
    const country = await CountryPipelineConfig.findByIdAndUpdate(id, update, { new: true });
    res.json({ success: true, data: country });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Queries ────────────────────────────────────────────────────────────────
exports.getQueries = async (req, res) => {
  try {
    const countries = await CountryPipelineConfig.find();
    const allQueries = [];
    countries.forEach(c => {
      c.seedQueries.forEach(q => {
        allQueries.push({ ...q.toObject(), countryCode: c.countryCode, countryId: c._id });
      });
    });
    res.json({ success: true, data: allQueries });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.addQuery = async (req, res) => {
  try {
    const { countryId, countryCode, query, location, sourceType, autoRun } = req.body;
    let targetCountryCode = countryCode || 'IN';
    let country;

    if (countryId) {
      country = await CountryPipelineConfig.findById(countryId);
    } else {
      country = await CountryPipelineConfig.findOne({ countryCode: targetCountryCode });
    }

    if (!country) {
      // Auto-create country pipeline configuration if missing
      country = await CountryPipelineConfig.create({
        countryCode: targetCountryCode,
        countryName: targetCountryCode === 'IN' ? 'India' : targetCountryCode === 'US' ? 'United States' : targetCountryCode,
        isEnabled: true,
        defaultLocations: [location || 'Bangalore'],
        seedQueries: []
      });
    }

    if (!country.seedQueries) country.seedQueries = [];
    country.seedQueries.push({
      query,
      location: location || 'Bangalore',
      sourceType: sourceType || 'manual',
      isEnabled: true
    });
    await country.save();

    // Automatically trigger immediate background scan for the new query
    if (autoRun !== false) {
      runQueryScan({
        countryCode: country.countryCode,
        query,
        location: location || 'Bangalore',
        scanType: 'manual',
        adminUserId: req.user?._id || null
      }).catch(err => console.error('[AutoRun New Query Error]', err));
    }

    res.json({
      success: true,
      message: 'Query added and scheduled automatically! Initial scan initiated in background.',
      data: country
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Manual Scan ────────────────────────────────────────────────────────────
exports.triggerManualScan = async (req, res) => {
  try {
    const { countryCode, query, location } = req.body;
    const targetCountry = countryCode || 'IN';
    const targetLocation = location || 'India';
    
    // Non-blocking execution for manual scan (runs in background)
    runQueryScan({
      countryCode: targetCountry,
      query,
      location: targetLocation,
      scanType: 'manual',
      adminUserId: req.user?._id || null
    }).catch(err => console.error('[ManualScan Error]', err));

    res.json({
      success: true,
      message: `Manual crawl for "${query}" in ${targetLocation} (${targetCountry}) initiated in background.`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Scans & Imports ────────────────────────────────────────────────────────
exports.getScans = async (req, res) => {
  try {
    const scans = await JSearchScanRun.find().sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, data: scans });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getRawImports = async (req, res) => {
  try {
    const filter = {};
    if (req.query.scanRunId) {
      filter.scanRunId = req.query.scanRunId;
    }
    const rawJobs = await RawJobImport.find(filter).sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, data: rawJobs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPipelineJobs = async (req, res) => {
  try {
    const jobs = await JobPost.find({ isExternal: true }).sort({ postedDate: -1 }).limit(100);
    res.json({ success: true, data: jobs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateJobStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive, status } = req.body;
    const job = await JobPost.findByIdAndUpdate(id, { isActive, status }, { new: true });
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    res.json({ success: true, data: job });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.autoVerifyJobs = async (req, res) => {
  try {
    const { jobIds } = req.body;
    if (!Array.isArray(jobIds) || jobIds.length === 0) {
      return res.json({ success: true, updatedJobs: [] });
    }

    const jobsToCheck = await JobPost.find({ _id: { $in: jobIds }, isActive: true, isExternal: true });
    const updatedJobs = [];

    // Check them in parallel (using Promise.all)
    const verifyPromises = jobsToCheck.map(async (job) => {
      const url = job.applyUrl || job.sourceJobUrl || job.externalUrl;
      const isAlive = await verifyJobStatus(url, job.source);
      
      if (!isAlive) {
        job.isActive = false;
        job.status = 'closed';
        await job.save();
        updatedJobs.push({ id: job._id, isActive: false, status: 'closed' });
      }
    });

    await Promise.all(verifyPromises);

    res.json({ success: true, updatedJobs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Needs Review Queue ─────────────────────────────────────────────────────
exports.getReviewQueue = async (req, res) => {
  try {
    const jobs = await JobPost.find({ status: 'needs_review', isExternal: true });
    res.json({ success: true, data: jobs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.approveReviewJob = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body; // e.g. updated title, company, etc.
    
    const job = await JobPost.findOne({ _id: id, isExternal: true });
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    Object.assign(job, updates);
    job.status = 'active';
    job.validationStatus = 'passed';
    await job.save();

    await PipelineAuditLog.create({
      actionType: 'admin_validation_approve',
      entityType: 'job',
      entityId: job._id,
      triggerSource: 'admin_manual',
      adminUserId: req.user._id
    });

    res.json({ success: true, data: job });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Master Data ────────────────────────────────────────────────────────────
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find();
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCategorySuggestions = async (req, res) => {
  try {
    const suggestions = await CategorySuggestion.find({ status: 'pending' });
    res.json({ success: true, data: suggestions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCompanies = async (req, res) => {
  try {
    const companies = await CompanyMaster.find();
    res.json({ success: true, data: companies });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getLocations = async (req, res) => {
  try {
    const locations = await LocationMaster.find();
    res.json({ success: true, data: locations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSourceConfidence = async (req, res) => {
  try {
    const sources = await SourceConfidence.find();
    res.json({ success: true, data: sources });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Audit Log ──────────────────────────────────────────────────────────────
exports.getAuditLogs = async (req, res) => {
  try {
    const logs = await PipelineAuditLog.find().sort({ createdAt: -1 }).limit(200);
    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Analytics ──────────────────────────────────────────────────────────────
exports.getAnalytics = async (req, res) => {
  try {
    const metrics = await JobAnalyticsMetric.find().populate('jobId', 'title companyName').sort({ trendingScore: -1 }).limit(50);
    res.json({ success: true, data: metrics });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
