# E2E Auth Issue Investigation & Fix

## Problem Summary
E2E tests fail at authentication with "TypeError: Failed to fetch" when Supabase auth endpoint is called.

---

## Root Cause Analysis

### The Mismatch
**File:** `apps/web/app/auth/login/page.tsx` (lines 14-16)

```typescript
function usernameToEmail(username: string) {
  return `${username.toLowerCase().replace(/[^a-z0-9]/g, '_')}@students.educompanion.app`;
}
```

**What happens:**
1. Test sends username: `student_test` (from `TEST_STUDENT_USERNAME` in .env.test.local)
2. Login page converts it to: `student_test@students.educompanion.app`
3. Sends to Supabase auth with this email

**But .env.test.local has:**
```
TEST_STUDENT_EMAIL=student@test.easestudy.in
```

**And the Supabase test project likely has the account registered as:**
```
student@test.easestudy.in  (NOT student_test@students.educompanion.app)
```

### Why It Fails
- Login page tries: `student_test@students.educompanion.app`
- Supabase has: `student@test.easestudy.in`
- ❌ Account not found or wrong credentials → "Failed to fetch" error

---

## The Fix

### Option 1: Match the Email Format (Recommended)
Update `.env.test.local` to use an email that matches the `usernameToEmail()` conversion:

**Current:**
```
TEST_STUDENT_USERNAME=student_test
TEST_STUDENT_EMAIL=student@test.easestudy.in
```

**Fixed:**
```
TEST_STUDENT_USERNAME=student_test
TEST_STUDENT_EMAIL=student_test@students.educompanion.app
```

**Reason:** The login page always converts username → email, so the TEST_STUDENT_EMAIL must match what the conversion produces.

---

### Option 2: Change Login Logic
Modify login page to check `TEST_STUDENT_EMAIL` environment variable directly (if it's available on client side).

**Downside:** Exposes test credentials on client side, less secure.

---

## Implementation: Option 1 (Recommended)

### Step 1: Update .env.test.local

Change this line:
```
TEST_STUDENT_EMAIL=student@test.easestudy.in
```

To this:
```
TEST_STUDENT_EMAIL=student_test@students.educompanion.app
```

### Step 2: Create test account in Supabase

In the test Supabase project (https://supabase.com):
1. Go to Authentication → Users
2. Create new user with:
   - Email: `student_test@students.educompanion.app`
   - Password: `TestPass123!`
   - Confirm email: Yes (or skip if test project allows)

### Step 3: Verify in database

Run in Supabase SQL Editor:
```sql
-- Check user exists
SELECT id, email, created_at FROM auth.users 
WHERE email = 'student_test@students.educompanion.app';

-- Check student profile exists
SELECT id, user_id, created_at FROM students 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'student_test@students.educompanion.app');
```

### Step 4: Re-run tests

```bash
cd apps/web
npm run test
```

Expected: E2E auth setup should pass ✅

---

## Why This Works

```
Flow with fix:
1. Test provides username: student_test (from TEST_STUDENT_USERNAME)
2. Login page converts: student_test → student_test@students.educompanion.app
3. Supabase has account: student_test@students.educompanion.app ✅
4. Auth succeeds → redirect to /dashboard ✅
5. E2E tests continue with authenticated session ✅
```

---

## Additional Notes

### Why "Failed to fetch" instead of "Invalid credentials"?
The generic "Failed to fetch" error suggests:
- Network request succeeded (200 response from Supabase)
- But authentication failed silently
- The error is caught and shown as "Failed to fetch"

### Why didn't tests catch this earlier?
- Tests were probably added after the login page code changed
- Or test credentials weren't synced with the code logic
- E2E tests are only run locally/CI, not in unit tests

### Side note on `TEST_STUDENT_EMAIL`
The `TEST_STUDENT_EMAIL` environment variable in auth.setup.ts is used to extract the username part if `TEST_STUDENT_USERNAME` isn't set (line 16):

```typescript
const username =
  process.env.TEST_STUDENT_USERNAME ??
  process.env.TEST_STUDENT_EMAIL?.split('@')[0] ??  ← Falls back here
  '';
```

With the fix:
- `TEST_STUDENT_EMAIL=student_test@students.educompanion.app`
- Fallback would extract: `student_test` ✅
- Converts to email: `student_test@students.educompanion.app` ✅
- Perfect match!

---

## Verification Checklist

- [ ] Update `.env.test.local` (line: `TEST_STUDENT_EMAIL`)
- [ ] Create test account in Supabase test project
- [ ] Verify SQL query shows account exists
- [ ] Delete old auth fixture: `e2e/fixtures/.auth/student.json`
- [ ] Run `npm run test` again
- [ ] Confirm all 248 unit + 43 E2E tests pass ✅
- [ ] Deploy optimizations

---

## Testing the Fix

Once the fix is applied, you should see:
```
✅ 248 unit tests passed
✅ 43 E2E tests passed (including auth.setup.ts)
```

Instead of:
```
✅ 248 unit tests passed
❌ 2 E2E tests failed (auth.setup.ts, auth.spec.ts dependent)
```
