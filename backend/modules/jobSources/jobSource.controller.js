const JobSourceConfig = require('../../models/JobSourceConfig');
const axios = require('axios');

/**
 * Get all job sources (Admin)
 */
const getJobSources = async (req, res) => {
  try {
    const sources = await JobSourceConfig.find().sort({ sourceName: 1 });
    res.json({ sources });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Create a new job source config (Admin)
 */
const createJobSource = async (req, res) => {
  try {
    const payload = req.body || {};
    const existing = await JobSourceConfig.findOne({ sourceName: String(payload.sourceName).toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({ message: 'Job source already configured' });
    }
    const source = await JobSourceConfig.create(payload);
    res.status(201).json(source);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Update job source config (Admin)
 */
const updateJobSource = async (req, res) => {
  try {
    const source = await JobSourceConfig.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!source) return res.status(404).json({ message: 'Job source not found' });
    res.json(source);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Test job source connection (Admin)
 */
const testJobSource = async (req, res) => {
  try {
    const source = await JobSourceConfig.findById(req.params.id);
    if (!source) return res.status(404).json({ message: 'Job source not found' });

    let testSuccess = false;
    let message = '';

    // Dummy test calls for verification
    if (source.isZeroCode) {
      if (source.authType === 'Webhook') {
        testSuccess = true;
        message = 'Webhook source configured. Awaiting incoming pushes.';
      } else if (source.apiBaseUrl) {
        try {
          const config = { timeout: 5000, headers: {} };
          if (source.authType === 'Bearer token' && source.apiCredentialsRef) {
            config.headers['Authorization'] = `Bearer ${process.env[source.apiCredentialsRef] || source.apiCredentialsRef}`;
          } else if (source.authType === 'Custom header' && source.apiCredentialsRef) {
            // Assume format "HeaderName:HeaderValue" or simple API key
            config.headers['x-api-key'] = process.env[source.apiCredentialsRef] || source.apiCredentialsRef;
          }
          await axios.get(source.apiBaseUrl, config);
          testSuccess = true;
          message = 'Successfully connected to custom API gateway';
        } catch (err) {
          if (err.response) {
            testSuccess = true; // Gateway reachable
            message = 'Successfully connected to custom API gateway (Received HTTP response)';
          } else {
            message = `API connection failed: ${err.message}`;
          }
        }
      } else {
        testSuccess = true;
        message = 'Zero-code source saved successfully (No API URL provided to test)';
      }
    } else if (source.sourceName === 'adzuna') {
      const appId = process.env.ADZUNA_APP_ID;
      const appKey = process.env.ADZUNA_APP_KEY;
      if (!appId || !appKey) {
        message = 'Adzuna App ID or App Key not configured in server environment';
      } else {
        try {
          const url = `https://api.adzuna.com/v1/api/jobs/in/search/1?app_id=${appId}&app_key=${appKey}&results_per_page=1&what=test`;
          await axios.get(url, { timeout: 5000 });
          testSuccess = true;
          message = 'Successfully connected to Adzuna API';
        } catch (err) {
          message = `Adzuna API connection failed: ${err.message}`;
        }
      }
    } else if (source.sourceName === 'jooble') {
      const apiKey = process.env.JOOBLE_API_KEY;
      if (!apiKey) {
        message = 'Jooble API Key not configured in server environment';
      } else {
        try {
          const url = `https://api.jooble.org/api/${apiKey}`;
          await axios.post(url, { keywords: 'test' }, { headers: { 'Content-Type': 'application/json' }, timeout: 5000 });
          testSuccess = true;
          message = 'Successfully connected to Jooble API';
        } catch (err) {
          if (err.response) {
            testSuccess = true;
            message = 'Successfully connected to Jooble API gateway';
          } else {
            message = `Jooble API connection failed: ${err.message}`;
          }
        }
      }
    } else if (['greenhouse', 'lever', 'ashby'].includes(source.sourceName)) {
      // ATS testing (can verify if public APIs are reachable)
      try {
        const url = source.sourceName === 'greenhouse' 
          ? 'https://boards-api.greenhouse.io/v1/boards/greenhouse/jobs'
          : source.sourceName === 'lever'
            ? 'https://api.lever.co/v0/postings/lever'
            : 'https://api.ashbyhq.com/details';
        await axios.get(url, { timeout: 5000 });
        testSuccess = true;
        message = `Successfully connected to ${source.sourceName} API gateway`;
      } catch (err) {
        // Ashby might return 401 for unauthorized endpoint, but if a response is returned, the host is reachable
        if (err.response) {
          testSuccess = true;
          message = `Successfully connected to ${source.sourceName} API gateway`;
        } else {
          message = `${source.sourceName} gateway unreachable: ${err.message}`;
        }
      }
    } else {
      // Default fallback test
      testSuccess = true;
      message = `${source.sourceName} does not require special API testing; marked reachable`;
    }

    source.status = testSuccess ? 'active' : 'failed';
    if (!testSuccess) {
      source.lastError = message;
      source.failureCount += 1;
    } else {
      source.lastError = '';
      source.failureCount = 0;
    }
    await source.save();

    res.json({ success: testSuccess, message, source });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Trigger immediate sync (Admin)
 */
const syncJobSource = async (req, res) => {
  try {
    const source = await JobSourceConfig.findById(req.params.id);
    if (!source) return res.status(404).json({ message: 'Job source not found' });

    // Sync trigger (in background)
    const { enqueueOrRun } = require('../queue/queue.factory');
    const result = await enqueueOrRun({
      queueName: 'externalJobSyncQueue',
      jobName: 'sync_source',
      payload: { sourceName: source.sourceName }
    });

    res.json({ message: 'Sync request queued successfully', queueInfo: result });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Pause job source (Admin)
 */
const pauseJobSource = async (req, res) => {
  try {
    const source = await JobSourceConfig.findById(req.params.id);
    if (!source) return res.status(404).json({ message: 'Job source not found' });

    source.isActive = false;
    source.status = 'paused';
    await source.save();

    res.json({ message: 'Job source paused successfully', source });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Resume job source (Admin)
 */
const resumeJobSource = async (req, res) => {
  try {
    const source = await JobSourceConfig.findById(req.params.id);
    if (!source) return res.status(404).json({ message: 'Job source not found' });

    source.isActive = true;
    source.status = 'active';
    await source.save();

    res.json({ message: 'Job source resumed successfully', source });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getJobSources,
  createJobSource,
  updateJobSource,
  testJobSource,
  syncJobSource,
  pauseJobSource,
  resumeJobSource
};
