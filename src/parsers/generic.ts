import { Message, ParsedConversation, ParserResult } from './types';

/**
 * Fallback parser using heuristic detection for unrecognized formats.
 * 
 * @param input - The raw text of the chat.
 * @returns A ParserResult containing the parsed conversation or an error.
 */
export function parseGeneric(input: string): ParserResult {
  try {
    const lines = input.split(/\r?\n/);
    const messages: Message[] = [];
    const participants = new Set<string>();
    
    // Very generic pattern: Timestamp-like string, Sender-like string: Message
    // Matches something like "2023-01-01 12:00:00 - Alice: Hello"
    const genericRegex = /^(?:\[?([^\]]+?)\]?\s*[\-\|]?\s*)?([A-Za-z0-9 _]+):\s*(.*)$/;
    
    let currentMessage: Message | null = null;
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      const match = line.match(genericRegex);
      if (match) {
        if (currentMessage) {
          messages.push(currentMessage);
        }
        
        const [_, dateStr, sender, content] = match;
        participants.add(sender.trim());
        
        let timestamp = new Date();
        if (dateStr) {
          const parsedDate = new Date(dateStr);
          if (!isNaN(parsedDate.getTime())) {
            timestamp = parsedDate;
          }
        }
        
        currentMessage = {
          id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
          sender: sender.trim(),
          content: content.trim(),
          timestamp,
          platform: 'generic',
        };
      } else if (currentMessage) {
        currentMessage.content += '\n' + line;
      }
    }
    
    if (currentMessage) {
      messages.push(currentMessage);
    }
    
    if (messages.length === 0) {
      return { success: false, error: 'Could not detect any generic message patterns.' };
    }
    
    const conversation: ParsedConversation = {
      id: 'generic-chat',
      name: 'Imported Chat',
      platform: 'generic',
      messages,
      participants: Array.from(participants),
      startDate: messages[0].timestamp,
      endDate: messages[messages.length - 1].timestamp,
      messageCount: messages.length
    };
    
    return { success: true, conversation };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error parsing generic chat' };
  }
}
