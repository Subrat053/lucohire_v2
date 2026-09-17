const { isValidId, normalizeId } = require('../../../utils/id');
const ChatConversation = require('../../../models/ChatConversation');
const ChatMessage = require('../../../models/ChatMessage');
const { sortMessagesAsc } = require('../utils/messageOrder');

function asObjectId(value) {
  return isValidId(value) ? normalizeId(value) : null;
}

function normalizePagination(input, fallback, min, max) {
  const parsed = Number(input);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(parsed)));
}

function toConversationDTO(item) {
  return {
    id: String(item._id),
    userId: String(item.userId),
    role: item.role,
    title: item.title,
    status: item.status,
    lastMessageAt: item.lastMessageAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    metadata: item.metadata || {},
  };
}

function toMessageDTO(item) {
  return {
    id: String(item._id),
    conversationId: String(item.conversationId),
    userId: String(item.userId),
    role: item.role,
    author: item.author,
    content: item.content,
    status: item.status,
    clientMessageId: item.clientMessageId || '',
    parentMessageId: item.parentMessageId ? String(item.parentMessageId) : null,
    metadata: item.metadata || {},
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function buildCursorFilter(beforeMessage) {
  if (!beforeMessage) return {};

  return {
    $or: [
      { createdAt: { $lt: beforeMessage.createdAt } },
      {
        createdAt: beforeMessage.createdAt,
        _id: { $lt: beforeMessage._id },
      },
    ],
  };
}

async function createConversation({ userId, role, title, metadata = {} }) {
  const doc = await ChatConversation.create({
    userId,
    role: role || 'recruiter',
    title: String(title || '').trim() || 'New Conversation',
    metadata,
    lastMessageAt: new Date(),
  });

  return toConversationDTO(doc);
}

async function ensureConversationAccess({ conversationId, userId }) {
  const conversation = await ChatConversation.findOne({
    _id: conversationId,
    userId,
  });

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  return conversation;
}

async function listConversations({ userId, role, page = 1, limit = 20 }) {
  const pageNum = normalizePagination(page, 1, 1, 1000);
  const limitNum = normalizePagination(limit, 20, 1, 100);

  const filter = {
    userId,
  };

  if (role) filter.role = role;

  const [items, total] = await Promise.all([
    ChatConversation.find(filter)
      .sort({ lastMessageAt: -1, _id: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    ChatConversation.countDocuments(filter),
  ]);

  return {
    items: items.map(toConversationDTO),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  };
}

async function getConversationHistory({ conversationId, userId, limit = 30, beforeMessageId = null }) {
  const conversationObjectId = asObjectId(conversationId);
  if (!conversationObjectId) throw new Error('Invalid conversationId');

  await ensureConversationAccess({ conversationId: conversationObjectId, userId });

  const limitNum = normalizePagination(limit, 30, 1, 100);
  let beforeMessage = null;

  if (beforeMessageId) {
    const beforeObjectId = asObjectId(beforeMessageId);
    if (!beforeObjectId) throw new Error('Invalid beforeMessageId');

    beforeMessage = await ChatMessage.findOne({
      _id: beforeObjectId,
      conversationId: conversationObjectId,
      userId,
    }).lean();
  }

  const filter = {
    conversationId: conversationObjectId,
    userId,
    ...buildCursorFilter(beforeMessage),
  };

  const raw = await ChatMessage.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limitNum + 1)
    .lean();

  const hasMore = raw.length > limitNum;
  const sliced = hasMore ? raw.slice(0, limitNum) : raw;
  const ordered = sortMessagesAsc(sliced).map(toMessageDTO);

  const nextCursor = hasMore && ordered.length > 0 ? ordered[0].id : null;

  return {
    items: ordered,
    pagination: {
      limit: limitNum,
      hasMore,
      nextCursor,
    },
  };
}

async function getRecentMessages({ conversationId, userId, limit = 12 }) {
  const conversationObjectId = asObjectId(conversationId);
  if (!conversationObjectId) return [];

  const limitNum = normalizePagination(limit, 12, 1, 50);
  const docs = await ChatMessage.find({
    conversationId: conversationObjectId,
    userId,
  })
    .sort({ createdAt: -1, _id: -1 })
    .limit(limitNum)
    .lean();

  return sortMessagesAsc(docs).map(toMessageDTO);
}

async function appendMessage({
  conversationId,
  userId,
  role,
  author,
  content,
  status = 'sent',
  clientMessageId = '',
  parentMessageId = null,
  metadata = {},
}) {
  const conversationObjectId = asObjectId(conversationId);
  if (!conversationObjectId) throw new Error('Invalid conversationId');

  await ensureConversationAccess({ conversationId: conversationObjectId, userId });

  const normalizedClientMessageId = String(clientMessageId || '').trim();

  if (normalizedClientMessageId) {
    const existing = await ChatMessage.findOne({
      conversationId: conversationObjectId,
      clientMessageId: normalizedClientMessageId,
    });

    if (existing) {
      return toMessageDTO(existing);
    }
  }

  const doc = await ChatMessage.create({
    conversationId: conversationObjectId,
    userId,
    role: role || 'recruiter',
    author,
    content: String(content || '').trim(),
    status,
    clientMessageId: normalizedClientMessageId || null,
    parentMessageId: asObjectId(parentMessageId),
    metadata,
  });

  const update = {
    $set: { lastMessageAt: doc.createdAt },
  };

  const maybeConversationTitle = String(content || '').trim();
  if (author === 'user' && maybeConversationTitle) {
    const conversation = await ChatConversation.findById(conversationObjectId).lean();
    if (conversation && (!conversation.title || conversation.title === 'New Conversation')) {
      update.$set.title = maybeConversationTitle.slice(0, 80);
    }
  }

  await ChatConversation.findByIdAndUpdate(conversationObjectId, update);

  return toMessageDTO(doc);
}

async function markMessageStatus({ messageId, conversationId, userId, status }) {
  const messageObjectId = asObjectId(messageId);
  const conversationObjectId = asObjectId(conversationId);
  if (!messageObjectId || !conversationObjectId) throw new Error('Invalid ids');

  const doc = await ChatMessage.findOneAndUpdate(
    {
      _id: messageObjectId,
      conversationId: conversationObjectId,
      userId,
    },
    {
      $set: {
        status,
      },
    },
    { new: true }
  );

  if (!doc) throw new Error('Message not found');
  return toMessageDTO(doc);
}

module.exports = {
  createConversation,
  listConversations,
  getConversationHistory,
  getRecentMessages,
  appendMessage,
  markMessageStatus,
  ensureConversationAccess,
};
