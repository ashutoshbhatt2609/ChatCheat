import { Message, ParsedConversation, ParserResult } from './types';

/**
 * Parses a WhatsApp chat export text file into a structured format.
 * Handles multiple timestamp formats and multi-line messages.
 * 
 * @param input - The raw text content of the WhatsApp export.
 * @returns A ParserResult containing the parsed conversation or an error.
 */
export function parseWhatsApp(input: string): ParserResult {
  try {
    const lines = input.split(/\r?\n/);
    const messages: Message[] = [];
    const participants = new Set<string>();
    
    // Regex for: [DD/MM/YYYY, HH:MM:SS] Sender: Message
    // Regex for: DD/MM/YYYY, HH:MM - Sender: Message
    // Regex for: MM/DD/YY, HH:MM AM/PM - Sender: Message
    const lineRegex = /^\[?(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s+[AP]M)?)\]?\s*[\-\:]?\s*([^:]+):\s*(.*)$/i;
    
    let currentMessage: Message | null = null;
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      const match = line.match(lineRegex);
      if (match) {
        if (currentMessage) {
          messages.push(currentMessage);
        }
        
        const [_, dateStr, timeStr, sender, content] = match;
        
        // Skip system messages
        if (sender.includes('added') || sender.includes('removed') || sender.includes('changed') || sender.includes('left') || sender === 'System' || content.includes('Messages and calls are end-to-end encrypted')) {
            // Keep system messages out or refine parsing
        }

        participants.add(sender.trim());
        
        const mentions = content.match(/@\w+/g) || [];
        const isMedia = content.includes('<Media omitted>') || content.includes('image omitted');
        
        const timestamp = new Date(`${dateStr} ${timeStr}`);
        
        currentMessage = {
          id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
          sender: sender.trim(),
          content: content.trim(),
          timestamp: isNaN(timestamp.getTime()) ? new Date() : timestamp,
          platform: 'whatsapp',
          isMedia,
          mentions: mentions.map(m => m.substring(1)),
        };
      } else if (currentMessage) {
        // Multi-line message
        currentMessage.content += '\n' + line;
      }
    }
    
    if (currentMessage) {
      messages.push(currentMessage);
    }
    
    if (messages.length === 0) {
      return { success: false, error: 'No valid WhatsApp messages found.' };
    }
    
    const startDate = messages[0].timestamp;
    const endDate = messages[messages.length - 1].timestamp;
    
    const conversation: ParsedConversation = {
      id: crypto.randomUUID ? crypto.randomUUID() : 'whatsapp-chat',
      name: 'WhatsApp Chat',
      platform: 'whatsapp',
      messages,
      participants: Array.from(participants),
      startDate,
      endDate,
      messageCount: messages.length
    };
    
    return { success: true, conversation };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error parsing WhatsApp chat' };
  }
}
