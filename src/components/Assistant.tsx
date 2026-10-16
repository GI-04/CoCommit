"use client";

// The floating Assistant of the Figma design, built on the @cocommit bot (POST /api/bot): it answers from the
// COCOMMIT/ files of the picked repo and shows its sources. The conversation lives in the provider, so it stays when
// you open another page. Without ANTHROPIC_API_KEY the server says it isn't set up and the window shows that.
import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/icons";
import type { BotAnswer } from "@/lib/bot";
import { askBot, BotRequestError } from "@/lib/bot-client";
import { getCurrentRepo } from "@/lib/current-repo";
import { signInHref } from "@/lib/github-client";

type Msg = { id: string; role: "user" | "assistant"; text: string; sources?: BotAnswer["sources"]; error?: boolean; needsLogin?: boolean };
type Size = "closed" | "open" | "minimised";

type Ctx = { size: Size; setSize: (s: Size) => void; toggle: () => void };
const AssistantContext = createContext<Ctx>({ size: "closed", setSize: () => {}, toggle: () => {} });
export const useAssistant = () => useContext(AssistantContext);

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [size, setSize] = useState<Size>("closed");
  const toggle = useCallback(() => setSize((s) => (s === "open" ? "closed" : "open")), []);
  return (
    <AssistantContext.Provider value={{ size, setSize, toggle }}>
      {children}
      <AssistantDock />
    </AssistantContext.Provider>
  );
}

const SUGGESTIONS = ["What's the team status?", "What did we decide lately?", "What changed today?"];

function AssistantDock() {
  const { size, setSize } = useAssistant();
  const [repo, setRepo] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [wide, setWide] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  // The repo is read after mount (it lives in this browser's storage) and again each time the window opens.
  useEffect(() => {
    if (size === "open") setRepo(getCurrentRepo());
  }, [size]);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    const target = repo ?? getCurrentRepo();
    setText("");
    setBusy(true);
    setMessages((m) => [...m, { id: crypto.randomUUID(), role: "user", text: q }]);
    try {
      const { answer, sources } = await askBot(target, q);
      setMessages((m) => [...m, { id: crypto.randomUUID(), role: "assistant", text: answer, sources }]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { id: crypto.randomUUID(), role: "assistant", text: e instanceof Error ? e.message : "The assistant couldn't answer.", error: true, needsLogin: e instanceof BotRequestError && e.status === 401 },
      ]);
    } finally {
      setBusy(false);
    }
  }

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
          <p className="truncate text-xs text-white/70">Using {repo ? `${repo}/COCOMMIT` : "the team files"}</p>
        </div>
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

      {size === "open" && (
        <>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
            {messages.length === 0 && (
              <div className="space-y-3 text-sm text-white/80">
                <p>Ask about your team&apos;s handoff, decisions or gotchas. I read the COCOMMIT/ files of {repo ?? "your repo"} and show where an answer came from.</p>
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
                  <div className={`max-w-[88%] rounded-2xl border border-black px-4 py-3 text-sm text-black ${m.error ? "bg-clay" : "bg-paper"}`}>
                    <p className="whitespace-pre-wrap break-words">{m.text}</p>
                    {m.needsLogin && (
                      <p className="mt-2">
                        <Link href={signInHref("/home")} className="font-medium underline">
                          Log in with GitHub
                        </Link>
                      </p>
                    )}
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
            {busy && <p className="text-xs text-white/70">Looking through COCOMMIT/…</p>}
            <div ref={end} />
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
              placeholder="Reply to Assistant…"
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
