import useTranslation from "../../hooks/useTranslation";
import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  FiSearch,
  FiFileText,
  FiUsers,
  FiMail,
  FiHelpCircle,
  FiCode,
  FiZap,
  FiDollarSign,
  FiTrendingUp,
  FiBarChart2,
  FiMessageSquare,
  FiClock,
  FiArrowRight,
  FiPlus,
  FiChevronRight,
  FiSend,
  FiLoader,
  FiUser,
  FiArrowLeft,
  FiCalendar,
  FiTarget,
  FiArrowUpRight,
  FiMessageCircle,
} from "react-icons/fi";
import { HiSparkles } from "react-icons/hi";
import { FaRobot } from "react-icons/fa";
import { recruiterAPI } from "../../services/api";
import toast from "react-hot-toast";
import ReactMarkdown from "react-markdown";

const SCard = ({ children, className = "", ...props }) => (
  <div
    className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${className}`}
    {...props}
  >
    {children}
  </div>
);

export default function AIRecruiterWorkspace() {
  const { t } = useTranslation();

  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const messagesEndRef = useRef(null);

  const [jobs, setJobs] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [aiInsights, setAiInsights] = useState([]);
  const [aiInsightsLoading, setAiInsightsLoading] = useState(true);
  
  const [aiUsage, setAiUsage] = useState({ limits: {}, usage: {} });
  const [usageLoading, setUsageLoading] = useState(true);

  const isLimitReached = !usageLoading && aiUsage?.limits?.aiCopilot !== undefined && aiUsage?.limits?.aiCopilot !== -1 && (aiUsage?.usage?.aiCopilot || 0) >= (aiUsage?.limits?.aiCopilot || 0);

  useEffect(() => {
    fetchConversations();
    fetchData();
    fetchUsage();
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      setTimeout(() => {
        const parent = messagesEndRef.current?.parentElement;
        if (parent) {
          parent.scrollTo({ top: parent.scrollHeight, behavior: "smooth" });
        }
      }, 100);
    }
  }, [messages, loading]);

  const fetchUsage = async () => {
    try {
      const res = await recruiterAPI.getAiUsage();
      if (res.data?.success) {
        setAiUsage(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUsageLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      const [jobsRes, tasksRes] = await Promise.all([
        recruiterAPI.getJobPostings().catch(() => ({ data: { jobs: [] } })),
        recruiterAPI.getTasks().catch(() => ({ data: [] })),
      ]);
      setJobs(jobsRes.data?.jobs || []);
      setTasks(tasksRes.data || []);

      // Fetch dynamic insights
      recruiterAPI
        .getDashboardInsights()
        .then((res) => {
          try {
            if (
              res.data &&
              res.data.success &&
              Array.isArray(res.data.insights) &&
              res.data.insights.length > 0
            ) {
              setAiInsights(
                res.data.insights.map((item, i) => ({
                  ...item,
                  icon: i === 0 ? FiTrendingUp : i === 1 ? FiClock : FiCode,
                })),
              );
            }
          } catch (e) {
            console.error("Failed to parse AI insights. Error:", e);
          }
        })
        .catch((err) => {
          console.error("Failed to fetch AI insights API error:", err);
        })
        .finally(() => {
          setAiInsightsLoading(false);
        });
    } catch (err) {
      console.error(err);
    }
  };

  const fetchConversations = async () => {
    try {
      const res = await recruiterAPI.getWorkspaceConversations();
      if (res.data.success) {
        setConversations(res.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    }
  };

  const loadConversation = async (id) => {
    try {
      setLoading(true);
      const res = await recruiterAPI.getWorkspaceConversation(id);
      if (res.data.success) {
        setMessages(res.data.data.messages);
        setActiveConversationId(res.data.data._id);
        setIsChatting(true);
      }
    } catch (error) {
      toast.error("Failed to load conversation");
    } finally {
      setLoading(false);
    }
  };

  const startNewChat = () => {
    setIsChatting(false);
    setMessages([]);
    setActiveConversationId(null);
    setChatInput("");
  };

  const handleSend = async (overridePrompt = null) => {
    if (isLimitReached) {
      toast.error(t("recruiter.aiCopilotLimitReached", "AI Copilot limit reached. Please upgrade your plan to continue chatting."));
      return;
    }
    const text = overridePrompt || chatInput;
    if (!text.trim()) return;

    if (!isChatting) setIsChatting(true);
    setChatInput("");

    const newMsgs = [...messages, { role: "user", content: text }];
    setMessages(newMsgs);
    setLoading(true);

    try {
      const res = await recruiterAPI.workspaceChat({
        message: text,
        conversationId: activeConversationId,
      });

      if (res.data.success) {
        setMessages([
          ...newMsgs,
          { role: "assistant", content: res.data.data.message },
        ]);
        if (res.data.data.conversationId) {
          setActiveConversationId(res.data.data.conversationId);
          fetchConversations();
        }
        // Optimistically update the UI to avoid backend db race condition
        setAiUsage(prev => {
          if (!prev || !prev.usage) return prev;
          return {
            ...prev,
            usage: {
              ...prev.usage,
              aiCopilot: (prev.usage.aiCopilot || 0) + 1
            }
          };
        });
      } else {
        toast.error(res.data.message || "Failed to send message");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "AI request failed");
      setMessages(newMsgs); // revert or keep as is
      await fetchUsage(); // Sync UI in case of limit issues
    } finally {
      setLoading(false);
    }
  };

  const handleActionClick = (actionLabel) => {
    handleSend(`I need help with: ${actionLabel}`);
  };

  const quickActions = [
    { icon: <HiSparkles />, label: "Find candidates" },
    { icon: <FiFileText />, label: "Write a JD" },
    { icon: <FiMail />, label: "Generate email" },
    { icon: <FiSearch />, label: "Boolean search" },
    { icon: <FiTrendingUp />, label: "Market insights" },
    { icon: <FiMessageSquare />, label: "Interview questions" },
  ];

  const actionCards = [
    {
      icon: <FiSearch />,
      icBg: "bg-emerald-50",
      icColor: "text-emerald-600",
      title: "AI Talent Search",
      desc: "Find the best candidates using natural language or advanced filters.",
      tag: "Popular",
      tagBg: "bg-emerald-50 text-emerald-700",
      link: "Search Candidates",
    },
    {
      icon: <FiFileText />,
      icBg: "bg-purple-50",
      icColor: "text-purple-600",
      title: "JD Generator",
      desc: "Create a detailed, role-specific job description in seconds.",
      tag: "Essential",
      tagBg: "bg-purple-50 text-purple-700",
      link: "Generate JD",
    },
    {
      icon: <FiUsers />,
      icBg: "bg-emerald-50",
      icColor: "text-emerald-600",
      title: "Candidate Recommendations",
      desc: "Get AI recommended candidates for your open jobs.",
      tag: "Recommended",
      tagBg: "bg-emerald-50 text-emerald-700",
      link: "Get Recommendations",
    },
    {
      icon: <FiMail />,
      icBg: "bg-orange-50",
      icColor: "text-orange-500",
      title: "Email Generator",
      desc: "Write personalized outreach emails that get more responses.",
      link: "Generate Email",
    },
    {
      icon: <FiHelpCircle />,
      icBg: "bg-rose-50",
      icColor: "text-rose-500",
      title: "Interview Questions",
      desc: "Get role-specific interview questions and evaluation criteria.",
      link: "Generate Questions",
    },
    {
      icon: <FiCode />,
      icBg: "bg-blue-50",
      icColor: "text-blue-600",
      title: "Boolean Search Builder",
      desc: "Build complex boolean strings easily with AI assistance.",
      link: "Build Boolean",
    },
  ];

  const smartTools = [
    {
      icon: <FiFileText />,
      icColor: "text-indigo-600",
      title: "Resume Analysis",
      desc: "Analyze any resume with AI",
    },
    {
      icon: <FiZap />,
      icColor: "text-emerald-600",
      title: "Skills Extractor",
      desc: "Extract skills and competencies",
    },
    {
      icon: <FiUsers />,
      icColor: "text-blue-600",
      title: "Sourcing Leads",
      desc: "Find and qualify sourcing leads",
    },
    {
      icon: <FiDollarSign />,
      icColor: "text-rose-500",
      title: "Salary Insights",
      desc: "Get market salary data instantly",
    },
    {
      icon: <FiBarChart2 />,
      icColor: "text-teal-600",
      title: "Competitor Insights",
      desc: "Analyze competitor hiring patterns",
    },
    {
      icon: <FiTrendingUp />,
      icColor: "text-purple-600",
      title: "Hiring Trends",
      desc: "Discover latest hiring trends",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-400 mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              {t("AI Recruiter Workspace")}
              <HiSparkles className="text-purple-600" />
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {t("How can Luco AI help you hire better today?")}
            </p>
          </div>
          
          {!usageLoading && aiUsage?.limits && (
            <div className="bg-white rounded-xl border border-indigo-100 p-3 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex flex-col">
                  <span className="text-gray-500 text-[10px] mb-0.5">{t('common.currentPlan', 'Current Plan')}</span>
                  <span className="text-indigo-600 font-bold capitalize bg-indigo-50 px-2 py-0.5 rounded text-[10px] tracking-wide border border-indigo-100 self-start">
                    {aiUsage.planDetails?.name || aiUsage.planDetails?.slug || 'Free'}
                  </span>
                </div>
                <div className="h-6 w-px bg-gray-200 hidden md:block"></div>
                <div className="flex flex-col">
                  <span className="text-gray-500 text-[10px] flex items-center gap-1"><FiMessageCircle className="w-2.5 h-2.5 text-indigo-500"/> {t('recruiter.aiCopilotLimit', 'AI Copilot Chats')}</span>
                  <span className="text-slate-800 font-bold text-xs">
                    {aiUsage.limits.aiCopilot === -1 ? 'Unlimited' : 
                      `${Math.max(0, (aiUsage.limits.aiCopilot || 0) - (aiUsage.usage?.aiCopilot || 0))} / ${aiUsage.limits.aiCopilot || 0} ${t('common.credits', 'Credits')}`}
                  </span>
                </div>
              </div>
            </div>
          )}
          <button
            onClick={startNewChat}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition shadow-sm"
          >
            <FiPlus />
            {t("New Chat")}
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8">
          {/* Main Left Column */}
          <div className="xl:col-span-8 2xl:col-span-9">
            {!isChatting ? (
              <div className="space-y-10">
                {/* Hero Search Box - Original Theme & Mobile Optimized */}
                <div className="bg-gradient-to-r from-indigo-50 via-[#F3E8FF] to-purple-50 rounded-2xl p-6 sm:p-10 relative overflow-hidden flex flex-col md:flex-row items-center min-h-[280px]">
                  <div className="relative z-10 w-full md:w-[60%] lg:w-[65%] flex flex-col pt-2 md:pt-0">
                    <h2 className="text-[22px] sm:text-[26px] font-extrabold text-gray-900 mb-1.5 tracking-tight text-center md:text-left">
                      {t("Start a conversation with Luco AI")}
                    </h2>
                    <p className="text-sm font-medium text-gray-700 mb-6 text-center md:text-left">
                      {t(
                        "Ask anything about candidates, jobs, hiring strategies or insights.",
                      )}
                    </p>

                    <div className="bg-white rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] p-1.5 flex items-center mb-6 focus-within:ring-2 focus-within:ring-purple-200 transition">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                        placeholder={t(
                          'Ask anything... e.g. "Find React developers with 4+ yrs"',
                        )}
                        className="flex-1 bg-transparent border-none px-4 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none min-w-0"
                      />
                      <button
                        onClick={() => handleSend()}
                        className="w-9 h-9 bg-purple-100 hover:bg-purple-200 text-purple-600 rounded-lg flex items-center justify-center transition shrink-0 ml-2"
                      >
                        <FiArrowRight className="w-4 h-4 font-bold" />
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2 sm:gap-3 justify-center md:justify-start">
                      {quickActions.map((action, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleActionClick(action.label)}
                          className="flex items-center gap-1.5 bg-white text-gray-700 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:shadow-md transition"
                        >
                          <span className="text-purple-600">{action.icon}</span>
                          <span className="whitespace-nowrap">
                            {action.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Robot Illustration Area */}
                  <div className="w-full md:w-[40%] lg:w-[35%] flex justify-center md:absolute md:right-0 md:bottom-0 md:top-0 opacity-100 md:pr-4 mb-6 md:mb-0 pointer-events-none order-first md:order-last">
                    <div className="relative w-40 h-40 sm:w-48 sm:h-48 lg:w-56 lg:h-56">
                      <div className="absolute inset-0 bg-white/40 blur-2xl rounded-full scale-110"></div>
                      <img
                        src="/luco_ai_robot.webp"
                        alt="Luco AI"
                        className="w-full h-full object-contain relative z-10 drop-shadow-xl animate-float"
                      />
                      {/* Sparkles */}
                      <HiSparkles className="absolute top-4 right-4 sm:right-8 text-pink-400 w-6 h-6 sm:w-8 sm:h-8 animate-pulse z-20" />
                      <HiSparkles className="absolute bottom-8 left-2 sm:left-4 text-purple-400 w-4 h-4 sm:w-6 sm:h-6 animate-pulse delay-75 z-20" />
                    </div>
                  </div>
                </div>

                {/* Action Cards */}
                <div>
                  <h3 className="text-xl font-extrabold text-gray-900 mb-6">
                    {t("What would you like to do today?")}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
                    {actionCards.map((card, idx) => (
                      <SCard
                        key={idx}
                        className="p-5 flex flex-col hover:border-indigo-200 transition group cursor-pointer"
                        onClick={() => handleActionClick(card.title)}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.icBg} ${card.icColor}`}
                          >
                            <span className="text-lg">{card.icon}</span>
                          </div>
                          {card.tag && (
                            <span
                              className={`text-[10px] font-bold px-2 py-1 rounded-md ${card.tagBg}`}
                            >
                              {card.tag}
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-gray-900 mb-1.5">
                          {card.title}
                        </h4>
                        <p className="text-xs text-gray-500 font-medium leading-relaxed flex-1 mb-5">
                          {card.desc}
                        </p>
                        <div className="text-xs font-bold text-indigo-600 flex items-center gap-1 group-hover:text-indigo-700 transition">
                          {card.link} <FiArrowRight />
                        </div>
                      </SCard>
                    ))}
                  </div>
                </div>

                {/* Smart Tools */}
                <div>
                  <h3 className="text-xl font-extrabold text-gray-900 mb-6">
                    {t("Smart Tools")}
                  </h3>
                  <SCard className="p-6 flex items-center">
                    <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 lg:gap-8">
                      {smartTools.map((tool, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleActionClick(tool.title)}
                          className="flex flex-col items-center text-center group cursor-pointer"
                        >
                          <div
                            className={`w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mb-3 group-hover:bg-indigo-50 transition ${tool.icColor}`}
                          >
                            <span className="text-xl">{tool.icon}</span>
                          </div>
                          <div className="text-xs font-bold text-gray-900 mb-1">
                            {tool.title}
                          </div>
                          <div className="text-[10px] text-gray-500 font-medium leading-tight px-2">
                            {tool.desc}
                          </div>
                        </div>
                      ))}
                    </div>
                  </SCard>
                  <div className="mt-4 text-center">
                    <button
                      onClick={() => handleActionClick("Explore All Tools")}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center justify-center gap-1 mx-auto transition"
                    >
                      {t("Explore All Tools")}
                      <FiArrowRight />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <SCard className="flex flex-col h-[calc(100vh-200px)] border-gray-200 shadow-sm overflow-hidden bg-white">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={startNewChat}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200 text-gray-500 transition"
                    >
                      <FiArrowLeft />
                    </button>
                    <div>
                      <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                        {t("Luco AI Assistant")}
                        <HiSparkles className="text-purple-600 w-3 h-3" />
                      </h2>
                      <p className="text-[10px] font-semibold text-gray-500">
                        {t("Always here to help you hire")}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-gray-50/30">
                  {messages.length === 0 && !loading && (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                      <FaRobot className="w-12 h-12 text-gray-300 mb-3" />
                      <p className="text-sm font-medium text-gray-500">
                        {t("Start typing to begin...")}
                      </p>
                    </div>
                  )}
                  {messages.map((msg, i) => {
                    const shouldBlur = isLimitReached && msg.role === "assistant";
                    
                    return (
                      <div
                        key={i}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} max-w-full`}
                      >
                        <div
                          className={`flex gap-3 max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                        >
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === "user" ? "bg-indigo-100 text-indigo-600" : "bg-purple-600 text-white shadow-md"}`}
                          >
                            {msg.role === "user" ? (
                              <FiUser className="w-4 h-4" />
                            ) : (
                              <FaRobot className="w-4 h-4" />
                            )}
                          </div>
                          <div
                            className={`px-4 py-3 rounded-2xl text-[13px] leading-relaxed shadow-sm ${msg.role === "user" ? "bg-indigo-600 text-white rounded-tr-sm" : "bg-white border border-gray-100 text-gray-800 rounded-tl-sm"} ${shouldBlur ? "blur-sm select-none" : ""}`}
                          >
                            {msg.role === "user" ? (
                              msg.content
                            ) : (
                              <div className="prose prose-sm prose-p:my-1 prose-headings:my-2 prose-ul:my-1 max-w-none text-gray-800">
                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {loading && (
                    <div className="flex justify-start">
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-600 text-white shadow-md flex items-center justify-center shrink-0">
                          <FaRobot className="w-4 h-4" />
                        </div>
                        <div className="px-5 py-3.5 rounded-2xl rounded-tl-sm bg-white border border-gray-100 flex items-center gap-1.5 shadow-sm">
                          <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce"></span>
                          <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce delay-75"></span>
                          <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce delay-150"></span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="p-4 bg-white border-t border-gray-100">
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-1.5 flex items-end focus-within:ring-2 focus-within:ring-indigo-200 focus-within:border-indigo-400 transition shadow-inner">
                    <textarea
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder={t("Reply to Luco AI...")}
                      className="flex-1 bg-transparent border-none px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none resize-none min-h-11 max-h-30"
                      rows={1}
                    />
                    <button
                      onClick={() => handleSend()}
                      disabled={loading || !chatInput.trim() || isLimitReached}
                      className="w-auto px-3 min-w-[3rem] h-10 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg flex flex-col items-center justify-center transition shrink-0 ml-2 shadow-sm mb-0.5"
                    >
                      {loading ? (
                        <FiLoader className="w-4 h-4 animate-spin" />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full pt-1.5">
                          <FiSend className="w-4 h-4" />
                          {!usageLoading && aiUsage.limits.aiCopilot !== undefined && aiUsage.limits.aiCopilot !== -1 && (
                            <span className="text-[9px] opacity-80 -mt-0.5">
                              {Math.max(0, aiUsage.limits.aiCopilot - (aiUsage.usage.aiCopilot || 0))} left
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  </div>
                  <div className="text-[10px] text-center font-medium text-gray-400 mt-2">
                    {t("AI can make mistakes. Verify important information.")}
                  </div>
                </div>
              </SCard>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="xl:col-span-4 2xl:col-span-3 space-y-6">
            {/* Recent Conversations */}
            <SCard className="p-5">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-extrabold text-gray-900">
                  {t("Recent Conversations")}
                </h3>
              </div>
              <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                {conversations.length === 0 ? (
                  <div className="text-xs text-gray-500 text-center py-4">
                    {t("No recent conversations")}
                  </div>
                ) : (
                  conversations.map((conv, idx) => (
                    <div
                      key={idx}
                      onClick={() => loadConversation(conv._id)}
                      className="flex gap-3 group cursor-pointer"
                    >
                      <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                        <FiMessageSquare className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-0.5">
                          <h4 className="text-xs font-bold text-gray-900 truncate group-hover:text-indigo-600 transition">
                            {conv.title}
                          </h4>
                          <span className="text-[10px] font-semibold text-gray-400 shrink-0">
                            {new Date(conv.time).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-[11px] font-medium text-gray-500 truncate">
                          {conv.desc}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </SCard>

            {/* AI Insights */}
            <SCard className="p-5">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-extrabold text-gray-900">
                  {t("AI Insights for You")}
                </h3>
              </div>
              <div className="space-y-4">
                {aiInsightsLoading ? (
                  <>
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex gap-3 animate-pulse">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 shrink-0"></div>
                        <div className="flex-1 space-y-2 py-1">
                          <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-2 bg-gray-100 rounded w-1/2"></div>
                        </div>
                      </div>
                    ))}
                  </>
                ) : aiInsights.length > 0 ? (
                  aiInsights.map((insight, idx) => {
                    const Icon = insight.icon || FiTrendingUp;
                    return (
                      <div key={idx} className="flex gap-3">
                        <div
                          className={`w-8 h-8 rounded-full bg-${insight.color || "indigo"}-50 text-${insight.color || "indigo"}-600 flex items-center justify-center shrink-0 border border-${insight.color || "indigo"}-100`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-gray-900 mb-0.5">
                            {t(insight.title)}
                          </h4>
                          <p className="text-[11px] font-medium text-gray-500">
                            {t(insight.desc)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-xs text-gray-500 text-center py-2">
                    {t("No insights available.")}
                  </div>
                )}
              </div>
            </SCard>

            {/* Copilot Usage */}
            <SCard className="p-5">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-extrabold text-gray-900">
                  {t("Copilot Usage This Week")}
                </h3>
                <button
                  onClick={() =>
                    handleActionClick("View Copilot Usage details")
                  }
                  className="text-xs font-bold text-indigo-600 flex items-center gap-1"
                >
                  {t("View usage")}
                  <FiArrowRight />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border border-gray-100 bg-gray-50/50 flex flex-col items-center justify-center text-center">
                  <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mb-1.5">
                    <FiMessageSquare className="w-3 h-3" />
                  </div>
                  <div className="text-sm font-extrabold text-gray-900">24</div>
                  <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">
                    {t("Conversations")}
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-gray-100 bg-gray-50/50 flex flex-col items-center justify-center text-center">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-1.5">
                    <FiClock className="w-3 h-3" />
                  </div>
                  <div className="text-sm font-extrabold text-gray-900">
                    {t("3h 12m")}
                  </div>
                  <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">
                    {t("Time Saved")}
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-gray-100 bg-gray-50/50 flex flex-col items-center justify-center text-center">
                  <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center mb-1.5">
                    <FiZap className="w-3 h-3" />
                  </div>
                  <div className="text-sm font-extrabold text-gray-900">48</div>
                  <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">
                    {t("Tasks Completed")}
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-gray-100 bg-gray-50/50 flex flex-col items-center justify-center text-center">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-1.5">
                    <HiSparkles className="w-3 h-3" />
                  </div>
                  <div className="text-sm font-extrabold text-gray-900">
                    92%
                  </div>
                  <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">
                    {t("Accuracy")}
                  </div>
                </div>
              </div>
            </SCard>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-8">
          {/* HIRING SNAPSHOT */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-gray-900">
                Hiring Snapshot (This Week)
              </h2>
              <Link
                to="/recruiter/analytics"
                className="text-sm font-bold text-indigo-600 flex items-center gap-1 hover:text-indigo-700 transition"
              >
                View full report <FiArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 divide-x divide-gray-100">
              <div className="pl-0 pr-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <FiUsers className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-bold text-gray-700 leading-tight">
                    New Applications
                  </div>
                </div>
                <div className="text-3xl font-extrabold text-gray-900 mb-1">
                  {jobs.reduce(
                    (sum, job) => sum + (job.interestedCount || 0),
                    0,
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <span className="font-bold text-emerald-600 flex items-center">
                    <FiArrowUpRight className="w-3 h-3 mr-0.5" /> 18%
                  </span>
                  <span className="text-gray-400 font-medium">
                    vs last week
                  </span>
                </div>
              </div>

              <div className="px-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <FiCalendar className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-bold text-gray-700 leading-tight">
                    Interviews
                  </div>
                </div>
                <div className="text-3xl font-extrabold text-gray-900 mb-1">
                  0
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-gray-400 font-medium">
                    No recent changes
                  </span>
                </div>
              </div>

              <div className="px-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                    <FiCalendar className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-bold text-gray-700 leading-tight">
                    Offers Made
                  </div>
                </div>
                <div className="text-3xl font-extrabold text-gray-900 mb-1">
                  0
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-gray-400 font-medium">
                    No recent changes
                  </span>
                </div>
              </div>

              <div className="pl-4 pr-0">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <FiTarget className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-bold text-gray-700 leading-tight">
                    Hires
                  </div>
                </div>
                <div className="text-3xl font-extrabold text-gray-900 mb-1">
                  0
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-gray-400 font-medium">
                    No recent changes
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* FOLLOW-UPS PENDING */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-gray-900">
                Follow-ups Pending
              </h2>
              <Link
                to="/recruiter/tasks"
                className="text-sm font-bold text-indigo-600 flex items-center gap-1 hover:text-indigo-700 transition"
              >
                View all <FiArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="space-y-5">
              {tasks.slice(0, 3).map((task, idx) => {
                const iconStyle =
                  idx % 3 === 0
                    ? "bg-purple-50 text-purple-600 border-purple-100"
                    : idx % 3 === 1
                      ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                      : "bg-orange-50 text-orange-600 border-orange-100";
                const Icon =
                  idx % 3 === 0
                    ? FiMail
                    : idx % 3 === 1
                      ? FiMessageCircle
                      : FiCalendar;
                const actionLabel =
                  idx % 3 === 0
                    ? "Respond"
                    : idx % 3 === 1
                      ? "Reply"
                      : "Provide Feedback";

                return (
                  <div
                    key={task._id || idx}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-sm ${iconStyle}`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-900 mb-0.5">
                          {task.title}
                        </div>
                        <div className="text-xs font-medium text-gray-500">
                          {task.candidateName
                            ? `Candidate: ${task.candidateName}`
                            : task.dueDate
                              ? `Due: ${task.dueDate}`
                              : "Pending action"}
                        </div>
                      </div>
                    </div>
                    <Link
                      to="/recruiter/tasks"
                      className="px-4 py-2 rounded-lg border border-gray-200 text-indigo-700 bg-white text-xs font-bold hover:bg-gray-50 transition shadow-sm"
                    >
                      {actionLabel}
                    </Link>
                  </div>
                );
              })}

              {(!tasks || tasks.length === 0) && (
                <div className="text-sm text-gray-500 text-center py-4 border-2 border-dashed border-gray-100 rounded-xl">
                  No pending follow-ups or tasks right now.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
