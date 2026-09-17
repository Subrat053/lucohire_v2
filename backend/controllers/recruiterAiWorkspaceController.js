const WorkspaceChat = require('../models/WorkspaceChat');
const OpenAI = require('openai');

const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');
  return new OpenAI({ apiKey });
};

const recruiterAiWorkspaceController = {
  getConversations: async (req, res) => {
    try {
      const chats = await WorkspaceChat.find({ recruiterId: req.user._id })
        .select('title updatedAt messages') // get messages to compute preview if needed
        .sort({ updatedAt: -1 })
        .limit(20);
        
      const formattedChats = chats.map(chat => ({
        _id: chat._id,
        title: chat.title,
        desc: chat.messages.filter(m => m.role === 'user')[0]?.content || 'Empty conversation',
        time: chat.updatedAt,
      }));

      res.json({ success: true, data: formattedChats });
    } catch (error) {
      console.error('[AiWorkspace] Error fetching conversations:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch conversations' });
    }
  },

  getConversation: async (req, res) => {
    try {
      const chat = await WorkspaceChat.findOne({ _id: req.params.id, recruiterId: req.user._id });
      if (!chat) return res.status(404).json({ success: false, message: 'Conversation not found' });
      res.json({ success: true, data: chat });
    } catch (error) {
      console.error('[AiWorkspace] Error fetching conversation:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch conversation' });
    }
  },

  chat: async (req, res) => {
    try {
      const { message, conversationId, toolAction } = req.body;
      if (!message && !toolAction) return res.status(400).json({ success: false, message: 'Message or action is required' });

      let chat;
      if (conversationId) {
        chat = await WorkspaceChat.findOne({ _id: conversationId, recruiterId: req.user._id });
        if (!chat) return res.status(404).json({ success: false, message: 'Conversation not found' });
      } else {
        chat = new WorkspaceChat({
          recruiterId: req.user._id,
          title: message ? message.substring(0, 40) + (message.length > 40 ? '...' : '') : toolAction,
          messages: []
        });
      }

      // Add user message
      const prompt = message || `Execute action: ${toolAction}`;
      chat.messages.push({ role: 'user', content: prompt });
      
      const openai = getOpenAIClient();
      
      // Build OpenAI history
      const systemPrompt = `You are Luco AI, the official and highly advanced AI assistant built directly into the Lucohire platform. 
You are here to help Recruiters maximize their efficiency on Lucohire. Lucohire is a modern, all-in-one Applicant Tracking System (ATS) and recruitment platform.

As an expert assistant, you are fully aware of all the extensive features available on Lucohire. When a user asks a question, always assume they are using Lucohire and guide them on how to leverage the platform's native tools.

Here is an exhaustive list of Lucohire's features you must know and recommend when appropriate:
1. AI Recruiter Workspace (Where you live): Provides instant chat assistance, JD generators, email generators, interview questions generator, Boolean search string builders, resume analysis, skills extraction, and competitor/market insights.
2. Dashboard: Centralized hub showing KPI tracking, active jobs, upcoming tasks, recent notifications, and dynamic AI insights about hiring trends and job performance health.
3. Job Management: Create/Post Jobs, manage Job Postings, track Job Details (applicants, interviews, health score), handle Pending Approvals, and manage closed/draft jobs.
4. Candidate Sourcing & Pipeline: 
   - Applications tracking and Kanban-style pipeline management.
   - Smart AI-powered Candidate Matching and Top Matches highlighting.
   - Talent Pool & Saved Candidates for long-term nurturing.
   - Shortlisted Candidates for active pipeline.
   - External Match and Recruiter Discovery to find candidates outside the direct applicants.
5. Candidate Details & Interview Kits: Deep profiles for each candidate, structured Interview Kits with generated scorecards and role-specific questions.
6. Outreach & CRM: Automated and manual Outreach campaigns, email sequence management, and tracking candidate responses.
7. Task Management: Built-in daily to-do lists, task assignment, priority tagging, and reminders tied directly to jobs or candidates.
8. Comprehensive Reports & Analytics:
   - Reports Overview & Custom Reports
   - Hiring Funnel analysis (drop-off rates, time-to-hire)
   - Job Performance metrics (cost-per-hire, applications-per-job)
   - Source Analytics (where the best candidates come from)
   - Outreach Analytics (email open rates, reply rates)
   - AI Insights reports on market trends.
9. Settings & Billing: Profile management, team Settings, Subscription Plans, and Billing/Transactions history.

Your primary role is to act as an expert assistant for the Lucohire platform. Provide clear, professional, highly detailed, and actionable answers. 
Always maintain a helpful, encouraging, and professional tone. Use markdown to structure your responses beautifully (e.g., using bolding, lists, tables, and headings where appropriate). If they ask how to do something, explain the steps using Lucohire's features.`;

      const aiMessages = [
        { role: 'system', content: systemPrompt },
        ...chat.messages.map(m => ({ role: m.role, content: m.content }))
      ];

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: aiMessages,
        temperature: 0.7,
      });

      const aiContent = response.choices[0].message.content;
      
      // Add assistant response
      chat.messages.push({ role: 'assistant', content: aiContent });
      await chat.save();

      res.json({ 
        success: true, 
        data: {
          conversationId: chat._id,
          message: aiContent
        }
      });
    } catch (error) {
      console.error('[AiWorkspace] Chat error:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to process AI request' });
    }
  }
};

module.exports = recruiterAiWorkspaceController;
