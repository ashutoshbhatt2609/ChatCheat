import { useState, useCallback, useEffect } from 'react';
import { Layout } from './components/Layout';
import { ChatImport } from './components/ChatImport';
import { ModelLoader } from './components/ModelLoader';
import { SummaryView } from './components/SummaryView';
import { ActionItems } from './components/ActionItems';
import { PriorityFilter } from './components/PriorityFilter';
import { ConversationHistory } from './components/ConversationHistory';
import { parseChat } from './parsers';
import { aiEngine, type ModelId, type LoadingProgress } from './ai/engine';
import { buildSummaryMessages, buildActionItemMessages, buildPriorityMessages } from './ai/prompts';
import { db, type StoredConversation } from './db';
import type { ParsedConversation } from './parsers/types';
import { heuristicSummary, heuristicActionItems, heuristicPriorities } from './ai/heuristics';
import { CloudToggle } from './components/CloudToggle';
import { cloudComplete, isCloudAvailable } from './ai/cloud';
import {
  parseSummary,
  parseActionItems,
  parsePriorities,
  fitToContext,
  type SummaryData,
  type ActionItemData as ActionItem,
  type PriorityData,
} from './ai/json';

/**
 * Root application component.
 * Manages the full lifecycle: model loading → chat import → AI analysis → results display.
 */
export default function App() {
  // --- Model State ---
  const [modelProgress, setModelProgress] = useState<LoadingProgress>({
    stage: 'downloading',
    progress: 0,
    message: 'Select a model to get started',
  });
  const [currentModel, setCurrentModel] = useState<string | null>(null);

  // --- Cloud AI (opt-in; sends chat text to Gemini via /api/analyze) ---
  const [cloudAvailable, setCloudAvailable] = useState(false);
  const [cloudEnabled, setCloudEnabled] = useState(false);

  // --- Conversation State ---
  const [conversations, setConversations] = useState<StoredConversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<ParsedConversation | null>(null);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);

  // --- Analysis State ---
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [priorities, setPriorities] = useState<PriorityData | null>(null);
  const [username, setUsername] = useState('');
  const [notice, setNotice] = useState<{ kind: 'error' | 'info'; text: string } | null>(null);

  // --- Loading Flags ---
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isExtractingActions, setIsExtractingActions] = useState(false);
  const [isAnalyzingPriorities, setIsAnalyzingPriorities] = useState(false);

  // --- Load conversation history from IndexedDB on mount ---
  useEffect(() => {
    db.getAllConversations().then(setConversations).catch(console.error);
    isCloudAvailable().then(setCloudAvailable);
  }, []);

  // --- Model Loading ---
  const handleSelectModel = useCallback(async (modelId: string) => {
    try {
      setCurrentModel(modelId);
      await aiEngine.loadModel(modelId as ModelId, setModelProgress);
    } catch (err) {
      console.error('Failed to load model:', err);
      setModelProgress({
        stage: 'error',
        progress: 0,
        message: `Failed to load model: ${err instanceof Error ? err.message : 'Unknown error'}`,
      });
    }
  }, []);

  // --- Format messages as text for the AI ---
  const formatChatForAI = useCallback((conv: ParsedConversation): string => {
    return conv.messages
      .map((m) => {
        const time = m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `[${time}] ${m.sender}: ${m.content}`;
      })
      .join('\n');
  }, []);

  // --- Fit chat text to the model context window ---
  const prepareChatText = useCallback(
    (conv: ParsedConversation): string => {
      const { text, truncated } = fitToContext(formatChatForAI(conv));
      if (truncated) {
        setNotice({ kind: 'info', text: 'Chat is long: analysis used the most recent messages only.' });
      }
      return text;
    },
    [formatChatForAI],
  );

  // --- Run AI Analysis ---
  const runAnalysis = useCallback(
    async (conv: ParsedConversation) => {
      if (!cloudEnabled && !aiEngine.isReady()) {
        const s = heuristicSummary(conv);
        const a = heuristicActionItems(conv);
        setSummary(s);
        setActionItems(a);
        await db.saveSummary(conv.id, s);
        await db.saveActionItems(conv.id, a);
        setNotice({ kind: 'info', text: 'Quick analysis (rule-based, on-device). Enable cloud AI or load a model for AI-written summaries.' });
        return;
      }

      const chatText = prepareChatText(conv);

      // Run summarization
      setIsSummarizing(true);
      try {
        const summaryResult = cloudEnabled
          ? await cloudComplete('summary', chatText)
          : await aiEngine.complete(buildSummaryMessages(chatText));
        const parsed: SummaryData = parseSummary(summaryResult);
        setSummary(parsed);
        await db.saveSummary(conv.id, parsed);
      } catch (err) {
        console.error('Summary failed:', err);
        const s = heuristicSummary(conv);
        setSummary(s);
        setNotice({
          kind: 'error',
          text: (cloudEnabled && err instanceof Error ? err.message + ' ' : 'The AI returned an unreadable summary. ') + 'Showing a quick rule-based analysis instead.',
        });
      }
      setIsSummarizing(false);

      // Run action item extraction
      setIsExtractingActions(true);
      try {
        const actionResult = cloudEnabled
          ? await cloudComplete('actions', chatText)
          : await aiEngine.complete(buildActionItemMessages(chatText));
        const parsed: ActionItem[] = parseActionItems(actionResult);
        setActionItems(parsed);
        await db.saveActionItems(conv.id, parsed);
      } catch (err) {
        console.error('Action items failed:', err);
        setActionItems(heuristicActionItems(conv));
        setNotice({ kind: 'error', text: 'AI action-item extraction failed; showing rule-based results.' });
      }
      setIsExtractingActions(false);
    },
    [prepareChatText, cloudEnabled],
  );

  // --- Run Priority Analysis (triggered when username changes) ---
  const runPriorityAnalysis = useCallback(
    async (conv: ParsedConversation, name: string) => {
      if (!name.trim()) return;
      if (!cloudEnabled && !aiEngine.isReady()) {
        setPriorities(heuristicPriorities(conv, name));
        return;
      }

      setIsAnalyzingPriorities(true);
      try {
        const chatText = prepareChatText(conv);
        const result = cloudEnabled
          ? await cloudComplete('priorities', chatText, name)
          : await aiEngine.complete(buildPriorityMessages(chatText, name));
        const parsed: PriorityData = parsePriorities(result);
        setPriorities(parsed);
      } catch (err) {
        console.error('Priority analysis failed:', err);
        setPriorities(heuristicPriorities(conv, name));
        setNotice({ kind: 'error', text: 'AI priority analysis failed; showing rule-based results.' });
      }
      setIsAnalyzingPriorities(false);
    },
    [prepareChatText, cloudEnabled],
  );

  // --- Chat Import Handler ---
  const handleImport = useCallback(
    async (text: string, fileName?: string) => {
      setIsProcessing(true);
      setNotice(null);
      setSummary(null);
      setActionItems([]);
      setPriorities(null);

      try {
        const result = parseChat(text, fileName);

        if (!result.success || !result.conversation) {
          setNotice({ kind: 'error', text: result.error || 'Could not read that chat export.' });
          setIsProcessing(false);
          return;
        }

        const conv: ParsedConversation = { ...result.conversation, id: crypto.randomUUID() };
        setActiveConversation(conv);

        // Save to IndexedDB
        const convId = await db.saveConversation(conv);
        setActiveConvId(convId);

        // Refresh conversation list
        const allConvs = await db.getAllConversations();
        setConversations(allConvs);

        setIsProcessing(false);

        await runAnalysis(conv);
      } catch (err) {
        console.error('Import failed:', err);
        setNotice({ kind: 'error', text: 'Import failed. Check the file format and try again.' });
        setIsProcessing(false);
      }
    },
    [runAnalysis],
  );

  // --- Load a past conversation ---
  const handleSelectConversation = useCallback(
    async (id: string) => {
      try {
        const conv = await db.getConversation(id);
        if (!conv) return;

        setActiveConvId(id);

        // Reconstruct ParsedConversation from stored data
        const messages = (await db.getMessages(id)).map(({ conversationId: _c, ...m }) => m);
        const parsed: ParsedConversation = {
          id: conv.id!,
          name: conv.name,
          platform: conv.platform,
          messages,
          participants: conv.participants,
          startDate: conv.startDate,
          endDate: conv.endDate,
          messageCount: conv.messageCount,
        };
        setActiveConversation(parsed);

        // Load cached results
        const cachedSummary = await db.getSummary(id);
        if (cachedSummary) setSummary(cachedSummary);
        else setSummary(null);

        const cachedActions = await db.getActionItems(id);
        if (cachedActions.length > 0) setActionItems(cachedActions);
        else setActionItems([]);

        setPriorities(null);
      } catch (err) {
        console.error('Failed to load conversation:', err);
      }
    },
    [],
  );

  // --- Delete a conversation ---
  const handleDeleteConversation = useCallback(async (id: string) => {
    try {
      await db.deleteConversation(id);
      const allConvs = await db.getAllConversations();
      setConversations(allConvs);

      if (id === activeConvId) {
        setActiveConvId(null);
        setActiveConversation(null);
        setSummary(null);
        setActionItems([]);
        setPriorities(null);
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  }, [activeConvId]);

  // --- Username change for priority analysis ---
  const handleUsernameChange = useCallback(
    (name: string) => {
      setUsername(name);
      if (activeConversation && name.trim()) {
        runPriorityAnalysis(activeConversation, name);
      }
    },
    [activeConversation, runPriorityAnalysis],
  );

  // --- Sidebar ---
  const handleClearAll = useCallback(async () => {
    if (!window.confirm('Delete all saved conversations and results from this device?')) return;
    await db.clearAll();
    setConversations([]);
    setActiveConvId(null);
    setActiveConversation(null);
    setSummary(null);
    setActionItems([]);
    setPriorities(null);
  }, []);

  const sidebar = (
    <>
    <ConversationHistory
      conversations={conversations.map((c) => ({
        id: c.id!,
        name: c.name,
        platform: c.platform,
        messageCount: c.messageCount,
        createdAt: new Date(c.createdAt),
      }))}
      activeId={activeConvId}
      onSelect={handleSelectConversation}
      onDelete={handleDeleteConversation}
    />
    {conversations.length > 0 && (
      <button
        type="button"
        onClick={handleClearAll}
        className="mx-3 mb-3 w-[calc(100%-1.5rem)] rounded-lg border border-red-500/40 px-3 py-2 text-xs text-red-300 hover:bg-red-500/10 focus:outline-none focus:ring-2 focus:ring-red-500/50"
      >
        Delete all my data
      </button>
    )}
    </>
  );

  return (
    <Layout sidebar={sidebar}>
      {cloudAvailable && <CloudToggle enabled={cloudEnabled} onChange={setCloudEnabled} />}

      {/* Local model loader (optional, fully on-device) */}
      <ModelLoader
        progress={modelProgress}
        onSelectModel={handleSelectModel}
        currentModel={currentModel}
      />

      {notice && (
        <div
          role={notice.kind === 'error' ? 'alert' : 'status'}
          className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
            notice.kind === 'error'
              ? 'border-red-500/40 bg-red-500/10 text-red-200'
              : 'border-slate-600 bg-slate-800 text-slate-200'
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* Chat Import */}
      {!activeConversation && (
        <div className="mt-6">
          <ChatImport onImport={handleImport} isProcessing={isProcessing} />
        </div>
      )}

      {/* Results */}
      {activeConversation && (
        <div className="mt-6 space-y-6 animate-fade-in">
          {/* Conversation Header */}
          <div className="card flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-100">
                {activeConversation.name}
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                {activeConversation.messageCount} messages ·{' '}
                {activeConversation.participants.length} participants ·{' '}
                <span className="capitalize">{activeConversation.platform}</span>
              </p>
            </div>
            <button
              onClick={() => {
                setActiveConversation(null);
                setActiveConvId(null);
                setSummary(null);
                setActionItems([]);
                setPriorities(null);
              }}
              className="btn-secondary text-sm"
              aria-label="Analyze another conversation"
            >
              New Chat
            </button>
          </div>

          {/* Summary */}
          <SummaryView summary={summary} isLoading={isSummarizing} />

          {/* Action Items */}
          <ActionItems items={actionItems} isLoading={isExtractingActions} />

          {/* Priority Filter */}
          <PriorityFilter
            priorities={priorities}
            username={username}
            onUsernameChange={handleUsernameChange}
            isLoading={isAnalyzingPriorities}
          />
        </div>
      )}
    </Layout>
  );
}
