import { ParserResult } from './types';
import { parseWhatsApp } from './whatsapp';
import { parseTelegram } from './telegram';
import { parseSlack } from './slack';
import { parseDiscord } from './discord';
import { parseGeneric } from './generic';

export * from './types';
export * from './whatsapp';
export * from './telegram';
export * from './slack';
export * from './discord';
export * from './generic';

/**
 * Auto-detects the platform of a chat export and routes it to the appropriate parser.
 * 
 * @param input - The raw text or JSON of the chat export.
 * @returns A ParserResult containing the parsed conversation or an error.
 */
export function parseChat(input: string, _fileName?: string): ParserResult {
  if (!input || !input.trim()) {
    return { success: false, error: 'Empty input provided' };
  }

  // Check if it's JSON (Telegram or Slack)
  try {
    const parsedJson = JSON.parse(input);
    if (Array.isArray(parsedJson) && parsedJson.length > 0 && ('user' in parsedJson[0] || 'text' in parsedJson[0])) {
      return parseSlack(input);
    }
    if (parsedJson && typeof parsedJson === 'object' && 'messages' in parsedJson) {
      return parseTelegram(input);
    }
  } catch {
    // Not JSON, continue to text-based parsers
  }

  // Check for WhatsApp patterns
  if (/^\[?\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/.test(input.trim().substring(0, 100))) {
    const waResult = parseWhatsApp(input);
    if (waResult.success) return waResult;
  }

  // Check for Discord Chat Exporter pattern
  if (/^\[\d{2}-[a-zA-Z]{3}-\d{2}\s\d{2}:\d{2}\s[AP]M\]/.test(input.trim().substring(0, 100))) {
    const discordResult = parseDiscord(input);
    if (discordResult.success) return discordResult;
  }

  // Fallback to generic
  const genericResult = parseGeneric(input);
  if (genericResult.success && genericResult.conversation && genericResult.conversation.messages.length > 0) {
      return genericResult;
  }

  return { success: false, error: 'Could not auto-detect or parse the chat format.' };
}
