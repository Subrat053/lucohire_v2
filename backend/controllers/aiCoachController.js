const User = require('../models/User');
const ProviderProfile = require('../models/ProviderProfile');
const { callOpenAI } = require('../services/ai/llmService');

const getFallbackData = (role, skills) => ({
  progressStats: { percentage: 65, tasksCompleted: 8, interviewsPracticed: 3, skillsImproved: 5, streakDays: 7 },
  todaysTasks: [
    { id: 1, title: 'Update your resume', description: 'Add your latest project and skills', type: 'resume', status: 'pending' },
    { id: 2, title: 'Apply to 3 jobs', description: 'Find roles matching your profile', type: 'job', status: 'pending' },
    { id: 3, title: 'Sharpen a skill', description: 'Spend 30 min on a key skill', type: 'skill', status: 'pending' },
  ],
  upcomingSessions: [
    { id: 1, title: 'Resume Review Session', date: 'Tomorrow • 11:00 AM' },
    { id: 2, title: 'Career Strategy Check-in', date: 'Friday • 3:00 PM' },
  ],
  careerRoadmap: [
    { title: role || 'Service Provider', status: 'Current' },
    { title: 'Senior ' + (role || 'Provider'), status: 'Next Step', timeframe: '1-2 Years' },
    { title: 'Team Lead / Manager', status: 'Future', timeframe: '3-5 Years' },
  ],
  dailyTip: `Focus on showcasing your ${(skills || []).slice(0, 2).join(' and ') || 'top skills'} — recruiters spend less than 10 seconds on an initial scan.`,
  currentGoal: {
    role: 'Senior ' + (role || 'Provider'),
    time: '1.5 Years',
    currentMilestone: 'Build 2 more portfolio projects and earn a certification',
    completion: 40,
  },
  recommended: [
    { title: 'Boost Profile Visibility', description: 'Complete all profile sections to get 5x more views.', type: 'Focus Areas', actionText: 'Learn How' },
    { title: 'Skill Gap Analysis', description: `Find missing skills for ${role || 'your target role'}.`, type: 'Skill Building', actionText: 'Analyze Now' },
    { title: 'Smart Job Matching', description: 'AI finds best-fit jobs from thousands of listings.', type: 'Job Search', actionText: 'Find Jobs' },
    { title: 'Interview Prep Guide', description: 'Practice the most common questions with AI feedback.', type: 'Career Growth', actionText: 'Start Prep' },
  ],
  milestones: [
    { title: 'Profile Completed', done: true, date: '2 weeks ago' },
    { title: 'First Job Application', done: true, date: '1 week ago' },
    { title: 'Resume Optimized', done: false, date: 'In progress' },
    { title: 'First Interview', done: false, date: 'Upcoming' },
    { title: 'Job Offer Received', done: false, date: 'Goal' },
  ],
  aiInsights: [
    { type: 'strength', message: `Your background as a ${role} is solid.` },
    { type: 'improvement', message: `Consider expanding your ${skills[0] || 'skills'} to stand out.` },
    { type: 'opportunity', message: 'You have a great profile completion score.' }
  ]
});

async function saveDashboardToProfile(profile, dashboardData) {
  if (!profile.customConfig) profile.customConfig = {};
  profile.customConfig.aiCoachDashboard = {
    ...dashboardData,
    generatedAt: Date.now()
  };
  profile.markModified('customConfig');
  await profile.save();
}

const getDashboardData = async (req, res) => {
  try {
    const profile = await ProviderProfile.findOne({ user: req.user.id });
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });

    // Check Cache
    const cached = profile.customConfig?.aiCoachDashboard;
    if (cached && cached.generatedAt) {
      const isToday = new Date(cached.generatedAt).toDateString() === new Date().toDateString();
      if (isToday) {
        return res.status(200).json({ 
          success: true, 
          data: {
            ...cached,
            skillsCount: profile.skills?.length || 0
          } 
        });
      }
    }

    const skills = profile.skills || [];
    const experience = profile.experience || 'Not specified';
    const role = profile.role || 'Service Provider';

    let aiResponse = null;
    try {
      const prompt = `You are an expert AI Career Coach. Generate a personalized dashboard for:
Role: ${role}, Skills: ${skills.join(', ') || 'Various'}, Experience: ${experience}

Return JSON EXACTLY matching this schema (all fields required, real values not placeholder strings):
{"progressStats":{"percentage":72,"tasksCompleted":8,"interviewsPracticed":3,"skillsImproved":5,"streakDays":7},"todaysTasks":[{"id":1,"title":"Specific task title","description":"Specific description","type":"resume","status":"pending"},{"id":2,"title":"Another task","description":"Description","type":"job","status":"pending"},{"id":3,"title":"Third task","description":"Description","type":"skill","status":"pending"}],"upcomingSessions":[{"id":1,"title":"Session name","date":"Tomorrow • 11:00 AM"},{"id":2,"title":"Another session","date":"Friday • 3:00 PM"}],"careerRoadmap":[{"title":"Current role title","status":"Current"},{"title":"Next role title","status":"Next Step","timeframe":"1-2 Years"},{"title":"Future role title","status":"Future","timeframe":"3-5 Years"}],"dailyTip":"Specific actionable tip for this person based on their skills and role.","currentGoal":{"role":"Target role name","time":"2 Years","currentMilestone":"Specific next action to take","completion":35},"recommended":[{"title":"Recommendation title","description":"Specific description","type":"Focus Areas","actionText":"Learn How"},{"title":"Title 2","description":"Description 2","type":"Skill Building","actionText":"Analyze Now"},{"title":"Title 3","description":"Description 3","type":"Job Search","actionText":"Find Jobs"},{"title":"Title 4","description":"Description 4","type":"Career Growth","actionText":"Start Prep"}],"milestones":[{"title":"Milestone 1","done":true,"date":"2 weeks ago"},{"title":"Milestone 2","done":true,"date":"1 week ago"},{"title":"Milestone 3","done":false,"date":"In progress"},{"title":"Milestone 4","done":false,"date":"Upcoming"},{"title":"Milestone 5","done":false,"date":"Goal"}],"aiInsights":[{"type":"strength","message":"Specific strength analysis"},{"type":"improvement","message":"Specific area for improvement"},{"type":"opportunity","message":"Specific opportunity"}]}`;

      const aiResult = await callOpenAI(prompt);
      aiResponse = aiResult?.output || null;
    } catch (aiErr) {
      console.warn('[aiCoach] AI call failed, using fallback:', aiErr.message);
    }

    const data = (aiResponse && aiResponse.progressStats) ? aiResponse : getFallbackData(role, skills);
    const finalData = { ...data, generatedAt: Date.now() };
    await saveDashboardToProfile(profile, finalData);

    return res.status(200).json({ 
      success: true, 
      data: {
        ...finalData,
        skillsCount: profile.skills?.length || 0
      }
    });
  } catch (error) {
    console.error('Error in getDashboardData:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate AI Coach data', error: error.message });
  }
};

const handleChat = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'Message is required' });

    const profile = await ProviderProfile.findOne({ user: req.user.id });
    const { skills = [], role = 'professional' } = profile || {};

    let responseText = `As a ${role}, I recommend focusing on ${skills.slice(0, 2).join(' and ') || 'your key skills'}. Could you tell me more about your specific situation?`;

    try {
      const prompt = `You are a supportive AI Career Coach for a ${role} skilled in ${skills.join(', ') || 'various areas'}.
User: "${message}"
Give a helpful, concise, actionable response (2-4 sentences max). Use **bold** for key points.
Return JSON: {"response":"your answer"}`;

      const aiResult = await callOpenAI(prompt);
      const parsed = aiResult?.output;
      if (parsed?.response) responseText = parsed.response;
    } catch (aiErr) {
      console.warn('[aiCoach] Chat AI failed:', aiErr.message);
    }

    return res.status(200).json({ success: true, data: { message: responseText } });
  } catch (error) {
    console.error('Error in handleChat:', error);
    return res.status(500).json({ success: false, message: 'Failed to process chat', error: error.message });
  }
};

const updateGoal = async (req, res) => {
  try {
    const { role: newRole, timeline } = req.body;
    if (!newRole || !timeline) return res.status(400).json({ success: false, message: 'Role and timeline are required' });

    const profile = await ProviderProfile.findOne({ user: req.user.id });
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });
    
    const { skills = [], role: currentRole = 'Service Provider' } = profile;

    let aiResponse = null;
    try {
      const prompt = `You are an AI Career Coach. User is a ${currentRole} with skills: ${skills.join(', ')}.
They want to become a "${newRole}" within "${timeline}".
Generate an updated career plan. Return JSON:
{"careerRoadmap":[{"title":"${currentRole}","status":"Current"},{"title":"${newRole}","status":"Next Step","timeframe":"${timeline}"},{"title":"Senior ${newRole}","status":"Future","timeframe":"5+ Years"}],"currentGoal":{"role":"${newRole}","time":"${timeline}","currentMilestone":"Specific next step to achieve this goal","completion":10},"recommended":[{"title":"Title","description":"Description specific to becoming ${newRole}","type":"Focus Areas","actionText":"Learn How"},{"title":"Title 2","description":"Desc","type":"Skill Building","actionText":"Start Now"}]}`;

      const aiResult = await callOpenAI(prompt);
      aiResponse = aiResult?.output || null;
    } catch (aiErr) {
      console.warn('[aiCoach] Goal AI failed:', aiErr.message);
    }

    if (aiResponse && profile.customConfig?.aiCoachDashboard) {
      profile.customConfig.aiCoachDashboard = {
        ...profile.customConfig.aiCoachDashboard,
        careerRoadmap: aiResponse.careerRoadmap,
        currentGoal: aiResponse.currentGoal,
        recommended: aiResponse.recommended,
      };
      profile.markModified('customConfig');
      await profile.save();
    }

    return res.status(200).json({ success: true, data: profile.customConfig?.aiCoachDashboard || aiResponse });
  } catch (error) {
    console.error('Error in updateGoal:', error);
    return res.status(500).json({ success: false, message: 'Failed to update goal', error: error.message });
  }
};

const refreshTasks = async (req, res) => {
  try {
    const profile = await ProviderProfile.findOne({ user: req.user.id });
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });

    const { skills = [], role = 'Service Provider' } = profile;

    let tasks = null;
    try {
      const prompt = `You are an AI Career Coach. Generate 3 fresh daily career tasks for a ${role} with skills: ${skills.join(', ')}.
All tasks should be NEW and different from yesterday's. Return JSON:
{"todaysTasks":[{"id":1,"title":"Specific task","description":"What to do","type":"resume","status":"pending"},{"id":2,"title":"Another task","description":"Description","type":"job","status":"pending"},{"id":3,"title":"Third task","description":"Description","type":"skill","status":"pending"}]}`;

      const aiResult = await callOpenAI(prompt);
      const parsed = aiResult?.output;
      tasks = parsed?.todaysTasks;
    } catch (aiErr) {
      console.warn('[aiCoach] Task refresh AI failed:', aiErr.message);
    }

    const fallbackTasks = [
      { id: 1, title: 'Connect with 2 professionals', description: 'Expand your network on LinkedIn', type: 'job', status: 'pending' },
      { id: 2, title: 'Update profile headline', description: 'Make your first impression count', type: 'resume', status: 'pending' },
      { id: 3, title: 'Learn one new concept', description: 'Spend 20 min on a skill tutorial', type: 'skill', status: 'pending' },
    ];

    const finalTasks = tasks || fallbackTasks;

    if (profile.customConfig?.aiCoachDashboard) {
      profile.customConfig.aiCoachDashboard.todaysTasks = finalTasks;
      profile.markModified('customConfig');
      await profile.save();
    }

    return res.status(200).json({ success: true, data: { todaysTasks: finalTasks } });
  } catch (error) {
    console.error('Error in refreshTasks:', error);
    return res.status(500).json({ success: false, message: 'Failed to refresh tasks', error: error.message });
  }
};

const toggleTask = async (req, res) => {
  try {
    const { taskIndex } = req.body;
    const profile = await ProviderProfile.findOne({ user: req.user.id });
    
    if (profile && profile.customConfig?.aiCoachDashboard?.todaysTasks) {
      const tasks = profile.customConfig.aiCoachDashboard.todaysTasks;
      if (tasks[taskIndex]) {
        tasks[taskIndex].status = tasks[taskIndex].status === 'completed' ? 'pending' : 'completed';
        
        // Update stats
        if (tasks[taskIndex].status === 'completed') {
          profile.customConfig.aiCoachDashboard.progressStats.tasksCompleted = (profile.customConfig.aiCoachDashboard.progressStats.tasksCompleted || 0) + 1;
        }

        profile.markModified('customConfig');
        await profile.save();
        return res.status(200).json({ success: true, data: profile.customConfig.aiCoachDashboard });
      }
    }
    return res.status(404).json({ success: false, message: 'Task not found' });
  } catch (error) {
    console.error('Error in toggleTask:', error);
    return res.status(500).json({ success: false, message: 'Failed to toggle task' });
  }
};

const tipFeedback = async (req, res) => {
  const { helpful } = req.body;
  console.log(`[aiCoach] Tip feedback: ${helpful ? 'helpful' : 'not helpful'} from user ${req.user.id}`);
  return res.status(200).json({ success: true });
};

module.exports = { getDashboardData, handleChat, updateGoal, refreshTasks, toggleTask, tipFeedback };
