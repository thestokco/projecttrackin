# Project Tracker - Setup Guide

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Click "New Project" and fill in:
   - Project name: `project-tracker`
   - Database password: (save this somewhere safe)
   - Region: choose closest to you
3. Wait for the project to be created

## 2. Run the Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **New query**
3. Copy the entire contents of `supabase-schema.sql` and paste it
4. Click **Run** to execute

## 3. Get Your API Keys

1. In Supabase dashboard, go to **Settings > API**
2. Copy:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (the long JWT token)

## 4. Configure the App

1. Copy `.env.local.example` to `.env.local`:
   ```
   copy .env.local.example .env.local
   ```
2. Fill in your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

## 5. Disable Email Confirmation (for testing)

1. In Supabase dashboard, go to **Authentication > Providers**
2. Under **Email**, toggle OFF "Confirm email"
3. This allows instant signup without email verification

## 6. Run the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Features

- **Sign Up / Sign In** - Team member registration with name, email, contact, password
- **Form** - Submit records with auto timestamp, completion date, application number, cable return status, photos (max 5), remarks
- **Table** - View all submissions with sortable columns, date range filter, click for details, Excel export
- **Dashboard** - Monthly view showing missing submissions and pending cable returns
- **Real-time** - Auto-updates when any team member submits data
