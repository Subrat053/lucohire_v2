const JobPost = require('../../models/JobPost');
const CountryConfig = require('../../models/CountryConfig');

/**
 * Public search for external jobs (or unified jobs if requested)
 */
const searchExternalJobs = async (req, res) => {
  try {
    const {
      skill,
      city,
      country,
      category,
      jobType,
      salaryMin,
      salaryMax,
      source,
      page = 1,
      limit = 20
    } = req.query;

    const filter = { isActive: true, isExternal: true };

    if (country) {
      filter.countryCode = String(country).toUpperCase().trim();
    }
    if (city) {
      filter.city = { $regex: String(city).trim(), $options: 'i' };
    }
    if (category) {
      filter.category = { $regex: String(category).trim(), $options: 'i' };
    }
    if (jobType) {
      filter.jobType = jobType;
    }
    if (source) {
      filter.source = String(source).toLowerCase().trim();
    }
    if (skill) {
      filter.$or = [
        { title: { $regex: String(skill).trim(), $options: 'i' } },
        { skillsTags: { $regex: String(skill).trim(), $options: 'i' } },
        { description: { $regex: String(skill).trim(), $options: 'i' } }
      ];
    }
    if (salaryMin) {
      filter.salaryMin = { $gte: Number(salaryMin) };
    }
    if (salaryMax) {
      filter.salaryMax = { $lte: Number(salaryMax) };
    }

    const skipVal = (parseInt(page) - 1) * parseInt(limit);
    const limitVal = parseInt(limit);

    const [jobs, total] = await Promise.all([
      JobPost.find(filter)
        .sort({ createdAt: -1 })
        .skip(skipVal)
        .limit(limitVal)
        .lean(),
      JobPost.countDocuments(filter)
    ]);

    // Format consistent with internal job posts
    const formattedJobs = jobs.map(job => ({
      ...job,
      isExternal: true,
      job_origin: job.jobOrigin || 'ats',
      apply_mode: job.applyMode || 'external_redirect',
      apply_url: job.applyUrl,
      skills: job.skillsTags
    }));

    res.json({
      jobs: formattedJobs,
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
 * Public details for a specific external job
 */
const getExternalJobDetails = async (req, res) => {
  try {
    const job = await JobPost.findOne({ _id: req.params.id, isExternal: true }).lean();
    if (!job) return res.status(404).json({ message: 'External job not found' });

    res.json({
      ...job,
      isExternal: true,
      job_origin: job.jobOrigin || 'ats',
      apply_mode: job.applyMode || 'external_redirect',
      apply_url: job.applyUrl,
      skills: job.skillsTags
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Admin list external jobs
 */
const adminGetExternalJobs = async (req, res) => {
  try {
    const { country, source, isActive, datePreset, startDate, endDate, search, page = 1, limit = 20 } = req.query;
    const filter = { isExternal: true };
    const andConditions = [];

    // Active Status Filter
    if (isActive !== undefined && isActive !== '') {
      if (isActive === 'true' || isActive === true) {
        andConditions.push({
          $or: [
            { isActive: true },
            { status: 'active' }
          ]
        });
      } else if (isActive === 'false' || isActive === false) {
        andConditions.push({
          $or: [
            { isActive: false },
            { status: { $ne: 'active' } }
          ]
        });
      } else {
        andConditions.push({
          status: { $regex: new RegExp(String(isActive).trim(), 'i') }
        });
      }
    }

    // Source Filter
    if (source && source.trim()) {
      const sRx = new RegExp(String(source).trim(), 'i');
      andConditions.push({
        $or: [
          { source: sRx },
          { sourceType: sRx },
          { jobOrigin: sRx }
        ]
      });
    }

    // Country Filter
    if (country && country.trim()) {
      const c = String(country).trim();
      const cRx = new RegExp(c, 'i');
      const countryOr = [
        { countryCode: cRx },
        { 'location.country': cRx },
        { country: cRx },
        { locationText: cRx }
      ];
      if (c.toUpperCase() === 'IN' || c.toLowerCase() === 'india') {
        countryOr.push({ countryCode: 'IN' }, { countryCode: 'India' }, { 'location.country': 'India' });
      } else if (c.toUpperCase() === 'US' || c.toLowerCase() === 'usa' || c.toLowerCase() === 'united states') {
        countryOr.push({ countryCode: 'US' }, { countryCode: 'USA' }, { 'location.country': 'United States' });
      }
      andConditions.push({ $or: countryOr });
    }

    // Date-wise Filter (createdAt / lastSyncedAt / updatedAt)
    let fromDate = null;
    let toDate = null;

    if (datePreset && datePreset !== 'all') {
      const now = new Date();
      if (datePreset === 'today') {
        fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      } else if (datePreset === 'yesterday') {
        const y = new Date();
        y.setDate(y.getDate() - 1);
        fromDate = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 0, 0, 0, 0);
        toDate = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59, 999);
      } else if (datePreset === '7days') {
        fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      } else if (datePreset === '30days') {
        fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      } else if (datePreset === 'custom') {
        if (startDate) fromDate = new Date(startDate);
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          toDate = end;
        }
      } else {
        andConditions.push({ _id: null }); // Force 0 results for invalid date preset strings
      }
    } else if (startDate || endDate) {
      if (startDate) fromDate = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        toDate = end;
      }
    }

    if (fromDate || toDate) {
      const dateCond = [];
      if (fromDate && toDate) {
        dateCond.push({ createdAt: { $gte: fromDate, $lte: toDate } });
        dateCond.push({ lastSyncedAt: { $gte: fromDate, $lte: toDate } });
        dateCond.push({ updatedAt: { $gte: fromDate, $lte: toDate } });
      } else if (fromDate) {
        dateCond.push({ createdAt: { $gte: fromDate } });
        dateCond.push({ lastSyncedAt: { $gte: fromDate } });
        dateCond.push({ updatedAt: { $gte: fromDate } });
      } else if (toDate) {
        dateCond.push({ createdAt: { $lte: toDate } });
        dateCond.push({ lastSyncedAt: { $lte: toDate } });
        dateCond.push({ updatedAt: { $lte: toDate } });
      }
      andConditions.push({ $or: dateCond });
    }

    // Search Filter
    if (search && search.trim()) {
      const rx = { $regex: String(search).trim(), $options: 'i' };
      andConditions.push({
        $or: [
          { title: rx },
          { companyName: rx },
          { city: rx },
          { countryCode: rx },
          { source: rx }
        ]
      });
    }

    if (andConditions.length > 0) {
      filter.$and = andConditions;
    }

    const skipVal = (parseInt(page) - 1) * parseInt(limit);
    const limitVal = parseInt(limit);

    const [jobs, total, uniqueCompaniesCount] = await Promise.all([
      JobPost.find(filter)
        .sort({ createdAt: -1 })
        .skip(skipVal)
        .limit(limitVal)
        .lean(),
      JobPost.countDocuments(filter),
      JobPost.distinct('companyName', filter).then(arr => arr.filter(n => typeof n === 'string' && n.trim().length > 0).length)
    ]);

    res.json({
      jobs,
      uniqueCompaniesCount,
      pagination: { page: parseInt(page), limit: limitVal, total, pages: Math.ceil(total / limitVal) }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Admin update external job
 */
const adminUpdateExternalJob = async (req, res) => {
  try {
    const job = await JobPost.findOneAndUpdate({ _id: req.params.id, isExternal: true }, req.body, { new: true, runValidators: true });
    if (!job) return res.status(404).json({ message: 'Job not found' });
    res.json(job);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Admin delete external job
 */
const adminDeleteExternalJob = async (req, res) => {
  try {
    const job = await JobPost.findOneAndDelete({ _id: req.params.id, isExternal: true });
    if (!job) return res.status(404).json({ message: 'Job not found' });
    res.json({ message: 'External job deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Admin force refresh job from source
 */
const adminRefreshExternalJob = async (req, res) => {
  try {
    const job = await JobPost.findOne({ _id: req.params.id, isExternal: true });
    if (!job) return res.status(404).json({ message: 'Job not found' });
    
    // Set status to active and refresh sync timestamp
    job.lastSyncedAt = new Date();
    job.isActive = true;
    await job.save();

    res.json({ message: 'External job status refreshed', job });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Admin: Export all unique ATS company names to CSV
 */
const adminExportCompaniesCsv = async (req, res) => {
  try {
    // 1. Query all external jobs and fetch ONLY the companyName field
    const jobs = await JobPost.find({ isExternal: true }, 'companyName').lean();

    // 2. Extract and sanitize company names
    const rawNames = jobs
      .map(job => job.companyName)
      .filter(name => typeof name === 'string' && name.trim().length > 0)
      .map(name => name.trim());

    // 3. De-duplicate and sort
    const uniqueNames = [...new Set(rawNames)].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

    // 4. Generate CSV content
    // Use quotes around names to safely handle commas in company names
    const csvRows = ['"Company Name"'];
    uniqueNames.forEach(name => {
      // Escape double quotes inside the name by doubling them ("")
      const escapedName = name.replace(/"/g, '""');
      csvRows.push(`"${escapedName}"`);
    });
    
    const csvContent = csvRows.join('\n');

    // 5. Send file response
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="ats_companies.csv"');
    
    return res.status(200).send(csvContent);
  } catch (error) {
    console.error('Error generating companies CSV:', error);
    res.status(500).json({ success: false, message: 'Server Error processing CSV' });
  }
};

module.exports = {
  searchExternalJobs,
  getExternalJobDetails,
  adminGetExternalJobs,
  adminUpdateExternalJob,
  adminDeleteExternalJob,
  adminRefreshExternalJob,
  adminExportCompaniesCsv
};
