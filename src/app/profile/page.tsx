"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/icons";
import { ProfileOverview } from "@/components/profile/Overview";
import { Button, Card, PageHeader, Tabs, buttonClass } from "@/components/ui";
import { MIN_PASSWORD_LENGTH, signOut } from "@/lib/auth-email";
import { changeEmail, changePassword, loadAccounts, saveProfile, type AccountProfile, type Accounts } from "@/lib/profile";
import { getSupabase } from "@/lib/supabase";

type Notice = { kind: "success" | "error"; text: string };
const input = "mt-1 w-full rounded-md border border-line bg-bg px-3 py-2 text-sm disabled:opacity-60";
const errorText = (e: unknown) => e instanceof Error ? e.message : "Something went wrong. Try again.";

function Feedback({ notice }: { notice: Notice | null }) {
  return notice && <p role={notice.kind === "error" ? "alert" : "status"} className={`rounded-md border p-3 text-sm ${notice.kind === "error" ? "border-removed/40 bg-removed/10 text-removed" : "border-added/40 bg-added/10"}`}>{notice.text}</p>;
}

export default function ProfilePage() {
  const [accounts, setAccounts] = useState<Accounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [tab, setTab] = useState<"overview" | "account">("overview");
  const accountId = useRef<string | null>(null);
  const loadVersion = useRef(0);
  const load = useCallback(async () => {
    const version = ++loadVersion.current;
    setLoading(true);
    try {
      const next = await loadAccounts();
      if (version !== loadVersion.current) return;
      accountId.current = next.profile?.id ?? null;
      setAccounts(next);
    }
    catch (e) { if (version === loadVersion.current) setNotice({ kind: "error", text: errorText(e) }); }
    finally { if (version === loadVersion.current) setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    let stopped = false;
    const sub = getSupabase()?.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || (event === "SIGNED_IN" && session?.user.id !== accountId.current)) {
        setTimeout(() => { if (!stopped) void load(); }, 0);
      }
    });
    return () => { stopped = true; sub?.data.subscription.unsubscribe(); };
  }, [load]);

  const updateProfile = (profile: AccountProfile) => setAccounts((old) => old && { ...old, profile });
  const profile = accounts?.profile;
  const github = accounts?.github;
  const name = profile?.name || github?.name || github?.login || "Your profile";

  const signedIn = !loading && !!(profile || github);
  const signOutNow = async () => {
    setSigningOut(true);
    try {
      const result = await signOut();
      if (result.error) throw new Error(result.error);
      location.assign("/login");
    } catch (e) {
      setNotice({ kind: "error", text: errorText(e) });
      setSigningOut(false);
    }
  };

  return (
    <div className="max-w-6xl space-y-5">
      <PageHeader title="Profile" subtitle={signedIn ? undefined : "Your account, your details, your space on CoCommit."}>
        {signedIn ? (
          <>
            <Tabs
              label="Profile"
              value={tab}
              onChange={(id) => setTab(id as "overview" | "account")}
              tabs={[
                { id: "overview", label: "Overview" },
                { id: "account", label: "Account" },
              ]}
            />
            <Button variant="glass" disabled={signingOut} onClick={signOutNow} className="flex items-center gap-2 py-3">
              <Icon name="logout" className="size-4" /> {signingOut ? "Signing out…" : "Sign out"}
            </Button>
          </>
        ) : null}
      </PageHeader>
      <Feedback notice={notice} />
      {loading ? (
        <Card><p role="status" className="animate-pulse text-sm text-muted">Loading your account…</p></Card>
      ) : (
        <>
          {!!accounts?.warnings.length && <Card>
            {accounts.warnings.map((warning) => <p key={warning} role="alert" className="text-sm text-removed">{warning}</p>)}
            <Button variant="ghost" className="mt-3" onClick={load}>Try again</Button>
          </Card>}
          {!profile && !github ? (
            <Card title="Make yourself at home">
              <p className="mb-4 text-sm text-muted">Log in to view your profile and manage your account details.</p>
              <Link href="/login?returnTo=/profile" className={buttonClass("primary", "inline-block")}>Log in to your account</Link>
            </Card>
          ) : tab === "overview" ? (
            <ProfileOverview name={name} profile={profile} github={github} onEdit={() => setTab("account")} />
          ) : (
            <div className="grid items-start gap-5 lg:grid-cols-[1fr_22rem]">
              <div className="min-w-0 space-y-5">
                {profile ? <ProfileForm key={profile.id} profile={profile} onSaved={updateProfile} /> : (
                  <Card title="Profile details">
                    <p className="text-sm text-muted">Your name and photo come from GitHub. You can edit them in your GitHub profile settings.</p>
                    <a href="https://github.com/settings/profile" target="_blank" rel="noreferrer" className="mt-4 inline-block text-sm text-accent-soft underline">Edit profile on GitHub ↗</a>
                  </Card>
                )}
                <Card tone="green" title="Connected accounts">
                  <div className="space-y-3">
                    {profile && <div className="space-y-1 rounded-xl border border-black bg-paper p-4 text-sm">
                      <p className="font-medium">CoCommit</p>
                      <p className="break-all text-muted">{profile.email}</p>
                      <p className="text-xs text-muted">{profile.emailAccount ? "Email and password" : "Provider sign-in"}</p>
                      <p className="text-xs text-muted">Joined {new Date(profile.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</p>
                      {!profile.emailAccount && <p className="text-xs text-muted">Manage your email and password with your sign-in provider.</p>}
                    </div>}
                    {github && <div className="space-y-2 rounded-xl border border-black bg-paper p-4 text-sm">
                      <p className="font-medium">GitHub</p>
                      <div className="flex items-center gap-2">
                        <Avatar name={github.name || github.login} url={github.avatarUrl} className="h-8 w-8" />
                        <span className="break-all">@{github.login}</span>
                      </div>
                      <a href={`https://github.com/${encodeURIComponent(github.login)}`} target="_blank" rel="noreferrer" className="block text-accent-soft underline">View GitHub profile ↗</a>
                      <a href="https://github.com/settings/profile" target="_blank" rel="noreferrer" className="block text-accent-soft underline">GitHub settings ↗</a>
                    </div>}
                    {profile && github && <p className="text-xs">These are separate signed-in accounts. Profile edits apply to your CoCommit account.</p>}
                  </div>
                </Card>
              </div>
              <div className="space-y-5">
                {profile?.emailAccount && <EmailSettings profile={profile} onSaved={updateProfile} />}
                {profile?.emailAccount && <PasswordSettings />}
              </div>
            </div>
          )}
        </>
      )}
      <p className="pt-2 text-sm text-muted">
        <Link href="/legal" className="underline underline-offset-2 hover:text-fg">Privacy, terms and cookies</Link>
      </p>
    </div>
  );
}

function ProfileForm({ profile, onSaved }: { profile: AccountProfile; onSaved: (p: AccountProfile) => void }) {
  const [name, setName] = useState(profile.name);
  const [avatar, setAvatar] = useState(profile.avatarUrl);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const dirty = name.trim() !== profile.name || avatar.trim() !== profile.avatarUrl;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setNotice(null);
    try {
      const result = await saveProfile(name, avatar);
      onSaved(result.profile);
      setName(result.profile.name); setAvatar(result.profile.avatarUrl);
      setNotice({ kind: "success", text: result.warning ?? "Profile saved. Your new details will appear on future chat messages." });
    } catch (e) { setNotice({ kind: "error", text: errorText(e) }); }
    finally { setBusy(false); }
  };
  return <Card title="Profile details">
    <form onSubmit={submit} className="space-y-4">
      <Feedback notice={notice} />
      <fieldset disabled={busy} className="min-w-0 space-y-4">
        <label className="block text-sm font-medium" htmlFor="profile-name">Display name
          <input id="profile-name" autoComplete="nickname" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} className={input} />
        </label>
        <label className="block text-sm font-medium" htmlFor="profile-avatar">Photo URL <span className="font-normal text-muted">(optional)</span>
          <input id="profile-avatar" type="url" value={avatar} onChange={(e) => setAvatar(e.target.value)} placeholder="https://example.com/your-photo.jpg" aria-describedby="avatar-help" className={input} />
        </label>
        <p id="avatar-help" className="text-xs text-muted">Use an HTTPS image link. Leave it empty to use your initial.</p>
        <div className="flex items-center gap-3"><Avatar name={name} url={avatar} /><span className="text-xs text-muted">Photo preview</span></div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={!dirty}>{busy ? "Saving…" : "Save changes"}</Button>
          <Button type="button" variant="ghost" disabled={!dirty} onClick={() => { setName(profile.name); setAvatar(profile.avatarUrl); setNotice(null); }}>Cancel</Button>
        </div>
      </fieldset>
    </form>
  </Card>;
}

function EmailSettings({ profile, onSaved }: { profile: AccountProfile; onSaved: (p: AccountProfile) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  return <Card tone="mustard" title="Email address">
    <p className="mb-3 break-all text-sm text-muted">Current email: {profile.email}</p>
    {profile.pendingEmail && <p className="mb-3 break-all text-sm">Awaiting confirmation: {profile.pendingEmail}</p>}
    <form className="space-y-4" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true); setNotice(null);
      try {
        const next = await changeEmail(email, password);
        onSaved(next); setEmail(""); setPassword("");
        setNotice({ kind: "success", text: next.email === email.trim() ? "Email address updated." : "Check your inbox to confirm the change. You may need to approve it from both email addresses." });
      } catch (e) { setNotice({ kind: "error", text: errorText(e) }); }
      finally { setBusy(false); }
    }}>
      <Feedback notice={notice} />
      <fieldset disabled={busy} className="min-w-0 space-y-4">
        <label htmlFor="new-email" className="block text-sm font-medium">New email<input id="new-email" required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} /></label>
        <label htmlFor="email-password" className="block text-sm font-medium">Current password<input id="email-password" required type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={input} /></label>
        <Button type="submit" disabled={!email.trim() || email.trim() === profile.email}>{busy ? "Updating…" : "Change email"}</Button>
      </fieldset>
    </form>
  </Card>;
}

function PasswordSettings() {
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  return <Card tone="mustard" title="Password">
    <form className="space-y-4" onSubmit={async (e) => {
      e.preventDefault(); setNotice(null);
      if (password !== confirmation) return setNotice({ kind: "error", text: "The new passwords don't match." });
      setBusy(true);
      try {
        await changePassword(current, password);
        setCurrent(""); setPassword(""); setConfirmation("");
        setNotice({ kind: "success", text: "Password updated." });
      } catch (e) { setNotice({ kind: "error", text: errorText(e) }); }
      finally { setBusy(false); }
    }}>
      <Feedback notice={notice} />
      <fieldset disabled={busy} className="min-w-0 space-y-4">
        <label htmlFor="current-password" className="block text-sm font-medium">Current password<input id="current-password" required type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className={input} /></label>
        <label htmlFor="new-password" className="block text-sm font-medium">New password<input id="new-password" required type="password" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} aria-describedby="password-help" value={password} onChange={(e) => setPassword(e.target.value)} className={input} /></label>
        <p id="password-help" className="text-xs text-muted">Use at least {MIN_PASSWORD_LENGTH} characters.</p>
        <label htmlFor="confirm-password" className="block text-sm font-medium">Confirm new password<input id="confirm-password" required type="password" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} className={input} /></label>
        <Button type="submit">{busy ? "Updating…" : "Change password"}</Button>
      </fieldset>
    </form>
  </Card>;
}
