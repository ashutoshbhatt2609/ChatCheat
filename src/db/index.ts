import Dexie from 'dexie';
import { Message, ParsedConversation } from '../parsers/types';

export type StoredMessage = Message & { conversationId: string };

export interface StoredConversation extends ParsedConversation {
  createdAt: number;
}

export interface SummaryData {
  tldr: string;
  keyPoints: string[];
  timeline: { time: string; event: string }[];
  createdAt: number;
}

export interface ActionItem {
  id?: string;
  conversationId: string;
  task: string;
  assignee: string;
  deadline: string | null;
  urgency: 'high' | 'medium' | 'low';
}

export interface Priorities {
  id?: string;
  conversationId: string;
  username: string;
  mentions: { from: string; message: string }[];
  decisions: string[];
  questions: string[];
  deadlines: { item: string; date: string }[];
}

/**
 * Dexie-based IndexedDB storage for ChatCheat conversations, messages, and AI-generated outputs.
 */
export class ChatDatabase extends Dexie {
  conversations!: Dexie.Table<StoredConversation, string>;
  messages!: Dexie.Table<StoredMessage, string>;
  summaries!: Dexie.Table<SummaryData & { id?: string; conversationId: string }, string>;
  actionItems!: Dexie.Table<ActionItem, string>;
  priorities!: Dexie.Table<Priorities, string>;

  constructor() {
    super('ChatCheatDB');
    this.version(1).stores({
      conversations: 'id, name, platform, createdAt',
      messages: 'id, conversationId, sender, timestamp',
      summaries: '++id, conversationId, createdAt',
      actionItems: '++id, conversationId, assignee, urgency',
      priorities: '++id, conversationId, username'
    });
  }

  async saveConversation(conv: ParsedConversation): Promise<string> {
    // Messages are stored separately, keyed uniquely per conversation.
    const { messages, ...meta } = conv;
    const storedConv = { ...meta, messages: [], createdAt: Date.now() } as StoredConversation;
    const storedMessages: StoredMessage[] = messages.map((m, i) => ({
      ...m,
      id: `${conv.id}:${i}`,
      conversationId: conv.id,
    }));
    
    return this.transaction('rw', this.conversations, this.messages, async () => {
      await this.conversations.put(storedConv);
      if (storedMessages.length > 0) {
        await this.messages.bulkPut(storedMessages);
      }
      return conv.id;
    });
  }

  async getConversation(id: string): Promise<StoredConversation | undefined> {
    const conv = await this.conversations.get(id);
    if (conv) {
      conv.messages = await this.messages.where('conversationId').equals(id).sortBy('timestamp');
    }
    return conv;
  }

  async getAllConversations(): Promise<StoredConversation[]> {
    return this.conversations.orderBy('createdAt').reverse().toArray();
  }

  async saveSummary(convId: string, summary: Omit<SummaryData, 'createdAt'>): Promise<void> {
    await this.transaction('rw', this.summaries, async () => {
      await this.summaries.where('conversationId').equals(convId).delete();
      await this.summaries.put({ conversationId: convId, ...summary, createdAt: Date.now() });
    });
  }

  async getSummary(convId: string): Promise<SummaryData | undefined> {
    return this.summaries.where('conversationId').equals(convId).first();
  }

  async saveActionItems(convId: string, items: Omit<ActionItem, 'conversationId'>[]): Promise<void> {
    const itemsToSave = items.map(item => ({
      ...item,
      conversationId: convId
    }));
    
    return this.transaction('rw', this.actionItems, async () => {
      // Delete existing action items for this conversation
      await this.actionItems.where('conversationId').equals(convId).delete();
      // Insert new ones
      await this.actionItems.bulkAdd(itemsToSave as ActionItem[]);
    });
  }

  async getActionItems(convId: string): Promise<ActionItem[]> {
    return this.actionItems.where('conversationId').equals(convId).toArray();
  }

  /** Retrieve all messages for a given conversation, sorted by timestamp. */
  async getMessages(convId: string): Promise<StoredMessage[]> {
    return this.messages.where('conversationId').equals(convId).sortBy('timestamp');
  }

  async deleteConversation(id: string): Promise<void> {
    return this.transaction('rw', this.conversations, this.messages, this.summaries, this.actionItems, this.priorities, async () => {
      await this.conversations.delete(id);
      await this.messages.where('conversationId').equals(id).delete();
      await this.summaries.where('conversationId').equals(id).delete();
      await this.actionItems.where('conversationId').equals(id).delete();
      await this.priorities.where('conversationId').equals(id).delete();
    });
  }

  async clearAll(): Promise<void> {
    await Promise.all([
      this.conversations.clear(),
      this.messages.clear(),
      this.summaries.clear(),
      this.actionItems.clear(),
      this.priorities.clear()
    ]);
  }
}

export const db = new ChatDatabase();
