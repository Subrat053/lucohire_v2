import useTranslation from "../../hooks/useTranslation";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { X, Bot, Send, Loader2 } from 'lucide-react';
import { aiAPI } from '../../services/api';

function messageIdOf(item) {
  return String(item?.id || item?._id || item?.clientMessageId || '');
}

function normalizeMessage(item = {}) {
  return {
    id: String(item.id || item._id || item.clientMessageId || ''),
    author: item.author || 'assistant',
    text: String(item.content || item.text || ''),
    status: item.status || 'sent',
    clientMessageId: item.clientMessageId || '',
    createdAt: item.createdAt || new Date().toISOString(),
  };
}

function sortMessages(messages = []) {
  return [...messages].sort((a, b) => {
    const aTime = new Date(a.createdAt || 0).getTime();
    const bTime = new Date(b.createdAt || 0).getTime();
    if (aTime !== bTime) return aTime - bTime;
    const aId = messageIdOf(a);
    const bId = messageIdOf(b);
    if (aId < bId) return -1;
    if (aId > bId) return 1;
    return 0;
  });
}

function mergeMessages(existing = [], incoming = []) {
  const map = new Map(existing.map((item) => [messageIdOf(item), item]));
  incoming.forEach((item) => {
    const key = messageIdOf(item);
    if (!key) return;
    map.set(key, item);
  });
  return sortMessages(Array.from(map.values()));
}

export default function AICoachModal({ role = 'provider' }) {
  const {
    t
  } = useTranslation();

  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState('');
  const [assistantTyping, setAssistantTyping] = useState(false);

  const containerRef = useRef(null);
  const bottomAnchorRef = useRef(null);
  const pendingScrollAfterSendRef = useRef(false);

  const storageKey = useMemo(() => `ai_coach_conversation_${role}`, [role]);

  useEffect(() => {
    const handleOpenAiCoach = () => setIsOpen(true);
    window.addEventListener('open-ai-coach', handleOpenAiCoach);
    return () => window.removeEventListener('open-ai-coach', handleOpenAiCoach);
  }, []);

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    if (!bottomAnchorRef.current) return;
    bottomAnchorRef.current.scrollIntoView({ behavior, block: 'end' });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    scrollToBottom(pendingScrollAfterSendRef.current ? 'smooth' : 'auto');
    pendingScrollAfterSendRef.current = false;
  }, [messages, isOpen, scrollToBottom]);

  const ensureConversation = useCallback(async () => {
    let activeId = localStorage.getItem(storageKey) || '';

    if (!activeId) {
      const created = await aiAPI.createConversation({ title: `AI Coach Chat` });
      activeId = String(created.data?.data?.id || '');
    }

    if (!activeId) {
      throw new Error('Failed to initialize conversation');
    }

    localStorage.setItem(storageKey, activeId);
    setConversationId(activeId);
    return activeId;
  }, [storageKey]);

  const bootstrapChat = useCallback(async () => {
    if (!isOpen) return;
    setLoadingHistory(true);

    try {
      const id = await ensureConversation();
      const { data } = await aiAPI.getConversationHistory(id, { limit: 50 });
      const payload = data?.data || { items: [] };
      const normalized = (payload.items || []).map(normalizeMessage);

      setMessages(normalized);
      requestAnimationFrame(() => scrollToBottom('auto'));
    } catch (_) {
      setMessages([
        {
          id: 'local-welcome',
          author: 'assistant',
          text: 'Hi! I am your AI Career Coach. How can I help you improve your profile and get hired faster today?',
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoadingHistory(false);
    }
  }, [isOpen, ensureConversation, scrollToBottom]);

  useEffect(() => {
    bootstrapChat();
  }, [bootstrapChat]);

  const askAI = async (message) => {
    const prompt = String(message || '').trim();
    if (!prompt || loading) return;

    const activeConversationId = conversationId || (await ensureConversation());
    const clientMessageId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const optimistic = {
      id: clientMessageId,
      clientMessageId,
      author: 'user',
      text: prompt,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => mergeMessages(prev, [optimistic]));
    setInput('');
    setAssistantTyping(true);
    setLoading(true);
    pendingScrollAfterSendRef.current = true;

    try {
      const { data } = await aiAPI.sendMessage({
        conversationId: activeConversationId,
        message: prompt,
        clientMessageId,
        context: { currentPage: location.pathname },
      });

      const payload = data?.data || {};
      const userMessage = normalizeMessage(payload.userMessage || { id: clientMessageId, author: 'user', content: prompt });
      const assistantMessage = normalizeMessage(
        payload.assistantMessage || {
          id: `a-${Date.now()}`,
          author: 'assistant',
          content: 'Sorry, I missed that context.',
          createdAt: new Date().toISOString(),
        }
      );

      if (payload.conversationId) {
        setConversationId(String(payload.conversationId));
        localStorage.setItem(storageKey, String(payload.conversationId));
      }

      setMessages((prev) => {
        const withoutPending = prev.filter((item) => item.clientMessageId !== clientMessageId && item.id !== clientMessageId);
        return mergeMessages(withoutPending, [userMessage, assistantMessage]);
      });
    } catch (error) {
      setMessages((prev) => [
        ...prev.filter((item) => item.clientMessageId !== clientMessageId && item.id !== clientMessageId),
        {
          id: `e-${Date.now()}`,
          author: 'assistant',
          text: 'Oops, I am temporarily unavailable. Please try again in a bit.',
          status: 'failed',
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
      setAssistantTyping(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-[90%] max-w-2xl h-[85vh] sm:h-[80vh] rounded-[24px] shadow-2xl flex flex-col overflow-hidden relative animate-slideUp">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-50 rounded-full flex items-center justify-center border border-teal-100 shadow-sm">
              <Bot className="w-5 h-5 text-teal-700" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-gray-900 leading-tight">{t("AI Career Coach")}</h2>
              <p className="text-[12px] font-medium text-gray-500">{t("Premium guidance & insights")}</p>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Area */}
        <div ref={containerRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#fafafa]">
          {loadingHistory ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-sm font-medium">{t("Loading previous conversation...")}</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center max-w-sm mx-auto">
              <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mb-5 shadow-sm border border-teal-100">
                <Bot className="w-8 h-8 text-teal-700" />
              </div>
              <h3 className="text-gray-900 font-bold mb-2 text-lg">{t("Start a conversation")}</h3>
              <p className="text-[13px] leading-relaxed text-gray-500 font-medium">{t(
                "Ask me anything about your career path, interview preparation, or profile optimization."
              )}</p>
            </div>
          ) : (
            messages.map((item) => {
              const isUser = item.author === 'user';
              return (
                <div key={item.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  {!isUser && (
                    <div className="w-8 h-8 bg-teal-50 rounded-full flex items-center justify-center border border-teal-100 shadow-sm shrink-0 mr-3 mt-1">
                      <Bot className="w-4 h-4 text-teal-700" />
                    </div>
                  )}
                  <div 
                    className={`max-w-[80%] px-5 py-3.5 text-[14px] leading-relaxed wrap-break-word whitespace-pre-wrap shadow-sm font-medium
                    ${isUser 
                      ? 'bg-gray-900 text-white rounded-[20px] rounded-tr-sm' 
                      : 'bg-white text-gray-800 border border-gray-100 rounded-[20px] rounded-tl-sm'}`}
                  >
                    {item.text}
                  </div>
                </div>
              );
            })
          )}

          {assistantTyping && (
            <div className="flex justify-start items-center gap-3">
              <div className="w-8 h-8 bg-teal-50 rounded-full flex items-center justify-center border border-teal-100 shadow-sm shrink-0">
                <Bot className="w-4 h-4 text-teal-700" />
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex gap-1.5 items-center h-[46px]">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={bottomAnchorRef} className="h-2" />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-gray-100 z-10">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              askAI(input);
            }}
            className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full p-1.5 shadow-inner pr-2 focus-within:ring-2 focus-within:ring-teal-500/20 focus-within:border-teal-500/50 transition-all"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("Ask for advice...")}
              className="flex-1 bg-transparent px-4 py-2 text-[14px] outline-none text-gray-800 placeholder-gray-400 font-medium"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center text-white hover:bg-teal-700 disabled:opacity-50 transition shadow-sm shrink-0"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </form>
        </div>
        
      </div>
    </div>
  );
}
