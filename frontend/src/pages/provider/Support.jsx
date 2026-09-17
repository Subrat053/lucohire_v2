import useTranslation from "../../hooks/useTranslation";
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { HiChatAlt2, HiMail, HiPaperAirplane, HiSparkles, HiCheckCircle } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { supportAPI } from '../../services/api';

const PREDEFINED_PROFILE_ISSUES = [
  {
    id: 'blocked',
    title: 'My profile is blocked/locked',
    isSelfSolvable: true,
    solution: 'Please contact your manager or our admin team. They will send a 6-digit OTP to your registered email which you can use to unlock your profile.'
  },
  {
    id: 'password',
    title: 'How do I change my password?',
    isSelfSolvable: true,
    solution: 'You can change your password at any time by going to your dashboard menu and navigating to the "Change Password" section.'
  },
  {
    id: 'bank',
    title: 'How do I update my bank/payout details?',
    isSelfSolvable: true,
    solution: 'Navigate to the "Bank Details" section from your sidebar menu to securely add or update your payout information.'
  },
  {
    id: 'other',
    title: 'Other profile-related issue',
    isSelfSolvable: false,
    solution: null
  }
];

const PREDEFINED_JOB_ISSUES = [
  {
    id: 'cant_apply',
    title: 'I can\'t apply to a job',
    isSelfSolvable: true,
    solution: 'Please check if your profile is complete. Most jobs require a 100% complete profile before you can apply.'
  },
  {
    id: 'track',
    title: 'How do I track my application?',
    isSelfSolvable: true,
    solution: 'You can track your application status by navigating to the "My Plan" or "Jobs for Me" section in your sidebar menu.'
  },
  {
    id: 'other',
    title: 'Other job-related issue',
    isSelfSolvable: false,
    solution: null
  }
];

const PREDEFINED_PAYMENT_ISSUES = [
  {
    id: 'when',
    title: 'When will I get paid?',
    isSelfSolvable: true,
    solution: 'Payments are typically processed within 3-5 business days after the job is completed and approved.'
  },
  {
    id: 'failed',
    title: 'My payment failed',
    isSelfSolvable: true,
    solution: 'Please double-check your bank details in the "Payment Settings" section. If they are correct and the issue persists, please submit a ticket.'
  },
  {
    id: 'other',
    title: 'Other payment-related issue',
    isSelfSolvable: false,
    solution: null
  }
];

const getPredefinedIssues = (type) => {
  if (type === 'job') return PREDEFINED_JOB_ISSUES;
  if (type === 'payment') return PREDEFINED_PAYMENT_ISSUES;
  return PREDEFINED_PROFILE_ISSUES;
};

const Support = () => {
  const {
    t
  } = useTranslation();

  const { type } = useParams();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const chatEndRef = useRef(null);

  // Chat State
  const [messages, setMessages] = useState([
    { id: 1, sender: 'bot', text: 'Hi there! 👋 How can we help you today?' }
  ]);
  const [step, setStep] = useState('SELECT_TYPE'); // SELECT_TYPE, SELECT_PREDEFINED, TYPE_ISSUE, SUBMITTING, DONE
  const [issueType, setIssueType] = useState('profile');

  // Initial Routing Logic
  useEffect(() => {
    let initialType = null;
    if (type && ['profile', 'job', 'payment'].includes(type)) {
      initialType = type;
    } else if (location.pathname.includes('/support/profile')) initialType = 'profile';
    else if (location.pathname.includes('/support/job')) initialType = 'job';
    else if (location.pathname.includes('/support/payment')) initialType = 'payment';

    if (initialType && step === 'SELECT_TYPE') {
      handleTypeSelection(initialType);
    }
  }, [type, location.pathname]);

  // Ticket Data State
  const [selectedPredefinedId, setSelectedPredefinedId] = useState(null);
  const [inputValue, setInputValue] = useState('');

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, step]);

  const addMessage = (sender, text, isSolution = false) => {
    setMessages(prev => [...prev, { id: Date.now(), sender, text, isSolution }]);
  };

  const handleTypeSelection = (selectedType) => {
    setIssueType(selectedType);
    const typeLabel = selectedType === 'profile' ? 'Profile Issue' : selectedType === 'job' ? 'Job Issue' : 'Payment Issue';
    addMessage('user', typeLabel);
    
    setTimeout(() => {
      addMessage('bot', `Got it. Is it one of these common ${selectedType} issues?`);
      setStep('SELECT_PREDEFINED');
    }, 500);
  };

  const handlePredefinedSelection = (issue) => {
    setSelectedPredefinedId(issue.id);
    addMessage('user', issue.title);

    if (issue.isSelfSolvable) {
      setTimeout(() => {
        addMessage('bot', issue.solution, true);
        setTimeout(() => {
          addMessage('bot', 'Did this help resolve your issue?');
          setStep('SOLVED_CONFIRMATION');
        }, 800);
      }, 500);
    } else {
      setTimeout(() => {
        addMessage('bot', 'Please describe your issue in detail below.');
        setStep('TYPE_ISSUE');
      }, 500);
    }
  };

  const handleSolvedConfirmation = (isSolved) => {
    addMessage('user', isSolved ? 'Yes, thanks!' : 'No, I need to submit a ticket');
    
    if (isSolved) {
      setTimeout(() => {
        addMessage('bot', 'Great! Have a wonderful day! 🎉');
        setStep('DONE');
      }, 500);
    } else {
      setTimeout(() => {
        addMessage('bot', 'No problem. Please type out the details of your issue below and our team will look into it.');
        setStep('TYPE_ISSUE');
      }, 500);
    }
  };

  const handleSubmitCustomIssue = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || step !== 'TYPE_ISSUE') return;
    
    const userMessage = inputValue;
    addMessage('user', userMessage);
    setInputValue('');
    setStep('SUBMITTING');

    // Prepare final message
    let finalMessage = userMessage;
    if (selectedPredefinedId && selectedPredefinedId !== 'other') {
      const predefinedList = getPredefinedIssues(issueType);
      const predefined = predefinedList.find(i => i.id === selectedPredefinedId);
      if (predefined) {
        finalMessage = `[${predefined.title}]\n\n${userMessage}`;
      }
    }

    try {
      await supportAPI.createTicket({ type: issueType, message: finalMessage });
      setTimeout(() => {
        addMessage('bot', 'Your ticket has been submitted successfully! We will get back to you soon. ✅');
        setStep('DONE');
      }, 1000);
    } catch (error) {
      setTimeout(() => {
        addMessage('bot', `Oops, something went wrong: ${error.response?.data?.message || 'Failed to submit issue'}. Please try again.`);
        setStep('TYPE_ISSUE');
      }, 1000);
    }
  };

  const adminEmail = "admin@lucohire.com";

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto h-[calc(100vh-80px)] flex flex-col">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
        
        {/* Chat Header */}
        <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="hidden md:flex w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl items-center justify-center shrink-0">
                <HiSparkles className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{t("Luco Support Assistant")}</h1>
                <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse"></span>{t("Online and ready to help")}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setMessages([{ id: Date.now(), sender: 'bot', text: 'Hi there! 👋 How can we help you today?' }]);
                setStep('SELECT_TYPE');
                setInputValue('');
                navigate('/provider/support');
              }}
              title="Reset Chat"
              className="text-xs font-bold md:font-medium text-red-600 md:bg-red-50 hover:text-red-700 md:hover:bg-red-100 md:px-3 md:py-1.5 p-1 md:border md:border-red-100 rounded-lg transition-colors"
            >{t("End Chat")}</button>
          </div>
        </div>

        {/* Chat Messages Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-gray-50/30">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex w-full ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex max-w-[85%] md:max-w-[75%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>
                
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mb-1 ${
                  msg.sender === 'user' ? 'bg-emerald-600' : 'bg-gray-200'
                }`}>
                  {msg.sender === 'user' ? (
                    <span className="text-white text-xs font-bold">{user?.name?.charAt(0) || 'U'}</span>
                  ) : (
                    <HiChatAlt2 className="w-5 h-5 text-gray-500" />
                  )}
                </div>

                {/* Message Bubble */}
                <div className={`px-4 py-3 rounded-2xl ${
                  msg.sender === 'user' 
                    ? 'bg-emerald-600 text-white rounded-br-none' 
                    : msg.isSolution 
                      ? 'bg-emerald-50 border border-emerald-100 text-emerald-900 rounded-bl-none shadow-sm' 
                      : 'bg-white border border-gray-100 text-gray-800 rounded-bl-none shadow-sm'
                }`}>
                  {msg.isSolution && (
                    <h4 className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2 border-b border-emerald-100 pb-2">
                      <HiCheckCircle className="w-4 h-4" />{t("Quick Solution")}</h4>
                  )}
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                </div>
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {step === 'SUBMITTING' && (
            <div className="flex w-full justify-start">
              <div className="flex items-end gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0 mb-1">
                  <HiChatAlt2 className="w-5 h-5 text-gray-500" />
                </div>
                <div className="px-5 py-4 bg-white border border-gray-100 rounded-2xl rounded-bl-none shadow-sm flex gap-1">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                </div>
              </div>
            </div>
          )}

          {/* Quick Reply Actions */}
          <div className="flex w-full justify-start ml-10">
            {step === 'SELECT_TYPE' && (
              <div className="flex flex-wrap gap-2 mt-2">
                <button onClick={() => handleTypeSelection('profile')} className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium hover:bg-emerald-100 transition-colors border border-emerald-100">{t("Profile Issue")}</button>
                <button onClick={() => handleTypeSelection('job')} className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium hover:bg-emerald-100 transition-colors border border-emerald-100">{t("Job Issue")}</button>
                <button onClick={() => handleTypeSelection('payment')} className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium hover:bg-emerald-100 transition-colors border border-emerald-100">{t("Payment Issue")}</button>
              </div>
            )}
            
            {step === 'SELECT_PREDEFINED' && (
              <div className="flex flex-col gap-2 mt-2 w-full max-w-[85%]">
                {getPredefinedIssues(issueType).map(issue => (
                  <button 
                    key={issue.id} 
                    onClick={() => handlePredefinedSelection(issue)}
                    className="w-full text-left px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-colors shadow-sm"
                  >
                    {issue.title}
                  </button>
                ))}
              </div>
            )}

            {step === 'SOLVED_CONFIRMATION' && (
              <div className="flex flex-wrap gap-2 mt-2">
                <button onClick={() => handleSolvedConfirmation(true)} className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium hover:bg-emerald-100 transition-colors border border-emerald-100">{t("Yes, it's solved!")}</button>
                <button onClick={() => handleSolvedConfirmation(false)} className="px-4 py-2 bg-gray-50 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-100 transition-colors border border-gray-200">{t("No, I need a ticket")}</button>
              </div>
            )}
            
            {step === 'DONE' && (
              <div className="mt-2">
                <button onClick={() => {
                  setMessages([{ id: Date.now(), sender: 'bot', text: 'Hi there! 👋 How can we help you today?' }]);
                  setStep('SELECT_TYPE');
                  navigate('/provider/support');
                }} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-xs font-medium hover:bg-gray-200 transition-colors">{t("Start New Conversation")}</button>
              </div>
            )}
          </div>
          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-gray-100 bg-white shrink-0">
          <form onSubmit={handleSubmitCustomIssue} className="flex gap-3">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={step !== 'TYPE_ISSUE'}
              placeholder={step === 'TYPE_ISSUE' ? "Type your issue here..." : "Please select an option above..."}
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-hidden disabled:bg-gray-50 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || step !== 'TYPE_ISSUE'}
              className="w-12 h-12 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white rounded-xl flex items-center justify-center shrink-0 transition-colors"
            >
              <HiPaperAirplane className="w-5 h-5 rotate-90" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

export default Support;

