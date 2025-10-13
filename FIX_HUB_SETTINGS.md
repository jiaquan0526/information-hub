# Fix Hub Settings - Missing Database Policy

## Problem
You're seeing "Error loading hub settings" because the `site_settings` table is missing the admin **write** policy. It only has the **read** policy, so admins cannot save settings.

## Solution

Run the SQL migration to add the missing policy:

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**

### Step 2: Run the Migration
Copy and paste this SQL:

```sql
-- Add missing admin write policy for site_settings table
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname='public' 
          AND tablename='site_settings' 
          AND policyname='site_settings_admin_write'
    ) THEN
        CREATE POLICY site_settings_admin_write 
        ON public.site_settings 
        FOR ALL
        USING (
            EXISTS (
                SELECT 1 
                FROM public.profiles p
                WHERE p.id = auth.uid()
                  AND (
                    lower(coalesce(p.role,'')) = 'admin' 
                    OR (p.permissions->>'canManageUsers')::boolean IS TRUE
                  )
            )
        ) 
        WITH CHECK (
            EXISTS (
                SELECT 1 
                FROM public.profiles p
                WHERE p.id = auth.uid()
                  AND (
                    lower(coalesce(p.role,'')) = 'admin' 
                    OR (p.permissions->>'canManageUsers')::boolean IS TRUE
                  )
            )
        );
    END IF;
END $$;
```

### Step 3: Verify
Run this query to check the policies were created:

```sql
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd
FROM pg_policies 
WHERE tablename = 'site_settings'
ORDER BY policyname;
```

You should see two policies:
- `site_settings_select_all` (SELECT) - Everyone can read
- `site_settings_admin_write` (ALL) - Admins can write

### Step 4: Test
1. Refresh your hub page
2. Log in as admin
3. Open Admin Panel → Hub Settings
4. Try saving a change

## Alternative: Use the SQL File

You can also run the pre-made SQL file:

```bash
# The migration file is located at:
sql/add-site-settings-write-policy.sql
```

Just copy its contents into the Supabase SQL Editor and run it.

## What This Does

This policy allows users with:
- **role = 'admin'** OR
- **permissions.canManageUsers = true**

...to INSERT, UPDATE, and DELETE rows in the `site_settings` table.

All authenticated users can still READ the settings (which is needed for displaying the hub title/description).

---

## After Running the Migration

The Hub Settings feature will work perfectly:
- ✅ Admins can edit hub title and description
- ✅ Changes save to database
- ✅ All users see the updated settings
- ✅ Settings persist across page loads

