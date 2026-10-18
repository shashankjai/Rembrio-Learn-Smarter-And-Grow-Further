import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { ApiError } from '../utils/ApiError.js';
import { resolveAuthorizedDocuments } from '../services/rag/retriever.js';
import { answerQuestion } from '../services/rag/answer.js';

const publicMessage = (m) => ({
  id: String(m._id),
  role: m.role,
  content: m.content,
  citations: m.citations ?? [],
  sufficientEvidence: m.sufficientEvidence,
  createdAt: m.createdAt,
});

export async function ask(req, res) {
  const { question, documentIds, conversationId } = req.valid.body;
  const userId = req.user._id;

  let conversation = null;
  if (conversationId) {
    conversation = await Conversation.findOne({ _id: conversationId, userId });
    if (!conversation) throw ApiError.notFound('Conversation not found.');
  }

  // Throws a clear 400 if no ready documents are available to this user.
  const docs = await resolveAuthorizedDocuments(userId, documentIds);
  const result = await answerQuestion({ userId, question, documentIds: docs.map((d) => d._id) });

  if (!conversation) {
    conversation = await Conversation.create({
      userId,
      title: question.slice(0, 80),
      documentIds: docs.map((d) => d._id),
    });
  } else {
    conversation.updatedAt = new Date();
    await conversation.save();
  }

  const [, assistant] = await Message.create([
    { conversationId: conversation._id, userId, role: 'user', content: question },
    {
      conversationId: conversation._id,
      userId,
      role: 'assistant',
      content: result.answer,
      citations: result.citations,
      sufficientEvidence: result.sufficient,
    },
  ], { ordered: true });

  res.json({
    success: true,
    data: {
      conversationId: String(conversation._id),
      message: publicMessage(assistant),
    },
  });
}

export async function history(req, res) {
  const { conversationId, limit } = req.valid.query;
  const userId = req.user._id;

  if (conversationId) {
    const conversation = await Conversation.findOne({ _id: conversationId, userId });
    if (!conversation) throw ApiError.notFound('Conversation not found.');
    const messages = await Message.find({ conversationId, userId }).sort({ createdAt: 1 }).limit(500);
    return res.json({
      success: true,
      data: {
        conversation: { id: String(conversation._id), title: conversation.title },
        messages: messages.map(publicMessage),
      },
    });
  }

  const conversations = await Conversation.find({ userId }).sort({ updatedAt: -1 }).limit(limit);
  res.json({
    success: true,
    data: {
      conversations: conversations.map((c) => ({
        id: String(c._id),
        title: c.title,
        documentIds: c.documentIds.map(String),
        updatedAt: c.updatedAt,
      })),
    },
  });
}
