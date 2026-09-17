import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { aiAPI } from '../../services/api';

const ROLE_TITLES = {
  provider: 'Provider AI Assistant',
  recruiter: 'Recruiter AI Assistant',
  admin: 'Admin AI Assistant',
};

const starterPromptsByRole = {
  provider: [
    'Client ka message polite aur effective kaise reply karu?',
    'Mujhe pricing kaise set karni chahiye?',
  ],
  recruiter: [
    'Best provider shortlist karne me help karo',
    'Kitna budget realistic hoga?',
  ],
};

function MessageBubble({ item }) {
  const isUser = item.author === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm wrap-break-word whitespace-pre-wrap ${isUser ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
        {item.text}
      </div>
    </div>
  );
}

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

export default function AIChatWidget({ role = 'recruiter', user = null, profile = null }) {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState('');
  const [beforeCursor, setBeforeCursor] = useState(null);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [assistantTyping, setAssistantTyping] = useState(false);

  const containerRef = useRef(null);
  const bottomAnchorRef = useRef(null);
  const nearBottomRef = useRef(true);
  const manualScrollDebounceRef = useRef(null);
  const pendingScrollAfterSendRef = useRef(false);
  const widgetRef = useRef(null);

  useEffect(() => {
    const handleOpenAiChat = () => setIsOpen(true);
    window.addEventListener('open-ai-chat', handleOpenAiChat);
    return () => window.removeEventListener('open-ai-chat', handleOpenAiChat);
  }, []);

  const title = ROLE_TITLES[role] || ROLE_TITLES.recruiter;
  const quickPrompts = useMemo(() => starterPromptsByRole[role] || starterPromptsByRole.recruiter, [role]);
  const storageKey = useMemo(() => `ai_chat_conversation_${role}`, [role]);

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    if (!bottomAnchorRef.current) return;
    bottomAnchorRef.current.scrollIntoView({ behavior, block: 'end' });
  }, []);

  const refreshNearBottomState = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const distanceFromBottom = container.scrollHeight - (container.scrollTop + container.clientHeight);
    nearBottomRef.current = distanceFromBottom < 120;
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;

    const container = containerRef.current;
    if (!container) return undefined;

    const handleScroll = () => {
      if (manualScrollDebounceRef.current) {
        clearTimeout(manualScrollDebounceRef.current);
      }

      manualScrollDebounceRef.current = setTimeout(() => {
        refreshNearBottomState();
      }, 60);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    refreshNearBottomState();

    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (manualScrollDebounceRef.current) {
        clearTimeout(manualScrollDebounceRef.current);
      }
    };
  }, [isOpen, refreshNearBottomState]);

  useEffect(() => {
    if (!isOpen) return;

    if (nearBottomRef.current || pendingScrollAfterSendRef.current) {
      scrollToBottom(pendingScrollAfterSendRef.current ? 'smooth' : 'auto');
    }

    pendingScrollAfterSendRef.current = false;
  }, [messages, isOpen, scrollToBottom]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (isOpen && widgetRef.current && !widgetRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const fetchHistory = useCallback(async (id, options = {}) => {
    const params = {
      limit: options.limit || 30,
    };
    if (options.before) params.before = options.before;

    const { data } = await aiAPI.getConversationHistory(id, params);
    const payload = data?.data || { items: [], pagination: {} };
    const normalized = (payload.items || []).map(normalizeMessage);

    return {
      items: normalized,
      hasMore: Boolean(payload.pagination?.hasMore),
      nextCursor: payload.pagination?.nextCursor || null,
    };
  }, []);

  const ensureConversation = useCallback(async () => {
    let activeId = localStorage.getItem(storageKey) || '';

    if (!activeId) {
      try {
        const listRes = await aiAPI.getConversations({ limit: 1 });
        const first = listRes.data?.data?.items?.[0];
        if (first?.id) activeId = String(first.id);
      } catch (_) {
        activeId = '';
      }
    }

    if (!activeId) {
      const created = await aiAPI.createConversation({ title: `${role} chat` });
      activeId = String(created.data?.data?.id || '');
    }

    if (!activeId) {
      throw new Error('Failed to initialize conversation');
    }

    localStorage.setItem(storageKey, activeId);
    setConversationId(activeId);
    return activeId;
  }, [role, storageKey]);

  const bootstrapChat = useCallback(async () => {
    if (!isOpen) return;
    setLoadingHistory(true);

    try {
      const id = await ensureConversation();
      const history = await fetchHistory(id, { limit: 30 });

      setMessages(history.items);
      setHasOlderMessages(history.hasMore);
      setBeforeCursor(history.nextCursor);
      requestAnimationFrame(() => scrollToBottom('auto'));
    } catch (_) {
      setMessages([
        {
          id: 'local-welcome',
          author: 'assistant',
          text: 'Namaste. Main aapki marketplace assistant hoon. Aap skill, budget, ya shortlist help puch sakte hain.',
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoadingHistory(false);
    }
  }, [isOpen, ensureConversation, fetchHistory, scrollToBottom]);

  useEffect(() => {
    bootstrapChat();
  }, [bootstrapChat]);

  const loadOlderMessages = async () => {
    if (!conversationId || !beforeCursor || loadingOlder || !hasOlderMessages) return;

    setLoadingOlder(true);
    try {
      const previousHeight = containerRef.current?.scrollHeight || 0;
      const history = await fetchHistory(conversationId, { limit: 25, before: beforeCursor });

      setMessages((prev) => mergeMessages(history.items, prev));
      setHasOlderMessages(history.hasMore);
      setBeforeCursor(history.nextCursor);

      requestAnimationFrame(() => {
        const container = containerRef.current;
        if (!container) return;
        const newHeight = container.scrollHeight;
        container.scrollTop = Math.max(0, newHeight - previousHeight + container.scrollTop);
      });
    } finally {
      setLoadingOlder(false);
    }
  };

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
        context: {
          currentPage: location.pathname,
        },
      });

      const payload = data?.data || {};
      const userMessage = normalizeMessage(payload.userMessage || { id: clientMessageId, author: 'user', content: prompt });
      const assistantMessage = normalizeMessage(
        payload.assistantMessage || {
          id: `a-${Date.now()}`,
          author: 'assistant',
          content: 'Main context samajh raha hoon. Aap thoda aur detail share karein.',
          createdAt: new Date().toISOString(),
        }
      );

      if (payload.conversationId) {
        const persistedConversationId = String(payload.conversationId);
        setConversationId(persistedConversationId);
        localStorage.setItem(storageKey, persistedConversationId);
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
          text: error?.response?.data?.message || 'Assistant temporarily unavailable. Thodi der baad try karein.',
          status: 'failed',
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
      setAssistantTyping(false);
    }
  };

  return (
    <div ref={widgetRef} className="fixed bottom-5 right-5 z-50">
      {isOpen && (
        <div className="mb-3 w-80 sm:w-96 rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
          <div className="px-4 py-3 bg-emerald-950 text-white flex items-center justify-between">
            <div>
              <p className="text-sm font-bold">{title}</p>
              <p className="text-[11px] text-gray-300">Context-aware AI chat</p>
            </div>
            <button type="button" onClick={() => setIsOpen(false)} className="text-xs text-gray-300 hover:text-white">Close</button>
          </div>

          <div ref={containerRef} className="p-3 h-88 overflow-y-auto space-y-2 bg-gray-50">
            {hasOlderMessages && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={loadOlderMessages}
                  disabled={loadingOlder}
                  className="text-[11px] px-2 py-1 rounded-full border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-60"
                >
                  {loadingOlder ? 'Loading older…' : 'Load older messages'}
                </button>
              </div>
            )}

            {loadingHistory ? (
              <p className="text-xs text-gray-500">Loading chat history…</p>
            ) : (
              messages.map((item) => <MessageBubble key={item.id} item={item} />)
            )}

            {assistantTyping && <p className="text-xs text-gray-500">Assistant is thinking…</p>}
            <div ref={bottomAnchorRef} />
          </div>

          <div className="px-3 py-2 border-t border-gray-100">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {quickPrompts.map((text) => (
                <button
                  key={text}
                  type="button"
                  onClick={() => askAI(text)}
                  className="text-[11px] px-2 py-1 rounded-full border border-teal-200 text-teal-700 bg-teal-50 hover:bg-teal-100"
                >
                  {text}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                askAI(input);
              }}
              className="flex gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask assistant..."
                className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-300"
              />
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="rounded-full bg-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-teal-700"
      >
        AI Chat
      </button>
    </div>
  );
}
