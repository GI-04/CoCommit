"use client";

// The floating Assistant of the Figma design, built on the @cocommit bot (POST /api/bot): it reads the picked repo
// (code, team notes, PRs, issues) on the chosen branch and shows its sources. Settings (model, branch, don't-read list,
// own API key, debug) live in this browser (src/lib/bot-client.ts). The conversation lives in the provider, so it stays when
// you open another page. Without ANTHROPIC_API_KEY the server says it isn't set up and the window shows that.
import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/icons";
import { Markdown } from "@/components/Markdown";
import { MODELS, type BotAnswer, type BotDebug, type ChangeView } from "@/lib/bot";
import { applyChanges, askBot, BotRequestError, DEFAULT_SETTINGS, loadBotSettings, saveBotSettings, type BotSettings } from "@/lib/bot-client";
import { getCurrentRepo } from "@/lib/current-repo";
import { listBranches, signInHref } from "@/lib/github-client";

type Msg = { id: string; role: "user" | "assistant"; text: string; sources?: BotAnswer["sources"]; debug?: BotDebug; changes?: ChangeView[]; error?: boolean; needsLogin?: boolean };
type Size = "closed" | "open" | "minimised";

// `ask(question)` opens the window and asks it; the dock picks the queued question up (`pending`) when it is ready.
// `where` names the repo and branch the question is about, so the answer is about that and not the Assistant's own pick.
type Where = { repo?: string; branch?: string };
type Pending = { question: string; where?: Where };
type Ctx = { size: Size; setSize: (s: Size) => void; toggle: () => void; ask: (question: string, where?: Where) => void; pending: Pending | null; clearPending: () => void };
const AssistantContext = createContext<Ctx>({ size: "closed", setSize: () => {}, toggle: () => {}, ask: () => {}, pending: null, clearPending: () => {} });
export const useAssistant = () => useContext(AssistantContext);

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [size, setSize] = useState<Size>("closed");
  const toggle = useCallback(() => setSize((s) => (s === "open" ? "closed" : "open")), []);
  const [pending, setPending] = useState<Pending | null>(null);
  const ask = useCallback((question: string, where?: Where) => {
    setPending({ question, where });
    setSize("open");
  }, []);
  const clearPending = useCallback(() => setPending(null), []);
  return (
    <AssistantContext.Provider value={{ size, setSize, toggle, ask, pending, clearPending }}>
      {children}
      <AssistantDock />
    </AssistantContext.Provider>
  );
}

const SUGGESTIONS = ["Summarize this project", "What's the team status?", "Where is login handled?", "What are the open pull requests?"];

const modelLabel = (s: BotSettings) => (s.model === "custom" ? s.customModel || "custom model" : (MODELS.find((m) => m.id === s.model) ?? MODELS[0]).label);

function AssistantDock() {
  const { size, setSize, pending, clearPending } = useAssistant();
  const [repo, setRepo] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [wide, setWide] = useState(false);
  const [settings, setSettings] = useState<BotSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  // Edit mode: the latest staged changes (sent back with the next question) and the question that started them.
  const [staged, setStaged] = useState<ChangeView[]>([]);
  const [firstEditQuestion, setFirstEditQuestion] = useState("");
  const [sent, setSent] = useState<Record<string, { number: number; url: string; branch: string }>>({});
  const end = useRef<HTMLDivElement>(null);

  // Settings are read after mount (they live in this browser's storage).
  useEffect(() => setSettings(loadBotSettings()), []);
  const changeSettings = (next: BotSettings) => {
    setSettings(next);
    saveBotSettings(next);
  };

  // The repo is read after mount (it lives in this browser's storage) and again each time the window opens.
  useEffect(() => {
    if (size === "open") setRepo(getCurrentRepo());
  }, [size]);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  async function ask(question: string, where?: Where) {
    const q = question.trim();
    if (!q || busy) return;
    const target = where?.repo || repo || getCurrentRepo();
    const used = where?.branch ? { ...settings, branch: where.branch } : settings;
    if (!where) setText(""); // a question queued from another page doesn't wipe what is being typed
    setBusy(true);
    setMessages((m) => [...m, { id: crypto.randomUUID(), role: "user", text: q }]);
    try {
      const editing = settings.mode === "edit";
      const { answer, sources, debug, changes } = await askBot(target, q, [], used, editing ? staged : []);
      if (editing && changes) {
        if (!staged.length && changes.length) setFirstEditQuestion(q);
        setStaged(changes);
      }
      setMessages((m) => [...m, { id: crypto.randomUUID(), role: "assistant", text: answer, sources, debug, changes: editing ? changes : undefined }]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: e instanceof Error ? e.message : "The assistant couldn't answer.",
          error: true,
          needsLogin: e instanceof BotRequestError && e.status === 401,
          debug: e instanceof BotRequestError ? e.debug : undefined,
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  // A question queued by `ask()` from another page (e.g. "Ask Assistant" on a file) is asked once the window is open and free.
  const lastQueued = useRef({ key: "", at: 0 });
  useEffect(() => {
    if (!pending || size !== "open" || busy) return;
    clearPending();
    const key = `${pending.where?.repo ?? ""}\n${pending.where?.branch ?? ""}\n${pending.question}`;
    if (key === lastQueued.current.key && Date.now() - lastQueued.current.at < 5000) return; // a double click asks once
    lastQueued.current = { key, at: Date.now() };
    setShowSettings(false); // the chat must be showing, or nothing seems to happen
    void ask(pending.question, pending.where);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, size, busy]);
  // A question still waiting when the window is closed is dropped, not asked later.
  useEffect(() => {
    if (size === "closed") clearPending();
  }, [size, clearPending]);

  // Closed: nothing floats on the page. The Assistant item in the navigation (and Context's "Ask assistant") opens it.
  if (size === "closed") return null;

  const box = wide ? "md:w-[34rem] md:h-[min(46rem,85dvh)]" : "md:w-[24rem] md:h-[min(33rem,80dvh)]";
  return (
    <section
      role="dialog"
      aria-label="Assistant"
      className={`pop fixed inset-x-3 bottom-3 z-50 flex flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#333] text-white shadow-[0_8px_32px_rgba(0,0,0,0.5)] md:inset-x-auto md:bottom-6 md:right-6 ${size === "minimised" ? "h-auto md:w-[24rem]" : `h-[75dvh] ${box}`}`}
    >
      <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--blue)]">
          <Icon name="sparkle" className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold leading-5">Assistant</h2>
          <p className="truncate text-xs text-white/70">
            {repo ?? "your repo"} · {settings.branch || "default branch"} · {modelLabel(settings)}
            {settings.apiKey ? " · your key" : ""}
            {settings.debug ? " · debug" : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowSettings((v) => !v);
            if (size === "minimised") setSize("open");
          }}
          aria-label={showSettings ? "Close Assistant settings" : "Assistant settings"}
          aria-pressed={showSettings}
          className={`grid size-8 place-items-center rounded-full hover:bg-white/25 ${showSettings ? "bg-white/30" : "bg-white/15"}`}
        >
          <Icon name="sliders" className="size-4" />
        </button>
        <button type="button" onClick={() => setWide((w) => !w)} aria-label={wide ? "Make the Assistant smaller" : "Make the Assistant larger"} className="hidden size-8 place-items-center rounded-full bg-white/15 hover:bg-white/25 md:grid">
          <Icon name="expand" className="size-4" />
        </button>
        <button type="button" onClick={() => setSize(size === "minimised" ? "open" : "minimised")} aria-label={size === "minimised" ? "Show the Assistant" : "Minimise the Assistant"} className="grid size-8 place-items-center rounded-full bg-white/15 hover:bg-white/25">
          <Icon name="minus" className="size-4" />
        </button>
        <button type="button" onClick={() => setSize("closed")} aria-label="Close the Assistant" className="grid size-8 place-items-center rounded-full bg-white/15 hover:bg-white/25">
          <Icon name="close" className="size-4" />
        </button>
      </header>

      {size === "open" && showSettings && <SettingsPanel repo={repo} settings={settings} onChange={changeSettings} onClose={() => setShowSettings(false)} />}

      {size === "open" && !showSettings && (
        <>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
            {messages.length === 0 && (
              <div className="space-y-3 text-sm text-white/80">
                <p>
                  Ask about {repo ?? "your repo"}: the code, the team notes in COCOMMIT/, pull requests and issues. I say where an answer came from (file and line).
                  Model, branch and what not to read are in settings.
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} type="button" onClick={() => void ask(s)} className="rounded-full border border-white/25 px-3 py-1.5 text-xs hover:bg-white/15">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m) =>
              m.role === "user" ? (
                <p key={m.id} className="ml-auto w-fit max-w-[85%] whitespace-pre-wrap break-words rounded-2xl border border-black bg-cyan px-4 py-2.5 text-sm text-black">
                  {m.text}
                </p>
              ) : (
                <div key={m.id} className="flex items-start gap-2">
                  <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-[var(--blue)]">
                    <Icon name="sparkle" className="size-3.5" />
                  </span>
                  <div className={`min-w-0 max-w-[88%] rounded-2xl border border-black px-4 py-3 text-sm text-black ${m.error ? "bg-clay" : "bg-paper"}`}>
                    {/* Answers are Markdown (lists, bold, code); error messages are our own plain text. */}
                    {m.error ? <p className="whitespace-pre-wrap break-words">{m.text}</p> : <Markdown source={m.text} variant="reply" />}
                    {m.needsLogin && (
                      <p className="mt-2">
                        <Link href={signInHref("/home")} className="font-medium underline">
                          Log in with GitHub
                        </Link>
                      </p>
                    )}
                    {m.debug && <DebugView debug={m.debug} />}
                    {sent[m.id] && (
                      <p className="mt-3 rounded-lg border border-black/20 bg-added/15 px-3 py-2 text-xs">
                        Pull request{" "}
                        <a href={sent[m.id].url} target="_blank" rel="noreferrer" className="font-semibold underline">
                          #{sent[m.id].number}
                        </a>{" "}
                        opened from <code>{sent[m.id].branch}</code>. Review it on GitHub before merging.
                      </p>
                    )}
                    {!!m.changes?.length && m.changes === staged && !sent[m.id] && (
                      <ChangeCard
                        changes={m.changes}
                        defaultTitle={firstEditQuestion || "Changes from the Assistant"}
                        onApply={async (title, picked) => {
                          const done = await applyChanges(repo ?? getCurrentRepo(), settings.branch, title, picked, settings);
                          setSent((now) => ({ ...now, [m.id]: { number: done.pr.number, url: done.pr.url, branch: done.branch } }));
                          setStaged([]);
                          setFirstEditQuestion("");
                        }}
                        onDiscard={() => {
                          setStaged([]);
                          setFirstEditQuestion("");
                        }}
                      />
                    )}
                    {!!m.changes?.length && m.changes !== staged && !sent[m.id] && <p className="mt-2 text-xs text-black/60">{m.changes.length} changed file(s): replaced by a newer version below, sent, or discarded.</p>}
                    {!!m.sources?.length && (
                      <ul className="mt-2 space-y-0.5 text-xs">
                        {m.sources.map((s) => (
                          <li key={s.path}>
                            <a href={s.url} target="_blank" rel="noreferrer" className="underline">
                              {s.path}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ),
            )}
            {busy && <p className="text-xs text-white/70">{settings.mode === "edit" ? "Working on the changes" : "Reading the repo"} with {modelLabel(settings)}…</p>}
            <div ref={end} />
          </div>
          <div className="flex items-center gap-2 px-4 pb-2 text-xs" role="group" aria-label="Assistant mode">
            {(["ask", "edit"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={settings.mode === mode}
                onClick={() => changeSettings({ ...settings, mode })}
                className={`rounded-full px-3 py-1 ${settings.mode === mode ? "bg-white text-black" : "bg-white/15 hover:bg-white/25"}`}
              >
                {mode === "ask" ? "Ask" : "Edit"}
              </button>
            ))}
            <span className="min-w-0 truncate text-white/60">
              {settings.mode === "edit" ? (staged.length ? `${staged.length} staged change(s) · nothing is saved until you create a PR` : "Changes are staged; you review them, then a PR is made") : "Read-only"}
            </span>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void ask(text);
            }}
            className="flex items-center gap-2 px-4 pb-4"
          >
            <label htmlFor="assistant-input" className="sr-only">
              Ask the Assistant
            </label>
            <input
              id="assistant-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={settings.mode === "edit" ? "Describe the change…" : "Reply to Assistant…"}
              className="min-w-0 flex-1 rounded-full bg-white/15 px-5 py-3 text-sm text-white placeholder:text-white/60"
            />
            <button type="submit" disabled={!text.trim() || busy} aria-label="Send" className="grid size-11 shrink-0 place-items-center rounded-full bg-[var(--blue)] text-white hover:opacity-90 disabled:opacity-50">
              <Icon name="send" className="size-5" />
            </button>
          </form>
        </>
      )}
    </section>
  );
}

const field = "w-full rounded-xl bg-white/15 px-3 py-2 text-sm text-white placeholder:text-white/50";

function SettingsPanel({ repo, settings, onChange, onClose }: { repo: string | null; settings: BotSettings; onChange: (s: BotSettings) => void; onClose: () => void }) {
  const [branches, setBranches] = useState<string[] | null>(null);
  const set = <K extends keyof BotSettings>(key: K, value: BotSettings[K]) => onChange({ ...settings, [key]: value });

  useEffect(() => {
    if (!repo) return;
    listBranches(repo)
      .then(setBranches)
      .catch(() => setBranches([]));
  }, [repo]);

  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 text-sm">
      <fieldset className="space-y-2">
        <legend className="mb-1 font-semibold">Model</legend>
        <div className="grid grid-cols-2 gap-2">
          {[...MODELS, { id: "custom" as const, label: "Custom", note: "type a model ID" }].map((m) => (
            <label key={m.id} className={`cursor-pointer rounded-xl border px-3 py-2 ${settings.model === m.id ? "border-[var(--blue)] bg-white/20" : "border-white/20"}`}>
              <input type="radio" name="bot-model" value={m.id} checked={settings.model === m.id} onChange={() => set("model", m.id)} className="sr-only" />
              <span className="block font-medium">{m.label}</span>
              <span className="block text-xs text-white/70">{m.note}</span>
            </label>
          ))}
        </div>
        {settings.model === "custom" && (
          <input aria-label="Custom model ID" value={settings.customModel} onChange={(e) => set("customModel", e.target.value.trim())} placeholder="e.g. claude-sonnet-5" className={field} />
        )}
      </fieldset>

      <label className="block space-y-1">
        <span className="font-semibold">Branch</span>
        <select value={settings.branch} onChange={(e) => set("branch", e.target.value)} className={`${field} appearance-auto`}>
          <option value="">Default branch</option>
          {settings.branch && !branches?.includes(settings.branch) && <option value={settings.branch}>{settings.branch}</option>}
          {(branches ?? []).map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        {branches === null && repo && <span className="text-xs text-white/60">Loading branches…</span>}
      </label>

      <label className="block space-y-1">
        <span className="font-semibold">Don&apos;t read</span>
        <span className="block text-xs text-white/70">One per line. Everything else in the repo can be read. Examples: src-tauri/ · *.lock · notes/private.md</span>
        <textarea value={settings.exclude} onChange={(e) => set("exclude", e.target.value)} rows={3} placeholder="folder/&#10;*.lock" className={`${field} font-mono text-xs`} />
      </label>

      <fieldset className="space-y-2">
        <legend className="mb-1 font-semibold">Your own API key (optional)</legend>
        <p className="text-xs text-white/70">Used instead of the team&apos;s key, for your questions only. Sent with each question; the server doesn&apos;t keep it.</p>
        <input type="password" autoComplete="off" aria-label="API key" value={settings.apiKey} onChange={(e) => set("apiKey", e.target.value.trim())} placeholder="sk-ant-… (or your provider's key)" className={field} />
        {settings.apiKey && (
          <>
            {settings.apiFormat !== "openai" && (
              <input aria-label="Workspace ID (only for keys without a workspace)" value={settings.workspaceId} onChange={(e) => set("workspaceId", e.target.value.trim())} placeholder="Workspace ID, only if your key needs one (wrkspc_…)" className={field} />
            )}
            <label className="block space-y-1 text-xs">
              <span>API format</span>
              <select aria-label="API format" value={settings.apiFormat} onChange={(e) => set("apiFormat", e.target.value === "openai" ? "openai" : "anthropic")} className={field}>
                <option value="anthropic">Anthropic (Claude)</option>
                <option value="openai">OpenAI-compatible (Gemini, OpenRouter, Groq…)</option>
              </select>
            </label>
            <input
              aria-label={settings.apiFormat === "openai" ? "API URL" : "API URL (optional)"}
              value={settings.apiUrl}
              onChange={(e) => set("apiUrl", e.target.value.trim())}
              placeholder={settings.apiFormat === "openai" ? "API URL (https://…)" : "API URL, empty = Anthropic (https://…)"}
              className={field}
            />
            {settings.apiFormat === "openai" && (
              <p className="text-xs text-white/70">
                Gemini: <span className="font-mono break-all">https://generativelanguage.googleapis.com/v1beta/openai</span> with a key from Google AI Studio. Pick <b>Custom</b> above and type the model ID (e.g. gemini-2.5-flash).
                {settings.model !== "custom" && <span className="block text-amber-200">Pick Custom above: Fast / Balanced / Best are Claude models.</span>}
              </p>
            )}
            {settings.apiUrl && <p className="text-xs text-amber-200">Your questions, the repo&apos;s code and your key will go to this URL.</p>}
            <label className="flex items-start gap-2 text-xs">
              <input type="checkbox" checked={settings.rememberKey} onChange={(e) => set("rememberKey", e.target.checked)} className="mt-0.5" />
              <span>Remember on this device. Otherwise it&apos;s forgotten when this tab closes. Anyone using this browser could use it.</span>
            </label>
          </>
        )}
      </fieldset>

      <label className="flex items-center gap-2">
        <input type="checkbox" checked={settings.debug} onChange={(e) => set("debug", e.target.checked)} />
        <span>
          <span className="font-semibold">Debug mode</span> <span className="text-xs text-white/70">shows tool calls, tokens and timing under each answer</span>
        </span>
      </label>

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onClose} className="rounded-full bg-[var(--blue)] px-4 py-2 font-medium hover:opacity-90">
          Done
        </button>
        <button type="button" onClick={() => onChange({ ...DEFAULT_SETTINGS })} className="rounded-full border border-white/25 px-4 py-2 hover:bg-white/15">
          Reset
        </button>
      </div>
    </div>
  );
}

function DebugView({ debug }: { debug: BotDebug }) {
  const total = debug.rounds.reduce(
    (t, r) => ({ input: t.input + r.usage.input, output: t.output + r.usage.output, cacheRead: t.cacheRead + r.usage.cacheRead, cacheWrite: t.cacheWrite + r.usage.cacheWrite }),
    { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  );
  return (
    <details className="mt-2 rounded-lg border border-black/20 bg-black/5 px-2 py-1 text-xs">
      <summary className="cursor-pointer select-none font-medium">
        Debug · {debug.model} · {debug.rounds.length} rounds · {(debug.totalMs / 1000).toFixed(1)} s · {total.input + total.cacheRead + total.cacheWrite} in / {total.output} out tokens
      </summary>
      <div className="mt-1 space-y-2 font-mono text-[11px] leading-4">
        <p>
          branch {debug.branch || "?"} · repo: {debug.snapshot || "not loaded"} · cache read {total.cacheRead}, write {total.cacheWrite}
        </p>
        {debug.error && <p className="text-red-700">error: {debug.error}</p>}
        {debug.rounds.map((r) => (
          <div key={r.round}>
            <p className="font-semibold">
              round {r.round} · {(r.ms / 1000).toFixed(1)} s · stop {r.stop ?? "?"} · in {r.usage.input} (+{r.usage.cacheRead} cached, +{r.usage.cacheWrite} written) · out {r.usage.output}
            </p>
            {r.tools.map((t, i) => (
              <div key={i} className="ml-2 border-l border-black/20 pl-2">
                <p className={t.error ? "text-red-700" : ""}>
                  {t.name}({JSON.stringify(t.input)}) · {t.ms} ms
                </p>
                <p className="whitespace-pre-wrap break-words text-black/60">{t.result}</p>
              </div>
            ))}
          </div>
        ))}
      </div>
    </details>
  );
}

function ChangeCard({
  changes,
  defaultTitle,
  onApply,
  onDiscard,
}: {
  changes: ChangeView[];
  defaultTitle: string;
  onApply: (title: string, picked: ChangeView[]) => Promise<void>;
  onDiscard: () => void;
}) {
  const [picked, setPicked] = useState(() => new Set(changes.map((c) => c.path)));
  const [title, setTitle] = useState(defaultTitle.slice(0, 100));
  const [state, setState] = useState<{ busy?: boolean; error?: string }>({});
  const chosen = changes.filter((c) => picked.has(c.path));

  return (
    <div className="mt-3 space-y-2 rounded-lg border border-black/20 bg-black/5 p-2 text-xs">
      <p className="font-semibold">
        Staged changes · {changes.length} file{changes.length === 1 ? "" : "s"} · not saved yet
      </p>
      <ul className="space-y-1">
        {changes.map((c) => (
          <li key={c.path}>
            <details>
              <summary className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  aria-label={`Include ${c.path}`}
                  checked={picked.has(c.path)}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) =>
                    setPicked((now) => {
                      const next = new Set(now);
                      if (e.target.checked) next.add(c.path);
                      else next.delete(c.path);
                      return next;
                    })
                  }
                />
                <span className="min-w-0 flex-1 truncate font-mono">{c.path}</span>
                <span className="shrink-0 text-black/60">{c.status}</span>
                <span className="shrink-0 font-mono text-added">+{c.additions}</span>
                <span className="shrink-0 font-mono text-removed">-{c.deletions}</span>
              </summary>
              <pre className="mt-1 max-h-64 overflow-auto rounded bg-white/70 p-1 font-mono text-[11px] leading-4">
                {c.diff.map((l, i) => (
                  <div key={i} className={l.kind === "+" ? "bg-added/20" : l.kind === "-" ? "bg-removed/20" : l.kind === "…" ? "text-black/40" : ""}>
                    {l.kind === "…" ? "  …" : `${l.kind} ${l.text}`}
                  </div>
                ))}
              </pre>
            </details>
          </li>
        ))}
      </ul>
      <label className="block">
        <span className="sr-only">Pull request title</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Pull request title" maxLength={120} className="w-full rounded border border-black/20 bg-white px-2 py-1" />
      </label>
      {state.error && <p className="text-removed">{state.error}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={state.busy || !chosen.length || !title.trim()}
          onClick={async () => {
            setState({ busy: true });
            try {
              await onApply(title.trim(), chosen); // the parent swaps this card for the PR link
            } catch (e) {
              setState({ error: e instanceof Error ? e.message : "Couldn't create the pull request." });
            }
          }}
          className="rounded-full bg-[var(--blue)] px-3 py-1.5 font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {state.busy ? "Creating…" : `Create pull request (${chosen.length})`}
        </button>
        <button type="button" disabled={state.busy} onClick={onDiscard} className="rounded-full border border-black/30 px-3 py-1.5 hover:bg-black/10">
          Discard
        </button>
      </div>
      <p className="text-black/60">Makes one commit on a new branch and opens a PR. Your current branch isn&apos;t changed.</p>
    </div>
  );
}
