# Database Migrations

This directory contains SQL migration files for the TaskCal Supabase database.

## Migrations

### 20260206_add_auto_theme.sql

**Purpose**: Add "auto" theme option to follow iOS system appearance settings

**Changes**:
1. **user_settings table** - Update theme column
   - Drop existing CHECK constraint on theme column
   - Add new CHECK constraint: `theme IN ('light', 'dark', 'auto')`
   - Set default value to 'auto' for new users
   - Update existing NULL or invalid values to 'auto'

**User Experience Impact**:
- New users will automatically follow system dark/light mode
- Existing users keep their current theme preference
- Users can choose: Auto, Light, or Dark mode in Settings

**Breaking Changes**: None - backward compatible with existing 'light'/'dark' values

---

### 20260206_fix_rls_performance.sql

**Purpose**: Fix RLS (Row Level Security) performance issues identified by Supabase Linter

**Changes**:
1. **user_feedback table** - Optimized auth function calls
   - Updated policy: "Users can view their own feedback"
   - Updated policy: "Users can insert their own feedback"
   - Changed `auth.uid()` to `(select auth.uid())` to prevent per-row re-evaluation

2. **app_versions table** - Reduced policy overhead
   - Merged `select_active_versions_public` and `select_all_versions_authenticated`
   - Combined into single policy `select_app_versions` with OR logic
   - Eliminates duplicate policy evaluation on every SELECT query

**Performance Impact**:
- Reduces query execution time for tables with many rows
- Prevents auth function re-evaluation per row (significant on large datasets)
- Single policy evaluation vs multiple permissive policies

## How to Apply

### Method 1: Supabase Dashboard (Recommended)
1. Open [Supabase Dashboard](https://supabase.com/dashboard)
2. Go to **SQL Editor**
3. Copy/paste the migration SQL
4. Click **Run**

### Method 2: Supabase CLI
```bash
# Link your project first (one-time setup)
supabase link --project-ref YOUR_PROJECT_REF

# Apply migration
supabase db push
```

### Method 3: Direct Execution
```bash
supabase db execute --file supabase/migrations/20260206_fix_rls_performance.sql
```

## Verification

After applying the migration, verify the fixes in Supabase Dashboard:
1. Go to **Database** > **Policies**
2. Check `user_feedback` table policies use `(select auth.uid())`
3. Check `app_versions` table has single combined SELECT policy
4. Re-run Database Linter to confirm warnings are resolved
