const { outreachQueue } = require('../queues/outreach.queue');
const ProviderProfile = require('../models/ProviderProfile');
const User = require('../models/User');

exports.dispatchCampaign = async (req, res) => {
  try {
    const { audience, channel, subject, template, csvData } = req.body;

    if (!audience || !channel || !template) {
      return res.status(400).json({ success: false, message: 'Missing required fields: audience, channel, template' });
    }

    if (!outreachQueue) {
      return res.status(503).json({ success: false, message: 'Redis/Queue is disabled. Please configure REDIS_URL in .env' });
    }

    let targetUsers = [];

    // Check if CSV data is provided
    if (csvData && Array.isArray(csvData) && csvData.length > 0) {
      targetUsers = csvData;
    } else {
      // Fallback to old behavior if no CSV
      if (audience === 'Candidate') {
        targetUsers = await ProviderProfile.find({}).limit(50).lean();
      } else if (audience === 'Company') {
        targetUsers = await User.find({ role: 'user' }).limit(50).lean();
      } else {
        // Mock audience if none selected or unknown
        targetUsers = [
          { _id: '1', name: 'Alice Smith', email: 'alice@example.com', phone: '1234567890' },
          { _id: '2', name: 'Bob Jones', email: 'bob@example.com', phone: '0987654321' }
        ];
      }
    }

    if (targetUsers.length === 0) {
      return res.status(400).json({ success: false, message: 'No users found for selected audience.' });
    }

    // ─── THE THROTTLING ENGINE ───
    // We add a progressively larger delay to each job to perfectly simulate
    // human sending spacing (between 30s and 120s per message)
    
    let currentDelay = 0;
    const MIN_DELAY_MS = 30000;  // 30 seconds
    const MAX_DELAY_MS = 120000; // 120 seconds

    for (const user of targetUsers) {
      // Calculate random gap for this specific message
      const randomGap = Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS + 1)) + MIN_DELAY_MS;
      
      // First message goes out instantly, subsequent messages are delayed
      const jobDelay = currentDelay;
      
      await outreachQueue.add('send-message', {
        user,
        template,
        channel,
        subject
      }, {
        delay: jobDelay
      });

      // Increment the delay for the next iteration
      currentDelay += randomGap;
    }

    res.status(200).json({
      success: true,
      message: `Successfully enqueued ${targetUsers.length} messages.`,
      estimatedCompletionTimeMinutes: Math.round(currentDelay / 1000 / 60)
    });

  } catch (error) {
    console.error('[Outreach Controller Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getQueueStatus = async (req, res) => {
  try {
    if (!outreachQueue) {
      return res.status(200).json({
        success: true,
        status: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
        message: 'Queue disabled'
      });
    }

    const waiting = await outreachQueue.getWaitingCount();
    const active = await outreachQueue.getActiveCount();
    const completed = await outreachQueue.getCompletedCount();
    const failed = await outreachQueue.getFailedCount();
    const delayed = await outreachQueue.getDelayedCount();

    res.status(200).json({
      success: true,
      status: {
        waiting,
        active,
        completed,
        failed,
        delayed
      }
    });
  } catch (error) {
    console.error('[Outreach Status Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.pauseQueue = async (req, res) => {
  try {
    if (!outreachQueue) return res.status(503).json({ success: false, message: 'Queue disabled' });
    await outreachQueue.pause();
    res.status(200).json({ success: true, message: 'Queue paused successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.resumeQueue = async (req, res) => {
  try {
    if (!outreachQueue) return res.status(503).json({ success: false, message: 'Queue disabled' });
    await outreachQueue.resume();
    res.status(200).json({ success: true, message: 'Queue resumed successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.stopQueue = async (req, res) => {
  try {
    if (!outreachQueue) return res.status(503).json({ success: false, message: 'Queue disabled' });
    // This removes all jobs that are waiting or delayed
    await outreachQueue.obliterate({ force: true });
    res.status(200).json({ success: true, message: 'Queue stopped and cleared successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getActiveJobs = async (req, res) => {
  try {
    if (!outreachQueue) return res.status(503).json({ success: false, message: 'Queue disabled' });
    const isPaused = await outreachQueue.isPaused();
    
    // Get currently processing jobs
    const activeJobs = await outreachQueue.getJobs(['active']);
    // Get recently completed (last 10)
    const completedJobs = await outreachQueue.getJobs(['completed'], 0, 9, true);
    // Get recent failed (last 10)
    const failedJobs = await outreachQueue.getJobs(['failed'], 0, 9, true);
    
    const formatJob = (job) => ({
      id: job.id,
      name: job.name,
      target: job.data?.user?.email || job.data?.user?.phone || job.data?.contactDetails || 'Unknown',
      targetName: job.data?.user?.name || job.data?.name || 'Unknown',
      channel: job.data?.channel || (job.data?.isEmail ? 'Email' : 'WhatsApp'),
      timestamp: job.timestamp,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason,
    });

    res.status(200).json({
      success: true,
      isPaused,
      active: activeJobs.map(formatJob),
      completed: completedJobs.map(formatJob),
      failed: failedJobs.map(formatJob)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
