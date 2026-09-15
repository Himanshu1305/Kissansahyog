# Kisan Sahyog — Admin Nav Link Prompt

DO NOT ask for approval. Auto-accept all actions. Read PROJECT_CONTEXT.md before starting.

**Repo:** https://github.com/Himanshu1305/Kissansahyog
**Deploy after completing:** `npx wrangler pages deploy dist --project-name kissansahyog`

---

## What to change

When a logged-in user has `is_admin = true` on their profile, show an "Admin" link in the navigation bar so they can reach the admin dashboard directly without typing /admin manually.

**Nav bar change (authenticated + is_admin = true only):**
- Add a link labelled "⚙️ Admin" (or a settings/gear icon with "Admin" text) in the nav bar
- Placement: right side of nav, between "My Listings" and "Logout"
- Clicking it navigates to /admin
- This link must be completely invisible to non-admin users — do not render it at all if is_admin = false or if the user is not logged in
- No security change needed — /admin already gates on is_admin server-side. This is purely a navigation convenience for admins.

**User dropdown change (if the app uses a dropdown for logged-in user options):**
- Also add "Admin Dashboard" as a menu item in the user dropdown/menu for admin users
- Same condition: only visible when is_admin = true

**Also: ensure both admin accounts have is_admin = true**

The following two accounts must have is_admin = true. Run a verification query and fix if either is missing the flag:

```sql
-- Verify
SELECT email, phone, is_admin FROM profiles 
WHERE email IN ('himanshu1305@gmail.com', 'admin@kissansahyog.com');

-- Fix if needed
UPDATE profiles SET is_admin = true 
WHERE email IN ('himanshu1305@gmail.com', 'admin@kissansahyog.com');
```

Note: admin@kissansahyog.com may not have a profile row yet if the auth user was created but the profile INSERT was not completed. If the profile row does not exist for admin@kissansahyog.com, insert it:

```sql
INSERT INTO profiles (
  full_name, email, auth_uid, auth_provider,
  preferred_language, disclaimer_accepted_at,
  is_admin, pincode, village_town
)
SELECT
  'Kisan Sahyog Admin',
  'admin@kissansahyog.com',
  id,  -- auth.users id for this email
  'email',
  'hi',
  now(),
  true,
  '470117',
  'Khurai'
FROM auth.users WHERE email = 'admin@kissansahyog.com'
ON CONFLICT (email) DO UPDATE SET is_admin = true;
```

---

## Test checklist

- Positive: Log in as himanshu1305@gmail.com — Admin link visible in nav
- Positive: Log in as admin@kissansahyog.com — Admin link visible in nav
- Positive: Clicking Admin link navigates to /admin correctly
- Negative: Log in as any non-admin user — Admin link completely absent from nav
- Negative: Unauthenticated visitor — Admin link completely absent
- Regression: All existing nav links (Home, categories, My Listings, Profile, Logout) still work correctly for all users

---

## Commit and deploy

Single commit: "Admin nav link visible to is_admin users; both admin accounts verified"
Deploy: `npx wrangler pages deploy dist --project-name kissansahyog`
