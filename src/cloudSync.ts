import { apiFetch } from './api';
import type { ParsedConversation } from './parsers/types';

export interface CloudListItem {
  id: string;
  name: string;
  platform: string;
  messageCount: number;
  createdAt: number;
}

export interface CloudConversation {
  id: string;
  name: string;
  platform: ParsedConversation['platform'];
  startDate: number;
  endDate: number;
  createdAt: number;
  messages: { sender: string; content: string; timestamp: number }[];
  summary: unknown;
  actions: unknown;
}

export async function listCloud(): Promise<CloudListItem[]> {
  const r = await apiFetch('/api/data');
  if (!r.ok) throw new Error('list failed');
  return ((await r.json()) as { conversations: CloudListItem[] }).conversations;
}

export async function fetchCloud(id: string): Promise<CloudConversation> {
  const r = await apiFetch(`/api/data?id=${encodeURIComponent(id)}`);
  if (!r.ok) throw new Error('fetch failed');
  return (await r.json()) as CloudConversation;
}

export async function pushCloud(conv: ParsedConversation, summary: unknown, actions: unknown): Promise<void> {
  const r = await apiFetch('/api/data', {
    method: 'PUT',
    body: JSON.stringify({
      id: conv.id,
      name: conv.name,
      platform: conv.platform,
      startDate: conv.startDate.getTime(),
      endDate: conv.endDate.getTime(),
      messages: conv.messages.map((m) => ({
        sender: m.sender,
        content: m.content.slice(0, 5000),
        timestamp: m.timestamp.getTime(),
      })),
      summary,
      actions,
    }),
  });
  if (!r.ok) throw new Error('sync failed');
}

export async function deleteCloud(id: string): Promise<void> {
  await apiFetch(`/api/data?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function deleteAllCloud(): Promise<void> {
  await apiFetch('/api/data?all=1', { method: 'DELETE' });
}
