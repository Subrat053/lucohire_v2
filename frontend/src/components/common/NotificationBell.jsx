import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import {
  HiBell,
  HiCheckCircle,
  HiX,
  HiBriefcase,
  HiInformationCircle,
  HiExclamationCircle,
  HiUserGroup,
  HiEye,
  HiTrash,
} from 'react-icons/hi';
import { notificationAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const TYPE_ICON = {
  JOB_POSTED: { Icon: HiBriefcase, color: 'text-indigo-500', bg: 'bg-indigo-50' },
  NEW_LEAD: { Icon: HiUserGroup, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  CONTACT_UNLOCKED: { Icon: HiCheckCircle, color: 'text-cyan-500', bg: 'bg-cyan-50' },
  PROFILE_VIEWED: { Icon: HiEye, color: 'text-blue-500', bg: 'bg-blue-50' },
  PLAN_PURCHASED: { Icon: HiCheckCircle, color: 'text-purple-500', bg: 'bg-purple-50' },
  PLAN_EXPIRY_REMINDER: { Icon: HiExclamationCircle, color: 'text-red-700', bg: 'bg-red-50' },
  ADMIN_ALERT: { Icon: HiInformationCircle, color: 'text-slate-500', bg: 'bg-slate-100' },
};

const PAGE_SIZE = 15;

const timeAgo = (date) => {
  const secs = Math.floor((Date.now() - new Date(date)) / 1000);
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
};

const NotificationBell = () => {
  const { user, isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const panelRef = useRef(null);
  const socketRef = useRef(null);

  const fetchNotifications = useCallback(async (targetPage = 1, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);

    try {
      const { data } = await notificationAPI.getMyNotifications({ page: targetPage, limit: PAGE_SIZE });
      const list = data.notifications || [];
      const pages = data?.pagination?.pages || 1;

      setNotifications((prev) => {
        if (!append) return list;
        const seen = new Set(prev.map((n) => n._id));
        const merged = [...prev];
        for (const n of list) {
          if (!seen.has(n._id)) merged.push(n);
        }
        return merged;
      });

      setUnreadCount(Number.isFinite(data.unreadCount) ? data.unreadCount : 0);
      setPage(targetPage);
      setHasMore(targetPage < pages);
    } catch {
      // Silently fail for notifications
    } finally {
      if (append) setLoadingMore(false);
      else setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    fetchNotifications(1, false);

    // Poll fallback every 30 seconds.
    const interval = setInterval(() => fetchNotifications(1, false), 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !user?._id) return undefined;

    const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin;
    const socket = io(socketUrl, {
      withCredentials: true,
      transports: ['polling', 'websocket'],
    });

    socketRef.current = socket;
    socket.on('connect', () => {
      socket.emit('join', user._id);
    });

    socket.on('new_notification', (notification) => {
      setNotifications((prev) => {
        if (prev.some((n) => n._id === notification._id)) return prev;
        return [notification, ...prev].slice(0, 50);
      });
      setUnreadCount((prev) => prev + (notification.isRead ? 0 : 1));
    });

    socket.on('unread_count', (payload) => {
      if (typeof payload?.unreadCount === 'number') {
        setUnreadCount(payload.unreadCount);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, user?._id]);

  // Close panel when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const markAsRead = async (id) => {
    try {
      const { data } = await notificationAPI.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      if (typeof data?.unreadCount === 'number') {
        setUnreadCount(data.unreadCount);
      } else {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch {
      toast.error('Failed to mark as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      const { data } = await notificationAPI.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(typeof data?.unreadCount === 'number' ? data.unreadCount : 0);
    } catch {
      toast.error('Failed to mark all as read');
    }
  };

  const deleteNotification = async (id) => {
    try {
      const { data } = await notificationAPI.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      if (typeof data?.unreadCount === 'number') {
        setUnreadCount(data.unreadCount);
      }
    } catch {
      toast.error('Failed to delete notification');
    }
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    await fetchNotifications(page + 1, true);
  };

  const handleOpen = () => {
    setOpen((prev) => !prev);
    if (!open) {
      fetchNotifications(1, false);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={handleOpen}
        className="relative p-2 rounded-xl hover:bg-gray-100 transition text-gray-700"
        title="Notifications"
        aria-label="Open notifications menu"
        aria-expanded={open}
        aria-controls="notifications-dropdown"
      >
        <HiBell className="w-5 h-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none min-w-4.5 min-h-4.5 px-0.5">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Mobile backdrop */}
          <div className="fixed inset-0 bg-black/20 z-[90] sm:hidden" onClick={() => setOpen(false)} aria-hidden="true"></div>
          
          <div id="notifications-dropdown" className="fixed top-20 left-1/2 -translate-x-1/2 w-[90vw] max-w-sm max-h-[80vh] flex flex-col sm:absolute sm:right-0 sm:top-full sm:mt-2 sm:w-80 sm:left-auto sm:translate-x-0 sm:translate-y-0 sm:max-h-none bg-white rounded-2xl shadow-2xl sm:shadow-xl border border-gray-100 z-[100] sm:z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
              <h4 className="font-bold text-gray-900 text-sm">Notifications</h4>
            <div className="flex items-center gap-2">
               {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="text-xs text-indigo-600 font-medium hover:underline"
                >
                  Mark all read
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-lg"
                aria-label="Close notifications menu"
                aria-controls="notifications-dropdown"
              >
                <HiX className="w-3.5 h-3.5 text-gray-500" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="max-h-[60vh] sm:max-h-96 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-10">
                <HiBell className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                <p className="text-sm text-gray-400">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => {
                const config = TYPE_ICON[n.type] || TYPE_ICON.ADMIN_ALERT;
                const { Icon, color, bg } = config;
                return (
                  <div
                    key={n._id}
                    className={`flex gap-3 px-4 py-3 border-b border-gray-50 transition hover:bg-gray-50 ${!n.isRead ? 'bg-indigo-50/30' : ''}`}
                  >
                    <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center shrink-0 mt-0.5`}>
                      <Icon className={`w-4 h-4 ${color}`} />
                    </div>
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => !n.isRead && markAsRead(n._id)}>
                      <p className={`text-xs text-gray-900 ${!n.isRead ? 'font-bold' : 'font-semibold'}`}>{n.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteNotification(n._id)}
                      className="self-start p-1 rounded-md text-gray-300 hover:text-red-700 hover:bg-red-50 transition"
                      title="Delete"
                      aria-label="Delete notification"
                    >
                      <HiTrash className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                    {!n.isRead && (
                      <div className="w-2 h-2 bg-indigo-500 rounded-full mt-1.5 shrink-0" />
                    )}
                  </div>
                );
              })
            )}

            {hasMore && notifications.length > 0 && (
              <div className="px-4 py-3">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="w-full text-xs font-semibold text-indigo-600 border border-indigo-100 rounded-lg py-2 hover:bg-indigo-50 disabled:opacity-60"
                >
                  {loadingMore ? 'Loading...' : 'Load more'}
                </button>
              </div>
            )}
          </div>
        </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;
