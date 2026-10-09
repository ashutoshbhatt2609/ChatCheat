/**
 * System prompt establishing the AI's role and persona as a chat summarizer.
 */
export const SYSTEM_PROMPT = `You are an expert AI assistant specialized in analyzing and summarizing chat conversations. 
Your goal is to extract key information, identify action items, and provide concise, highly readable summaries.
Always respond with valid JSON matching the exact schema requested in the prompt.
Do not include markdown code blocks around your JSON, just output the raw JSON object.`;

/**
 * Prompt for generating a summary (TL;DR, key points, timeline) from chat messages.
 */
export const SUMMARY_PROMPT = `Analyze the following chat conversation and provide a summary.
You must output a JSON object with the following structure:
{
  "tldr": "A one or two sentence overarching summary of the chat.",
  "keyPoints": [
    "Key point 1",
    "Key point 2"
  ],
  "timeline": [
    { "time": "approximate time or context", "event": "description of what happened" }
  ]
}

Focus on the most important decisions, topics discussed, and conclusions. Be concise.

Conversation:
`;

/**
 * Prompt for extracting action items from chat messages.
 */
export const ACTION_ITEMS_PROMPT = `Analyze the following chat conversation and extract all action items, tasks, and assignments.
You must output a JSON object with the following structure:
{
  "items": [
    {
      "task": "Description of the task",
      "assignee": "Name of the person assigned to the task (or 'Unassigned')",
      "deadline": "Deadline if mentioned, otherwise null",
      "urgency": "high" | "medium" | "low"
    }
  ]
}

Only include actionable tasks. If there are no action items, output an empty items array.

Conversation:
`;

/**
 * Prompt for extracting priorities for a specific user.
 */
export const PRIORITY_PROMPT = `Analyze the following chat conversation specifically focusing on the user "{username}".
Extract mentions, decisions affecting them, questions directed at them, and deadlines they are responsible for.
You must output a JSON object with the following structure:
{
  "mentions": [
    { "from": "Sender name", "message": "The message they were mentioned in" }
  ],
  "decisions": [
    "Decision relevant to the user"
  ],
  "questions": [
    "Question asked of the user"
  ],
  "deadlines": [
    { "item": "What is due", "date": "When it is due" }
  ]
}

Conversation:
`;

export function buildSummaryMessages(chatText: string): {role: string, content: string}[] {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: SUMMARY_PROMPT + chatText }
  ];
}

export function buildActionItemMessages(chatText: string): {role: string, content: string}[] {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: ACTION_ITEMS_PROMPT + chatText }
  ];
}

export function buildPriorityMessages(chatText: string, username: string): {role: string, content: string}[] {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: PRIORITY_PROMPT.replace('{username}', username) + chatText }
  ];
}
