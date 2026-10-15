# Google sign-in: setup checklist (Pattadon)

1. Google Cloud Console → APIs & Services → Credentials → Create OAuth client ID (Web application).
   Authorized redirect URI: `https://<your-project>.supabase.co/auth/v1/callback`
2. Supabase → Authentication → Providers → Google: paste the client ID and secret, enable.
3. Supabase → Authentication → URL Configuration:
   - Site URL: the Vercel URL
   - Redirect URLs: `http://localhost:3000/auth/callback` and `https://<vercel-url>/auth/callback`
4. Supabase → SQL editor: run `supabase/profiles.sql`.
5. Put `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local` and in Vercel env vars.
6. Test: `npm run dev` → http://localhost:3000 → redirected to /login → Continue with Google → back on `/` with your name in the sidebar.

Without step 5 the app runs in demo mode (no login, all screens open).
