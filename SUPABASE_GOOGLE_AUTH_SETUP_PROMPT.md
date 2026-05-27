# GamerClock Supabase + Google Auth Setup Prompt

Use this prompt with a browser-capable AI agent. The goal is to configure Supabase Email Auth and Google OAuth for the existing Next.js app.

## Context

Project:
- App name: GamerClock
- Current production/Vercel URL: `https://gamecal-beryl.vercel.app`
- Future custom domain, not active yet: `https://gamerclock.com`
- Local dev URLs:
  - `http://localhost:3000`
  - `http://localhost:3001`
- Auth callback route in the app: `/auth/callback`
- Tech stack: Next.js + Supabase Auth

Important:
- Keep the current Vercel URL as `https://gamecal-beryl.vercel.app`.
- Do not use `gamerclock.com` yet because the domain has not been purchased/connected.
- Do not expose secrets in chat. If a secret appears, ask the user to paste it directly into the correct dashboard field.

## Objective

Configure:
1. Supabase Email provider
2. Supabase URL Configuration
3. Google Cloud OAuth Client
4. Supabase Google provider
5. Environment variables for local and Vercel

## Step 1. Supabase Project

1. Open `https://supabase.com/dashboard`.
2. If no project exists, create one:
   - Project name: `gamerclock`
   - Region: closest reasonable region
   - Save the database password somewhere secure.
3. Open the project dashboard.

## Step 2. Get Supabase API Values

1. Go to `Project Settings` -> `API`.
2. Copy:
   - Project URL
   - anon public key
3. These are needed later as:

```env
NEXT_PUBLIC_SUPABASE_URL=<Supabase Project URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<Supabase anon public key>
NEXT_PUBLIC_APP_URL=https://gamecal-beryl.vercel.app
```

Do not paste these into public chat. Ask the user to place them directly in `.env.local` and Vercel Environment Variables.

## Step 3. Enable Email Auth

1. In Supabase, go to `Authentication` -> `Providers`.
2. Open `Email`.
3. Enable Email provider.
4. For initial testing:
   - It is acceptable to disable email confirmation temporarily.
5. For production:
   - Enable email confirmation.

Expected app behavior:
- Email signup should create the user.
- If confirmation is enabled, the user receives an email.
- Confirmation redirects back to:

```txt
https://gamecal-beryl.vercel.app/auth/callback
```

or local:

```txt
http://localhost:3000/auth/callback
http://localhost:3001/auth/callback
```

## Step 4. Supabase URL Configuration

1. Go to `Authentication` -> `URL Configuration`.
2. Set `Site URL` to:

```txt
https://gamecal-beryl.vercel.app
```

3. Add these Redirect URLs:

```txt
https://gamecal-beryl.vercel.app/auth/callback
http://localhost:3000/auth/callback
http://localhost:3001/auth/callback
```

4. Do not add `https://gamerclock.com/auth/callback` yet unless the domain has been purchased and connected.

## Step 5. Create Google Cloud OAuth Client

1. Open `https://console.cloud.google.com/`.
2. Create or select a Google Cloud project:
   - Recommended name: `GamerClock`
3. Go to `APIs & Services` -> `OAuth consent screen`.
4. Configure:
   - App name: `GamerClock`
   - User support email: user's email
   - Developer contact email: user's email
   - User type: `External`, unless this is intentionally internal only
5. If the app remains in Testing mode, add the user's Google account as a test user.

## Step 6. Create OAuth Credentials

1. Go to `APIs & Services` -> `Credentials`.
2. Click `Create Credentials` -> `OAuth client ID`.
3. Application type:

```txt
Web application
```

4. Name:

```txt
GamerClock Web
```

5. Add Authorized JavaScript origins:

```txt
https://gamecal-beryl.vercel.app
http://localhost:3000
http://localhost:3001
```

6. Add Authorized redirect URI.

This must be the Supabase Auth callback URL, not the app callback URL:

```txt
https://<SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback
```

Example:

If Supabase Project URL is:

```txt
https://abcdxyz.supabase.co
```

then Google Authorized redirect URI is:

```txt
https://abcdxyz.supabase.co/auth/v1/callback
```

7. Save the OAuth client.
8. Copy:
   - Client ID
   - Client Secret

Do not expose these in chat. Ask the user to paste them directly into Supabase.

## Step 7. Enable Google Provider in Supabase

1. Go back to Supabase.
2. Open `Authentication` -> `Providers` -> `Google`.
3. Enable Google provider.
4. Paste:
   - Google Client ID
   - Google Client Secret
5. Save.

## Step 8. Local Environment Variables

In the local project, create or update `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=<Supabase Project URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<Supabase anon public key>
NEXT_PUBLIC_APP_URL=https://gamecal-beryl.vercel.app
```

After editing `.env.local`, restart the dev server:

```bash
pnpm dev
```

or, if using the current test port:

```bash
PORT=3001 pnpm dev
```

## Step 9. Vercel Environment Variables

1. Open Vercel dashboard.
2. Select the current project.
3. Go to `Settings` -> `Environment Variables`.
4. Add:

```env
NEXT_PUBLIC_SUPABASE_URL=<Supabase Project URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<Supabase anon public key>
NEXT_PUBLIC_APP_URL=https://gamecal-beryl.vercel.app
```

5. Redeploy the app.

## Step 10. Test

Test locally:

```txt
http://localhost:3000
```

or:

```txt
http://localhost:3001
```

Test production:

```txt
https://gamecal-beryl.vercel.app
```

Checklist:
- Click `Sign In`.
- Confirm Google button is visible.
- Confirm Email and Password fields are visible.
- Test Email signup.
- Test Email login.
- Test Google login.
- After successful login, user should return to the app.

## Common Mistakes

1. Wrong Google redirect URI:
   - Wrong: `https://gamecal-beryl.vercel.app/auth/callback`
   - Correct: `https://<SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback`

2. Missing Supabase Redirect URLs:
   - Add local and production app callback URLs in Supabase URL Configuration.

3. Vercel env vars changed but app not redeployed:
   - Redeploy after adding environment variables.

4. Google OAuth consent screen is in Testing mode:
   - Add the user email as a test user.

5. Future domain added too early:
   - Do not use `gamerclock.com` until the domain is purchased and connected.

## Success Criteria

The task is complete when:
- Email signup works.
- Email login works.
- Google login works.
- Login redirects back to the app.
- Local and Vercel both work.
- No setting uses `gamerclock.com` yet.

