const prisma = require('../config/prisma');
const { mapJobs } = require('../services/jobPersistenceService');

const countApplications = (jobIds, status) => prisma.application.count({
  where: {
    jobPost: { in: jobIds.map(String) },
    ...(Array.isArray(status) ? { status: { in: status } } : status ? { status } : {}),
  },
});

const reportsController = {
  getOverviewMetrics: async (req, res) => {
    try {
      const recruiterId = req.user._id;

      // 1. Get all jobs posted by this recruiter
      const jobs = mapJobs(await prisma.jobPost.findMany({ where: { recruiter: String(recruiterId) } }));
      const jobIds = jobs.map(job => job._id);

      // 2. Base Metrics
      const totalJobs = jobs.length;
      
      const totalApplications = await countApplications(jobIds);
      const interviews = await countApplications(jobIds, ['contacted', 'shortlisted']);
      const offers = await countApplications(jobIds, 'shortlisted');
      const hires = await countApplications(jobIds, 'hired');

      // AI Hiring Score Average
      const aiEvals = await prisma.aiEvaluation.findMany({
        where: { jobId: { in: jobIds.map(String) } },
      });
      const avgAiScore = aiEvals.length > 0 
        ? Math.round(aiEvals.reduce((acc, curr) => acc + curr.score, 0) / aiEvals.length) 
        : 0;

      const topMetrics = [
        { label: 'Total Jobs',         value: totalJobs.toString(),      trend: '+0%', up: true,  icon: 'FiBriefcase', bg: 'bg-indigo-50', ic: 'text-indigo-600' },
        { label: 'Total Applications', value: totalApplications.toString(), trend: '+0%', up: true,  icon: 'FiMail',      bg: 'bg-blue-50',   ic: 'text-blue-600'   },
        { label: 'Interviews',         value: interviews.toString(),     trend: '+0%', up: true,  icon: 'FiUsers',     bg: 'bg-emerald-50',ic: 'text-emerald-600'},
        { label: 'Offers Extended',    value: offers.toString(),      trend: '+0%', up: true,  icon: 'FiCheckCircle',bg: 'bg-orange-50', ic: 'text-orange-600' },
        { label: 'Hires Made',         value: hires.toString(),      trend: '+0%', up: true,  icon: 'FiBriefcase', bg: 'bg-purple-50', ic: 'text-purple-600' },
        { label: 'Avg. Time to Hire',  value: '14 Days', trend: '0%',  up: true,  icon: 'FiClock',     bg: 'bg-sky-50',    ic: 'text-sky-600'    },
        { label: 'Cost per Hire',      value: '₹0', trend: '0%',  up: true,  icon: 'FiDollarSign',bg: 'bg-teal-50',   ic: 'text-teal-600'   },
        { label: 'AI Hiring Score',    value: `${avgAiScore}/100`,  trend: '+0%', up: true,  icon: 'HiSparkles',  bg: 'bg-violet-50', ic: 'text-violet-600' },
      ];

      // 3. Funnel Stages
      const screened = await countApplications(jobIds, ['reviewed', 'contacted', 'shortlisted', 'hired']);
      const funnelStages = [
        { label: 'Applications', value: totalApplications.toString(), pct: '100', w: 100, color: 'bg-indigo-600' },
        { label: 'Screening',    value: screened.toString(), pct: totalApplications ? Math.round((screened/totalApplications)*100).toString() : '0',  w: 70,  color: 'bg-blue-500'   },
        { label: 'Interviews',   value: interviews.toString(), pct: totalApplications ? Math.round((interviews/totalApplications)*100).toString() : '0',  w: 45,  color: 'bg-emerald-500'},
        { label: 'Offers',       value: offers.toString(), pct: totalApplications ? Math.round((offers/totalApplications)*100).toString() : '0', w: 20,  color: 'bg-orange-500' },
        { label: 'Hires',        value: hires.toString(), pct: totalApplications ? Math.round((hires/totalApplications)*100).toString() : '0',   w: 12,  color: 'bg-emerald-700'},
      ];

      // 4. Source Legend (Mocked for Phase 1, waiting for Source tracking in Phase 3)
      const sourceLegend = [
        { color: 'bg-indigo-500',  label: 'LinkedIn',             val: '0', pct: '0' },
        { color: 'bg-purple-500',  label: 'Lucohire Career Page', val: totalApplications.toString(), pct: totalApplications ? '100' : '0' },
        { color: 'bg-emerald-500', label: 'Employee Referral',    val: '0', pct: '0' },
      ];

      // 5. Job Performance 
      const jobPerf = [];
      for (const job of jobs.slice(0, 3)) {
        const apps = await countApplications([job._id]);
        const jobHires = await countApplications([job._id], 'hired');
        jobPerf.push({
          dot: 'bg-indigo-600',
          label: job.title,
          jobs: 1,
          apps: apps.toString(),
          hires: jobHires,
          ratio: apps > 0 ? (jobHires / apps).toFixed(2) : '0'
        });
      }

      // 6. Interview Legend
      const interviewLegend = [
        { color: 'bg-indigo-500',  label: 'Technical Round', val: interviews.toString(), pct: interviews ? '100' : '0' }
      ];

      // 7. AI Trends
      const uniqueSkills = [...new Set(jobs.map(j => j.skill).filter(Boolean))];
      const aiTrends = [
        { bg: 'bg-indigo-50',  ic: 'text-indigo-600',  icon: 'FiBriefcase', title: 'Top In-Demand Skills',  sub: uniqueSkills.slice(0, 3).join(', ') || 'N/A', to: '/recruiter/reports/ai-insights' },
        { bg: 'bg-purple-50',  ic: 'text-purple-600',  icon: 'HiSparkles',  title: 'Hiring Trend',          sub: `You have ${totalJobs} active jobs.`,      to: '/recruiter/reports/ai-insights' },
      ];

      // 8. Dynamic Trends for Graphs
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentApplications = await prisma.application.findMany({
        where: { jobPost: { in: jobIds.map(String) }, appliedAt: { gte: thirtyDaysAgo } },
        select: { appliedAt: true },
        orderBy: { appliedAt: 'asc' },
      });
      const trendCounts = new Map();
      for (const application of recentApplications) {
        const date = application.appliedAt.toISOString().slice(0, 10);
        trendCounts.set(date, (trendCounts.get(date) || 0) + 1);
      }
      const appTrendData = [...trendCounts.entries()].map(([_id, count]) => ({ _id, count }));
      
      const applicationsTrend = appTrendData.map(d => ({ date: d._id, apps: d.count }));
      if (applicationsTrend.length === 0) {
        applicationsTrend.push({ date: new Date().toISOString().split('T')[0], apps: 0 });
      }

      // Mocked for now since we don't have explicit hire events tracked by date
      const timeToHireTrend = [
        { date: 'Week 1', days: 22 },
        { date: 'Week 2', days: 18 },
        { date: 'Week 3', days: 16 },
        { date: 'Week 4', days: 14 }
      ];

      // 9. Outreach Analytics
      const campaigns = await prisma.outreachCampaign.findMany({
        where: { recruiterId: String(recruiterId) },
      });
      const emailsSent = campaigns.reduce((acc, curr) => acc + (curr.candidatesContacted || 0), 0);

      res.json({
        success: true,
        data: {
          topMetrics,
          funnelStages,
          sourceLegend,
          jobPerf,
          interviewLegend,
          aiTrends,
          applicationsTrend,
          timeToHireTrend,
          outreachData: { emailsSent }
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Failed to fetch overview metrics' });
    }
  },

  getHiringFunnel: async (req, res) => {
    try {
      const recruiterId = req.user._id;
      const jobs = mapJobs(await prisma.jobPost.findMany({ where: { recruiter: String(recruiterId) } }));
      const jobIds = jobs.map(job => job._id);

      const totalApplications = await countApplications(jobIds);
      const screening = await countApplications(jobIds, ['reviewed', 'contacted', 'shortlisted', 'hired']);
      const interviews = await countApplications(jobIds, ['contacted', 'shortlisted', 'hired']);
      const offers = await countApplications(jobIds, ['shortlisted', 'hired']);
      const hires = await countApplications(jobIds, 'hired');

      const stages = [
        { label: 'Applications', value: totalApplications, pct: 100, prev: 0, color: '#6366f1', bg: 'bg-indigo-600' },
        { label: 'Screening',    value: screening, pct: totalApplications ? Math.round((screening/totalApplications)*100) : 0,  prev: 0,  color: '#3b82f6', bg: 'bg-blue-500'   },
        { label: 'Interviews',   value: interviews,  pct: totalApplications ? Math.round((interviews/totalApplications)*100) : 0,  prev: 0,  color: '#10b981', bg: 'bg-emerald-500'},
        { label: 'Offers',       value: offers,   pct: totalApplications ? Math.round((offers/totalApplications)*100) : 0, prev: 0,   color: '#f59e0b', bg: 'bg-orange-500' },
        { label: 'Hires',        value: hires,   pct: totalApplications ? Math.round((hires/totalApplications)*100) : 0,   prev: 0,   color: '#059669', bg: 'bg-emerald-700'},
      ];

      const conversionRates = [
        { from: 'Application → Screening', rate: totalApplications ? ((screening/totalApplications)*100).toFixed(1)+'%' : '0%', change: '+0%', up: true  },
        { from: 'Screening → Interview',   rate: screening ? ((interviews/screening)*100).toFixed(1)+'%' : '0%', change: '+0%', up: true  },
        { from: 'Interview → Offer',       rate: interviews ? ((offers/interviews)*100).toFixed(1)+'%' : '0%', change: '0%', up: true },
        { from: 'Offer → Hire',            rate: offers ? ((hires/offers)*100).toFixed(1)+'%' : '0%', change: '+0%', up: true  },
        { from: 'Application → Hire',      rate: totalApplications ? ((hires/totalApplications)*100).toFixed(1)+'%' : '0%', change: '+0%', up: true  },
      ];

      res.json({
        success: true,
        data: {
          stages,
          weeklyData: [], // Mocked for phase 2
          conversionRates
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Failed to fetch funnel' });
    }
  },

  getJobPerformance: async (req, res) => {
    try {
      const recruiterId = req.user._id;
      const allJobs = mapJobs(await prisma.jobPost.findMany({
        where: { recruiter: String(recruiterId) },
        orderBy: { createdAt: 'desc' },
      }));

      let totalApps = 0;
      let totalHires = 0;
      const jobList = [];

      for (const job of allJobs) {
        const apps = await countApplications([job._id]);
        const hires = await countApplications([job._id], 'hired');
        totalApps += apps;
        totalHires += hires;

        const daysOpen = Math.round((new Date() - new Date(job.createdAt)) / (1000 * 60 * 60 * 24));
        jobList.push({
          type: 'Normal', // Add dynamic types later if we add 'priority' field to JobPost
          dot: 'bg-blue-500',
          label: job.title || 'Untitled',
          dept: job.companyName || 'N/A',
          jobs: 1,
          apps,
          hires,
          ratio: apps > 0 ? (hires / apps).toFixed(2) : '0',
          daysOpen,
          status: job.isActive ? 'Active' : 'Closed'
        });
      }

      const jobTypeStats = [
        { dot: 'bg-blue-500', type: 'Normal Jobs', count: allJobs.length, apps: totalApps.toString(), hires: totalHires, ratio: totalApps > 0 ? (totalHires / totalApps).toFixed(2) : '0', avg_cost: '₹0' },
      ];

      const kpis = [
        { label: 'Total Jobs Posted',  value: allJobs.length.toString(),   sub: '0% vs last month' },
        { label: 'Total Applications', value: totalApps.toString(), sub: '0% vs last month' },
        { label: 'Total Hires',        value: totalHires.toString(),   sub: '0% vs last month' },
        { label: 'Avg. Time to Fill',  value: '0 d', sub: '0 days vs last month' },
      ];

      res.json({
        success: true,
        data: {
          jobs: jobList,
          jobTypeStats,
          kpis
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Failed to fetch job performance' });
    }
  },

  getSourceAnalytics: async (req, res) => {
    try {
      const recruiterId = req.user._id;
      const jobs = mapJobs(await prisma.jobPost.findMany({ where: { recruiter: String(recruiterId) } }));
      const jobIds = jobs.map(job => job._id);

      const totalApplications = await countApplications(jobIds);
      const totalHires = await countApplications(jobIds, 'hired');

      // For Phase 3, we mock external sources and attribute 100% to Lucohire
      const sources = [
        { color: '#a855f7', bg: 'bg-purple-500',  label: 'Lucohire Career Page', total: totalApplications, hires: totalHires,  cost: '₹0', quality: 100, pct: totalApplications ? 100 : 0 },
        { color: '#6366f1', bg: 'bg-indigo-500',  label: 'LinkedIn',             total: 0, hires: 0,  cost: '₹0', quality: 0, pct: 0 },
        { color: '#10b981', bg: 'bg-emerald-500', label: 'Employee Referral',    total: 0, hires: 0,  cost: '₹0', quality: 0, pct: 0 },
      ];

      res.json({
        success: true,
        data: {
          sources,
          monthlyTrend: [], // Mocked
          kpis: [
            { label: 'Total Applications', value: totalApplications.toString(), trend: '+0%', up: true },
            { label: 'Top Source',         value: 'Lucohire', trend: '100% share', up: true },
            { label: 'Best Quality Source',value: 'Lucohire', trend: '100% quality score', up: true },
            { label: 'Lowest Cost/Hire',   value: '₹0',  trend: 'Lucohire Career', up: true },
          ]
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Failed to fetch source analytics' });
    }
  },

  getOutreachAnalytics: async (req, res) => {
    try {
      const recruiterId = req.user._id;
      const campaigns = await prisma.outreachCampaign.findMany({
        where: { recruiterId: String(recruiterId) },
        orderBy: { createdAt: 'desc' },
      });
      
      let totalSent = 0;
      let totalOpens = 0;
      
      const campaignData = campaigns.map(c => {
        totalSent += c.candidatesContacted || 0;
        return {
          name: c.jobTitle || 'Outreach Campaign',
          channel: 'Email', // We only support email currently
          sent: c.candidatesContacted || 0,
          opens: '0%', // Not tracked yet
          replies: '0%',
          hires: 0,
          status: c.status === 'completed' ? 'Completed' : (c.status === 'running' ? 'Active' : 'Failed')
        };
      });

      const channels = [
        { icon: 'FiMail', bg: 'bg-blue-50', ic: 'text-blue-600', name: 'Email', sent: totalSent, open: '0%', reply: '0%', click: '0%', bounce: '0%', upOpen: true, upReply: true },
        { icon: 'FiMessageCircle', bg: 'bg-blue-50', ic: 'text-indigo-600', name: 'LinkedIn', sent: 0, open: '0%', reply: '0%', click: '0%', bounce: '0%', upOpen: true, upReply: false },
        { icon: 'FiSmartphone', bg: 'bg-emerald-50', ic: 'text-emerald-600', name: 'WhatsApp', sent: 0, open: '0%', reply: '0%', click: '0%', bounce: '0%', upOpen: true, upReply: true },
      ];

      res.json({
        success: true,
        data: {
          channels,
          campaignData,
          weeklyStats: [],
          kpis: [
            { label: 'Total Outreach Messages', value: totalSent.toString(), trend: '+0%', up: true  },
            { label: 'Overall Reply Rate',       value: '0%',   trend: '+0%',up: true  },
            { label: 'Hires from Outreach',      value: '0',     trend: '+0 vs last', up: true },
            { label: 'Avg. Response Time',       value: '0 hrs', trend: '0 hrs', up: true },
          ]
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Failed to fetch outreach analytics' });
    }
  },

  getAiInsights: async (req, res) => {
    try {
      // Mocked AI insights for phase 4
      const insightCategories = [
        {
          id: 'skills',
          icon: 'FiBriefcase', bg: 'bg-indigo-50', ic: 'text-indigo-600',
          title: 'Top In-Demand Skills', desc: 'Skills with highest demand vs. supply gap this month',
          items: [
            { skill: 'React.js / Next.js', demand: 92, supply: 48, gap: '+44', trend: 'High' },
            { skill: 'Node.js / Express',  demand: 86, supply: 55, gap: '+31', trend: 'High' },
          ],
        },
        {
          id: 'salary',
          icon: 'FiDollarSign', bg: 'bg-blue-50', ic: 'text-blue-600',
          title: 'Salary Benchmark', desc: 'Market salary ranges by role',
          items: [
            { skill: 'Senior React Developer', demand: null, supply: null, gap: '₹18–28 LPA', trend: '₹22 avg' },
            { skill: 'Product Manager',        demand: null, supply: null, gap: '₹20–35 LPA', trend: '₹26 avg' },
          ],
        },
        {
          id: 'hiring',
          icon: 'FiTrendingUp', bg: 'bg-purple-50', ic: 'text-purple-600',
          title: 'Hiring Trends', desc: 'Month-over-month hiring volume changes by role',
          items: [
            { skill: 'React Developers',      demand: 78, supply: 45, gap: '+24%', trend: '↑ Rising'  },
          ],
        },
        {
          id: 'market',
          icon: 'FiUsers', bg: 'bg-emerald-50', ic: 'text-emerald-600',
          title: 'Market Insights', desc: 'Broad market signals and talent availability',
          items: [
            { skill: 'Full Stack Developers',  demand: 88, supply: 42, gap: 'High demand', trend: '↑ Growing' },
          ],
        }
      ];

      res.json({
        success: true,
        data: {
          insightCategories,
          kpis: [
            { label: 'AI Score',           value: '87/100', sub: '+11% this month',  color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { label: 'Time-to-Hire Saved', value: '3.2 Days', sub: 'AI shortlisting', color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Best Match Rate',    value: '94%',    sub: 'AI vs manual: 71%',color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: 'Insights Generated', value: '42',     sub: 'This month',        color: 'text-blue-600',   bg: 'bg-blue-50'   },
          ]
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Failed to fetch AI insights' });
    }
  },

  getCustomExportsData: async (req, res) => {
    try {
      const savedReports = [
        { name: 'Q2 Hiring Overview',         type: 'PDF',   created: '15 May 2026',  tags: ['Hiring','Q2'],         downloads: 12, sharedWith: 3 },
        { name: 'LinkedIn Source Deep Dive',   type: 'Excel', created: '10 May 2026',  tags: ['Source','LinkedIn'],   downloads: 8,  sharedWith: 2 },
        { name: 'Recruiter KPI Monthly',       type: 'PDF',   created: '1 May 2026',   tags: ['Recruiter','Monthly'], downloads: 6,  sharedWith: 5 },
      ];

      const templates = [
        { icon: '📊', name: 'Monthly Hiring Summary',  desc: 'Hires, time, cost, funnel overview'   },
        { icon: '🎯', name: 'Source ROI Report',        desc: 'Cost per hire by source, quality'     },
        { icon: '📬', name: 'Outreach Performance',     desc: 'Campaign metrics across channels'     },
        { icon: '🤖', name: 'AI Insights Summary',      desc: 'Skills demand, salary, market trends' },
        { icon: '📅', name: 'Weekly Pipeline Report',   desc: 'Candidate pipeline status by week'    },
      ];

      res.json({
        success: true,
        data: {
          savedReports,
          templates
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Failed to fetch custom exports data' });
    }
  }
};

module.exports = reportsController;
