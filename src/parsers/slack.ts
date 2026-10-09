import { Message, ParsedConversation, ParserResult } from './types';

/**
 * Parses a Slack JSON export (array of messages).
 * 
 * @param input - The raw JSON string of the Slack export.
 * @returns A ParserResult containing the parsed conversation or an error.
 */
export function parseSlack(input: string): ParserResult {
  try {
    const data = JSON.parse(input);
    if (!Array.isArray(data)) {
      throw new Error('Slack export should be a JSON array of messages');
    }
    
    const messages: Message[] = [];
    const participants = new Set<string>();
    
    for (const msg of data) {
      if (msg.type !== 'message' || msg.subtype === 'channel_join' || msg.subtype === 'channel_leave') continue;
      
      const sender = msg.user_profile?.real_name || msg.user || msg.username || 'Unknown';
      participants.add(sender);
      
      const content = msg.text || '';
      const mentions = content.match(/<@U\w+>/g) || [];
      
      const tsNum = parseFloat(msg.ts);
      const timestamp = new Date(tsNum * 1000);
      
      messages.push({
        id: msg.client_msg_id || msg.ts || (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString()),
        sender,
        content,
        timestamp: isNaN(timestamp.getTime()) ? new Date() : timestamp,
        platform: 'slack',
        replyTo: msg.thread_ts !== msg.ts ? msg.thread_ts : undefined,
        mentions: mentions.map((m: string) => m.replace(/[<@>]/g, '')),
        isMedia: !!msg.files && msg.files.length > 0,
      });
    }
    
    if (messages.length === 0) {
      return { success: false, error: 'No valid Slack messages found.' };
    }
    
    messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    const conversation: ParsedConversation = {
      id: 'slack-chat',
      name: 'Slack Chat',
      platform: 'slack',
      messages,
      participants: Array.from(participants),
      startDate: messages[0].timestamp,
      endDate: messages[messages.length - 1].timestamp,
      messageCount: messages.length
    };
    
    return { success: true, conversation };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error parsing Slack chat' };
  }
}
