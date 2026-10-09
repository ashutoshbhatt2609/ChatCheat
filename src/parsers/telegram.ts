import { Message, ParsedConversation, ParserResult } from './types';

/**
 * Parses a Telegram JSON export file.
 * 
 * @param input - The raw JSON string of the Telegram export.
 * @returns A ParserResult containing the parsed conversation or an error.
 */
export function parseTelegram(input: string): ParserResult {
  try {
    const data = JSON.parse(input);
    const messagesData = data.messages || [];
    
    const messages: Message[] = [];
    const participants = new Set<string>();
    
    for (const msg of messagesData) {
      if (msg.type !== 'message' || !msg.text) continue;
      
      const sender = msg.from || 'Unknown';
      participants.add(sender);
      
      let content = '';
      if (typeof msg.text === 'string') {
        content = msg.text;
      } else if (Array.isArray(msg.text)) {
        content = msg.text.map((t: any) => typeof t === 'string' ? t : t.text || '').join('');
      }
      
      const mentions = content.match(/@\w+/g) || [];
      const timestamp = new Date(msg.date);
      
      messages.push({
        id: msg.id?.toString() || (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString()),
        sender,
        content,
        timestamp: isNaN(timestamp.getTime()) ? new Date() : timestamp,
        platform: 'telegram',
        replyTo: msg.reply_to_message_id?.toString(),
        mentions: mentions.map(m => m.substring(1)),
        isMedia: !!msg.photo || !!msg.file,
      });
    }
    
    if (messages.length === 0) {
      return { success: false, error: 'No valid Telegram messages found.' };
    }
    
    const conversation: ParsedConversation = {
      id: data.id?.toString() || 'telegram-chat',
      name: data.name || 'Telegram Chat',
      platform: 'telegram',
      messages,
      participants: Array.from(participants),
      startDate: messages[0].timestamp,
      endDate: messages[messages.length - 1].timestamp,
      messageCount: messages.length
    };
    
    return { success: true, conversation };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error parsing Telegram chat' };
  }
}
