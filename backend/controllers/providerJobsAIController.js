const User = require('../models/User');
const ProviderProfile = require('../models/ProviderProfile');
const ProviderSubscription = require('../models/ProviderSubscription');
const JobPost = require('../models/JobPost');
const OpenAI = require('openai');

const getJobAiInsights = async (req, res) => {
  try {
    const { jobsData } = req.body;
    
    if (!jobsData || !Array.isArray(jobsData)) {
      return res.status(400).json({ success: false, message: 'jobsData array is required' });
    }

    // Fetch provider profile
    const provider = await ProviderProfile.findOne({ user: req.user._id }).lean();
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider profile not found' });
    }

    // Use ProviderSubscription — the model providerPlanController creates on purchase.
    // UserSubscription is a different, unrelated model.
    const sub = await ProviderSubscription.findOne({ 
      providerId: req.user._id, 
      subscriptionStatus: 'active',
      endDate: { $gt: new Date() }
    }).populate('planId');
    const hasActivePlan = sub && (
      sub.paymentStatus === 'paid' ||
      sub.totalAmount > 0 ||
      sub.planSnapshot?.supportsPerformanceInsights === true ||
      (sub.planId && sub.planId.price > 0)
    );

    if (!hasActivePlan) {
      // Mock data for free users (backend fallback)
      const mockResults = jobsData.map(j => ({
        jobId: j._id ? j._id.toString() : j.id,
          insights: {
            missingSkills: ['React Native', 'Node.js', 'Figma'],
            hireBlocker: "Your profile lacks sufficient experience for this role.",
            interviewProbability: 65,
            matchScore: 0,
            actionPlan: ["Update your portfolio with React Native projects.", "Highlight your mobile design experience."],
            resumeKeywords: ["React Native", "Mobile UI", "Cross-platform"],
            interviewPrep: ["How do you handle state management in large applications?", "Can you explain the difference between React and React Native?"],
            _isMock: true
          }
      }));
      return res.status(200).json({ success: true, data: mockResults });
    }

    // Use jobs directly from frontend payload
    const jobs = jobsData;
    
    // Initialize OpenAI
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ success: false, message: 'OpenAI API key missing' });
    }
    const openai = new OpenAI({ apiKey });

    // Build user context
    const userContext = `
      Designation: ${provider.designation || 'Unknown'}
      Roles: ${(provider.roles || []).join(', ')}
      Skills: ${(provider.skills || []).join(', ')}
      Total Experience: ${provider.experience || '0 years'}
      Previous Roles: ${(provider.previousExperience || []).map(p => `${p.role} at ${p.company} (${p.duration})`).join(' | ')}
      Education: ${(provider.education || []).map(e => `${e.degree} from ${e.institution}`).join(' | ')}
      City: ${provider.city || 'Unknown'}
    `;

    const results = [];
    
    for (const job of jobsData) {
      try {
        const jobContext = `
          Title: ${job.title}
          Location: ${job.location || 'Unknown'}
          Skills Required: ${job.skill} ${job.requirements ? job.requirements.join(', ') : ''}
          Experience Required: ${job.experienceRequired}
        `;

        const prompt = `
          You are an expert technical recruiter and career coach evaluating a candidate's fit for a specific job.
          Analyze this candidate's profile against the job requirements.
          Be practical, highly specific to the provided skills, and realistic. Do not use generic fluff.
          
          Candidate:
          ${userContext}
          
          Job:
          ${jobContext}
          
          Provide your evaluation in strictly JSON format (no markdown, no backticks, just the raw JSON object):
          {
            "missing_skills": ["Skill1", "Skill2"], // max 3 highly specific missing skills based strictly on the job requirements, or an empty array if they are a perfect match
            "matched_skills": ["Skill1", "Skill2"], // max 3 skills from the candidate's profile that match the job requirements
            "why_match": ["Point 1"], // Exactly 1 short, on-point bullet explaining exactly why they are a good fit for this role
            "salary_insight": "e.g. ₹8 - 12 LPA", // A realistic estimated salary range for this specific role in the specified location in the current market, formatted as a short string. Do NOT just copy the example, estimate realistically make sure you estimate on the basis of job role, location and experience and give a realistic amount.
            "hire_blocker": "One short sentence providing a practical, realistic reason they might face friction getting hired for this specific role (e.g., 'Lacks required React Native experience'). If none, say 'No major blockers identified.'",
            "interview_probability": 67, // integer 0-100 based strictly on hard skill match and experience overlap
            "match_score": 75, // integer 0-100 reflecting overall alignment
            "action_plan": ["Step 1", "Step 2"], // 2-3 specific, actionable steps the candidate can take to increase their chances of getting this job
            "resume_keywords": ["Keyword1", "Keyword2"], // 3-5 important keywords from the job description that the candidate should emphasize in their resume
            "interview_prep": ["Question 1", "Question 2"], // 2 common interview questions for this specific role and experience level
            "most_demanded_skill": "string (Based on this specific job title, what is the single most demanded skill in the current market? e.g. for Python Developer it could be Django or FastAPI)"
          }
        `;

        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
          response_format: { type: "json_object" }
        });

        const insights = JSON.parse(response.choices[0].message.content);
        
        results.push({
          jobId: job._id.toString(),
          insights: {
            missingSkills: insights.missing_skills || [],
            matchedSkills: insights.matched_skills || [],
            whyMatch: insights.why_match || [],
            salaryInsight: insights.salary_insight || "",
            hireBlocker: insights.hire_blocker || 'No major blockers identified.',
            interviewProbability: insights.interview_probability || 50,
            matchScore: insights.match_score || 50,
            actionPlan: insights.action_plan || [],
            resumeKeywords: insights.resume_keywords || [],
            interviewPrep: insights.interview_prep || [],
            most_demanded_skill: insights.most_demanded_skill || ""
          }
        });
      } catch (error) {
        console.error('AI Insight failed for job:', job._id, error);
        results.push({
          jobId: job._id.toString(),
          insights: {
            missingSkills: [],
            hireBlocker: 'Could not generate insights at this time.',
            interviewProbability: 0,
            matchScore: 0
          }
        });
      }
    }

    return res.status(200).json({
      success: true,
      data: results
    });

  } catch (error) {
    console.error('getJobAiInsights error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = {
  getJobAiInsights
};
