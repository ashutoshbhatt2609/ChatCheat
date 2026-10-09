import { Message, ParsedConversation, ParserResult } from './types';

/**
 * Parses a Discord Chat Exporter CSV or Text format.
 * 
 * @param input - The raw text of the Discord export.
 * @returns A ParserResult containing the parsed conversation or an error.
 */
export function parseDiscord(input: string): ParserResult {
  try {
    const lines = input.split(/\r?\n/);
    const messages: Message[] = [];
    const participants = new Set<string>();
    
    // Discord Chat Exporter typical format:
    // [DD-MMM-YY HH:MM AM] Username#1234: Message content
    const lineRegex = /^\[(.*?)\]\s+([^:]+):\s*(.*)$/;
    
    let currentMessage: Message | null = null;
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      const match = line.match(lineRegex);
      if (match) {
        if (currentMessage) {
          messages.push(currentMessage);
        }
        
        const [_, dateStr, sender, content] = match;
        participants.add(sender.trim());
        
        const mentions = content.match(/<@!?\d+>/g) || [];
        const timestamp = new Date(dateStr);
        
        currentMessage = {
          id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
          sender: sender.trim(),
          content: content.trim(),
          timestamp: isNaN(timestamp.getTime()) ? new Date() : timestamp,
          platform: 'discord',
          mentions: mentions.map(m => m.replace(/[<@!>]/g, '')),
        };
      } else if (currentMessage) {
        currentMessage.content += '\n' + line;
      }
    }
    
    if (currentMessage) {
      messages.push(currentMessage);
    }
    
    if (messages.length === 0) {
      return { success: false, error: 'No valid Discord messages found.' };
    }
    
    const conversation: ParsedConversation = {
      id: 'discord-chat',
      name: 'Discord Chat',
      platform: 'discord',
      messages,
      participants: Array.from(participants),
      startDate: messages[0].timestamp,
      endDate: messages[messages.length - 1].timestamp,
      messageCount: messages.length
    };
    
    return { success: true, conversation };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error parsing Discord chat' };
  }
}
