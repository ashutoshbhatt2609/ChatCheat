export interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: Date;
  platform: Platform;
  isMedia?: boolean;
  replyTo?: string;
  mentions?: string[];
}

export type Platform = 'whatsapp' | 'telegram' | 'slack' | 'discord' | 'generic';

export interface ParsedConversation {
  id: string;
  name: string;
  platform: Platform;
  messages: Message[];
  participants: string[];
  startDate: Date;
  endDate: Date;
  messageCount: number;
}

export interface ParserResult {
  success: boolean;
  conversation?: ParsedConversation;
  error?: string;
}
