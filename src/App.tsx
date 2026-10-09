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
import { SAMPLE_CHAT } from './sampleChat';
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
      if (!aiEngine.isReady()) {
        const s = heuristicSummary(conv);
        const a = heuristicActionItems(conv);
        setSummary(s);
        setActionItems(a);
        await db.saveSummary(conv.id, s);
        await db.saveActionItems(conv.id, a);
        setNotice({ kind: 'info', text: 'Quick analysis (rule-based). Load an AI model above for deeper, AI-written summaries.' });
        return;
      }

      const chatText = prepareChatText(conv);

      // Run summarization
      setIsSummarizing(true);
      try {
        const summaryMessages = buildSummaryMessages(chatText);
        const summaryResult = await aiEngine.complete(summaryMessages);
        const parsed: SummaryData = parseSummary(summaryResult);
        setSummary(parsed);
        await db.saveSummary(conv.id, parsed);
      } catch (err) {
        console.error('Summary failed:', err);
        setSummary(null);
        setNotice({ kind: 'error', text: 'The model returned an unreadable summary. Try again or switch to the other model.' });
      }
      setIsSummarizing(false);

      // Run action item extraction
      setIsExtractingActions(true);
      try {
        const actionMessages = buildActionItemMessages(chatText);
        const actionResult = await aiEngine.complete(actionMessages);
        const parsed: ActionItem[] = parseActionItems(actionResult);
        setActionItems(parsed);
        await db.saveActionItems(conv.id, parsed);
      } catch (err) {
        console.error('Action items failed:', err);
        setActionItems([]);
        setNotice({ kind: 'error', text: 'Could not extract action items from the model output.' });
      }
      setIsExtractingActions(false);
    },
    [prepareChatText],
  );

  // --- Run Priority Analysis (triggered when username changes) ---
  const runPriorityAnalysis = useCallback(
    async (conv: ParsedConversation, name: string) => {
      if (!name.trim()) return;
      if (!aiEngine.isReady()) {
        setPriorities(heuristicPriorities(conv, name));
        return;
      }

      setIsAnalyzingPriorities(true);
      try {
        const chatText = prepareChatText(conv);
        const priorityMessages = buildPriorityMessages(chatText, name);
        const result = await aiEngine.complete(priorityMessages);
        const parsed: PriorityData = parsePriorities(result);
        setPriorities(parsed);
      } catch (err) {
        console.error('Priority analysis failed:', err);
        setPriorities(null);
        setNotice({ kind: 'error', text: 'Could not analyse priorities. Try again.' });
      }
      setIsAnalyzingPriorities(false);
    },
    [prepareChatText],
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
      {/* Model Loader — always visible at top */}
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
