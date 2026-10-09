import { useState, useCallback, useEffect, useMemo } from 'react';
import { LogOut, Trash2, Wand2 } from 'lucide-react';
import { Layout } from './components/Layout';
import { ChatImport } from './components/ChatImport';
import { EnginePicker, type LoadingProgress } from './components/EnginePicker';
import type { Engine } from './ai/run';
import { PrivacyBadge } from './components/PrivacyBadge';
import { SummaryView } from './components/SummaryView';
import { ActionItems } from './components/ActionItems';
import { PriorityFilter } from './components/PriorityFilter';
import { ConversationHistory } from './components/ConversationHistory';
import { GoogleButton } from './auth/GoogleButton';
import { useAuth } from './auth/useAuth';
import { parseChat } from './parsers';
import { aiEngine, type ModelId } from './ai/engine';
import { prepareChat, resolveEngine, runTask } from './ai/run';
import { db, type StoredConversation } from './db';
import type { ParsedConversation, Message } from './parsers/types';
import { SAMPLE_CHAT } from './sampleChat';
import { isCloudAvailable } from './ai/cloud';
import {
  deleteAllCloud, deleteCloud, fetchCloud, listCloud, pushCloud, type CloudListItem,
} from './cloudSync';
import type { SummaryData, ActionItemData as ActionItem, PriorityData } from './ai/json';

/**
 * Root application component.
 * Lifecycle: choose engine → import chat → analysis → results (+ optional account sync).
 */
export default function App() {
  const auth = useAuth();
  const { config, user } = auth;
  const syncEnabled = Boolean(user) && config.cloudSync;

  // --- Engine: rule-based (default, on-device) | cloud AI (OpenRouter / DeepSeek / Gemini) | on-device WebLLM model ---
  const [engine, setEngine] = useState<Engine>('rules');
  const [localModel, setLocalModel] = useState<string | null>(null);
  const [modelProgress, setModelProgress] = useState<LoadingProgress>({
    stage: 'ready', // idle until the user picks an on-device model
    progress: 0,
    message: '',
  });
  const [cloudUsable, setCloudUsable] = useState(false);

  // --- Conversation State ---
  const [conversations, setConversations] = useState<StoredConversation[]>([]);
  const [cloudList, setCloudList] = useState<CloudListItem[]>([]);
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

  // Show the first failure reason; later steps of the same run must not overwrite it.
  const keepFirstError = useCallback(
    (text: string) => text && setNotice((n) => (n?.kind === 'error' ? n : { kind: 'error', text })),
    [],
  );

  const cloudLabel = config.cloudLabel ?? 'cloud AI';

  // --- Local history on mount ---
  useEffect(() => {
    db.getAllConversations().then(setConversations).catch(console.error);
  }, []);

  // --- Cloud AI availability follows sign-in state ---
  useEffect(() => {
    isCloudAvailable().then((ok) => {
      setCloudUsable(ok);
      if (!ok) setEngine((e) => (e === 'cloud' ? 'rules' : e));
    });
  }, [user]);

  // --- Account history follows sign-in state ---
  const refreshCloudList = useCallback(async () => {
    if (!syncEnabled) {
      setCloudList([]);
      return;
    }
    try {
      setCloudList(await listCloud());
    } catch {
      setNotice({ kind: 'error', text: 'Could not load your synced chats. Showing this device only.' });
    }
  }, [syncEnabled]);
  useEffect(() => {
    refreshCloudList();
  }, [refreshCloudList]);

  // --- On-device model loading ---
  const handleSelectLocal = useCallback(async (modelId: string) => {
    setLocalModel(modelId);
    setEngine('local');
    try {
      await aiEngine.loadModel(modelId as ModelId, setModelProgress);
    } catch (err) {
      console.error('Failed to load model:', err);
      setModelProgress({
        stage: 'error',
        progress: 0,
        message: `Failed to load model: ${err instanceof Error ? err.message : 'Unknown error'}`,
      });
      setEngine('rules');
    }
  }, []);

  // --- Run the summary and action-item tasks; returns the results so callers can sync them ---
  const runAnalysis = useCallback(
    async (conv: ParsedConversation) => {
      const chat = prepareChat(conv);
      if (resolveEngine(engine) === 'rules') {
        setNotice({ kind: 'info', text: 'Quick analysis (rule-based, on-device). Pick cloud AI or an on-device model in the top bar for AI-written summaries.' });
      } else if (chat.truncated) {
        setNotice({ kind: 'info', text: 'Chat is long: analysis used the most recent messages only.' });
      }

      setIsSummarizing(true);
      setIsExtractingActions(true);
      const summaryTask = () => runTask('summary', engine, conv, chat.text);
      const actionsTask = () => runTask('actions', engine, conv, chat.text);
      // Cloud requests are independent, so run them together; an on-device model handles one at a time.
      const [s, a] =
        engine === 'cloud' ? await Promise.all([summaryTask(), actionsTask()]) : [await summaryTask(), await actionsTask()];
      setSummary(s.value);
      setActionItems(a.value);
      setIsSummarizing(false);
      setIsExtractingActions(false);
      keepFirstError(s.error ?? a.error ?? '');
      await Promise.all([db.saveSummary(conv.id, s.value), db.saveActionItems(conv.id, a.value)]);

      return { s: s.value, a: a.value };
    },
    [engine, keepFirstError],
  );

  // --- Priority analysis (triggered when the user enters their name) ---
  const runPriorityAnalysis = useCallback(
    async (conv: ParsedConversation, name: string) => {
      if (!name.trim()) return;
      setIsAnalyzingPriorities(true);
      const { value, error } = await runTask('priorities', engine, conv, prepareChat(conv).text, name);
      setPriorities(value);
      setIsAnalyzingPriorities(false);
      if (error) keepFirstError(error);
    },
    [engine, keepFirstError],
  );

  // --- Push one conversation + results to the user's account (only when signed in) ---
  const syncConversation = useCallback(
    async (conv: ParsedConversation, s: SummaryData | null, a: ActionItem[]) => {
      if (!syncEnabled) return;
      try {
        await pushCloud(conv, s, a);
        await refreshCloudList();
      } catch {
        setNotice({ kind: 'error', text: 'Saved on this device, but syncing to your account failed.' });
      }
    },
    [syncEnabled, refreshCloudList],
  );

  // --- Chat import ---
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

        const convId = await db.saveConversation(conv);
        setActiveConvId(convId);
        setConversations(await db.getAllConversations());
        setIsProcessing(false);

        const { s, a } = await runAnalysis(conv);
        await syncConversation(conv, s, a);
      } catch (err) {
        console.error('Import failed:', err);
        setNotice({ kind: 'error', text: 'Import failed. Check the file format and try again.' });
        setIsProcessing(false);
      }
    },
    [runAnalysis, syncConversation],
  );

  const resetView = useCallback(() => {
    setActiveConversation(null);
    setActiveConvId(null);
    setSummary(null);
    setActionItems([]);
    setPriorities(null);
    setNotice(null);
  }, []);

  // --- Open a past conversation (downloads it from the account first if it only exists there) ---
  const handleSelectConversation = useCallback(
    async (id: string) => {
      try {
        let conv = await db.getConversation(id);
        if (!conv && syncEnabled) {
          const c = await fetchCloud(id);
          const messages: Message[] = c.messages.map((m, i) => ({
            id: `${id}:${i}`,
            sender: m.sender,
            content: m.content,
            timestamp: new Date(m.timestamp),
            platform: c.platform,
          }));
          const restored: ParsedConversation = {
            id,
            name: c.name,
            platform: c.platform,
            messages,
            participants: [...new Set(messages.map((m) => m.sender))],
            startDate: new Date(c.startDate),
            endDate: new Date(c.endDate),
            messageCount: messages.length,
          };
          await db.saveConversation(restored);
          if (c.summary) await db.saveSummary(id, c.summary as SummaryData);
          if (Array.isArray(c.actions)) await db.saveActionItems(id, c.actions as ActionItem[]);
          setConversations(await db.getAllConversations());
          conv = await db.getConversation(id);
        }
        if (!conv) return;

        setActiveConvId(id);
        setNotice(null);
        const messages = (await db.getMessages(id)).map(({ conversationId: _c, ...m }) => m);
        setActiveConversation({
          id: conv.id,
          name: conv.name,
          platform: conv.platform,
          messages,
          participants: conv.participants,
          startDate: conv.startDate,
          endDate: conv.endDate,
          messageCount: conv.messageCount,
        });
        setSummary((await db.getSummary(id)) ?? null);
        setActionItems(await db.getActionItems(id));
        setPriorities(null);
      } catch (err) {
        console.error('Failed to load conversation:', err);
        setNotice({ kind: 'error', text: 'Could not open that conversation.' });
      }
    },
    [syncEnabled],
  );

  // --- Delete one conversation (device + account) ---
  const handleDeleteConversation = useCallback(
    async (id: string) => {
      try {
        await db.deleteConversation(id);
        if (syncEnabled) await deleteCloud(id).then(refreshCloudList);
        setConversations(await db.getAllConversations());
        if (id === activeConvId) resetView();
      } catch (err) {
        console.error('Failed to delete conversation:', err);
      }
    },
    [activeConvId, syncEnabled, refreshCloudList, resetView],
  );

  // --- Delete everything (device + account) ---
  const handleClearAll = useCallback(async () => {
    const where = syncEnabled ? 'this device and your account' : 'this device';
    if (!window.confirm(`Delete all saved conversations and results from ${where}?`)) return;
    await db.clearAll();
    if (syncEnabled) await deleteAllCloud().catch(() => undefined);
    setConversations([]);
    setCloudList([]);
    resetView();
  }, [syncEnabled, resetView]);

  const handleUsernameChange = useCallback(
    (name: string) => {
      setUsername(name);
      if (activeConversation && name.trim()) runPriorityAnalysis(activeConversation, name);
    },
    [activeConversation, runPriorityAnalysis],
  );

  // --- History list = this device + account-only chats ---
  const historyItems = useMemo(() => {
    const cloudIds = new Set(cloudList.map((c) => c.id));
    const local = conversations.map((c) => ({
      id: c.id,
      name: c.name,
      platform: c.platform,
      messageCount: c.messageCount,
      createdAt: new Date(c.createdAt),
      inCloud: cloudIds.has(c.id),
    }));
    const localIds = new Set(local.map((c) => c.id));
    const remote = cloudList
      .filter((c) => !localIds.has(c.id))
      .map((c) => ({
        id: c.id, name: c.name, platform: c.platform, messageCount: c.messageCount,
        createdAt: new Date(c.createdAt), inCloud: true,
      }));
    return [...local, ...remote].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [conversations, cloudList]);

  const privacyNote =
    engine === 'cloud'
      ? `Cloud AI is on: chat text is sent to ${cloudLabel} for analysis.`
      : syncEnabled
        ? 'Analysis runs on this device. Your chats and results sync to your signed-in account.'
        : 'Analysis runs on this device. Nothing is uploaded.';

  const nav = (
    <button
      onClick={() => handleImport(SAMPLE_CHAT, 'Sample Chat')}
      disabled={isProcessing}
      className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-orange-500/60"
    >
      <Wand2 className="w-4 h-4 text-zinc-500" aria-hidden="true" /> Try a sample chat
    </button>
  );

  const account = (
    <div className="space-y-2">
      {config.googleClientId &&
        (user ? (
          <div className="flex items-center gap-2.5 rounded-xl bg-zinc-800/60 px-2.5 py-2">
            {user.picture ? (
              <img src={user.picture} alt="" referrerPolicy="no-referrer" className="w-8 h-8 rounded-full" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-orange-500 text-zinc-950 grid place-items-center text-sm font-semibold">
                {(user.name || user.email).charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-[11px] text-zinc-500 truncate">{user.email}</p>
            </div>
            <button
              onClick={auth.signOut}
              aria-label="Sign out"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-500/60"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div>
            <GoogleButton clientId={config.googleClientId} onCredential={auth.signInWithCredential} />
            <p className="mt-2 text-[11px] leading-snug text-zinc-500">
              Sign in to sync chats across devices{config.cloudAi ? ' and use cloud AI' : ''}. Optional.
            </p>
            {auth.error && <p role="alert" className="mt-1 text-xs text-red-300">{auth.error}</p>}
          </div>
        ))}
      {(conversations.length > 0 || cloudList.length > 0) && (
        <button
          type="button"
          onClick={handleClearAll}
          className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-zinc-400 hover:text-red-300 hover:bg-red-500/10 focus:outline-none focus:ring-2 focus:ring-red-500/50"
        >
          <Trash2 className="w-4 h-4" aria-hidden="true" /> Delete all my data
        </button>
      )}
    </div>
  );

  return (
    <Layout
      onNewChat={resetView}
      nav={nav}
      history={
        <ConversationHistory
          conversations={historyItems}
          activeId={activeConvId}
          onSelect={handleSelectConversation}
          onDelete={handleDeleteConversation}
        />
      }
      account={account}
      topLeft={
        <EnginePicker
          engine={engine}
          localModel={localModel}
          progress={modelProgress}
          cloudConfigured={config.cloudAi}
          cloudLabel={cloudLabel}
          cloudUsable={cloudUsable}
          onSelectRules={() => setEngine('rules')}
          onSelectCloud={() => setEngine('cloud')}
          onSelectLocal={handleSelectLocal}
        />
      }
      topRight={<PrivacyBadge cloudAi={engine === 'cloud'} cloudLabel={cloudLabel} synced={syncEnabled} />}
    >
      {notice && (
        <div
          role={notice.kind === 'error' ? 'alert' : 'status'}
          className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
            notice.kind === 'error'
              ? 'border-red-500/40 bg-red-500/10 text-red-200'
              : 'border-zinc-700 bg-zinc-800/60 text-zinc-300'
          }`}
        >
          {notice.text}
        </div>
      )}

      {!activeConversation && (
        <ChatImport onImport={handleImport} isProcessing={isProcessing} privacyNote={privacyNote} />
      )}

      {activeConversation && (
        <div className="space-y-5 animate-fade-in">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-800/30 p-5">
            <h2 className="text-xl font-semibold text-zinc-50">{activeConversation.name}</h2>
            <p className="text-sm text-zinc-400 mt-1">
              {activeConversation.participants.length < 2 ? (
                `Pasted text · ${activeConversation.messages[0]?.content.split('\n').length ?? 0} lines`
              ) : (
                <>
                  {activeConversation.messageCount} messages · {activeConversation.participants.length} participants ·{' '}
                  <span className="capitalize">{activeConversation.platform}</span>
                </>
              )}
            </p>
          </div>

          <SummaryView summary={summary} isLoading={isSummarizing} />
          <ActionItems items={actionItems} isLoading={isExtractingActions} />
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
