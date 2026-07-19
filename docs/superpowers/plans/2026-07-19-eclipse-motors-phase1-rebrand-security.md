# Eclipse Motors — Phase 1 (Rebrand + Security Hardening) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand the site CarLab → Eclipse Motors and close the critical/high security findings, shipping on the current static-export deploy model.

**Architecture:** Pure client/static changes (branding, remove exposed credentials, remove demo-login button) plus a server-side nginx layer that adds real HTTP Basic Auth on `/admin` and security response headers. No backend yet — that is Phase 2.

**Tech Stack:** Next.js 14 static export, Tailwind, nginx on Contabo (`ssh contabo`).

## Global Constraints

- Brand name is exactly **Eclipse Motors** (two words, capitalised) everywhere user-visible.
- Domain is **https://eclipsemotors.org**; canonical `metadataBase` uses it.
- No secret (admin password) may appear in committed source, `.env.example`, README, or the client bundle. Real admin protection is nginx Basic Auth in this phase.
- No test framework exists in this repo; verification per task is `npm run build` success + `grep`/`curl` assertions (adding a unit-test runner for string/config changes is out of scope).
- Every code task ends by confirming `npm run build` still succeeds before commit.
- Commit after each task with the trailer:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>` and
  `Claude-Session: https://claude.ai/code/session_01QkA2K5T7zv6dmMSL7KXffK`

---

### Task 1: Rebrand — config, metadata, and copy strings

**Files:**
- Modify: `lib/config.ts`
- Modify: `app/layout.tsx:30`
- Modify: `lib/whatsapp.ts:21,39`
- Modify: `components/site/car-detail.tsx:71`
- Modify: `components/admin/settings-form.tsx:42,124`
- Modify: `app/inventory/page.tsx:9`
- Modify: `package.json:2,5`

**Interfaces:**
- Produces: `SITE_CONFIG.dealerName === "Eclipse Motors"` (consumed by Logo in Task 2 and by layout/whatsapp).

- [ ] **Step 1: Update `lib/config.ts` dealer name and admin email default**

Replace the `SITE_CONFIG` dealerName line and the admin email default (password handled in Task 3):

```ts
export const SITE_CONFIG = {
  dealerName: process.env.NEXT_PUBLIC_DEALER_NAME || "Eclipse Motors",
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "233201234567",
  ghsPerUsd: Number(process.env.NEXT_PUBLIC_GHS_PER_USD) || 15.5,
  tagline: "Ghana's premium pre-owned & new car showroom",
  location: "Accra, Ghana",
} as const;
```

- [ ] **Step 2: Update remaining string touchpoints**

- `app/layout.tsx:30` — `metadataBase: new URL("https://eclipsemotors.org"),`
- `lib/whatsapp.ts` — both `dealerName = "CarLab"` defaults → `dealerName = "Eclipse Motors"`.
- `components/site/car-detail.tsx:71` — title suffix `— CarLab` → `— Eclipse Motors`.
- `components/admin/settings-form.tsx` — both `"CarLab"` fallbacks (lines 42 and 124) → `"Eclipse Motors"`.
- `app/inventory/page.tsx:9` — `"Browse the full CarLab inventory..."` → `"Browse the full Eclipse Motors inventory..."`.
- `package.json` — `"name": "eclipse-motors"` and `"description": "Eclipse Motors — a premium car sales platform for a Ghana-based dealer."`.

- [ ] **Step 3: Verify no stray CarLab strings remain in app code**

Run: `grep -rn "CarLab\|carlab" app components lib package.json` (Grep tool)
Expected: no matches in `app/`, `components/`, `lib/`, `package.json` (README/.env.example handled in Task 3; `next.config.mjs` GitHub-Pages `repo` handled in Phase 2).

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: `✓ Compiled successfully`, 18 static pages generated.

- [ ] **Step 5: Commit**

```bash
git add lib/config.ts app/layout.tsx lib/whatsapp.ts components/site/car-detail.tsx components/admin/settings-form.tsx app/inventory/page.tsx package.json
git commit -m "Rebrand CarLab -> Eclipse Motors across config, metadata and copy"
```

---

### Task 2: New Eclipse Motors logo mark

**Files:**
- Modify: `components/site/logo.tsx`

**Interfaces:**
- Consumes: `SITE_CONFIG.dealerName` from Task 1.
- Produces: `<Logo />` rendering an eclipse (crescent) mark + the dealer-name wordmark.

- [ ] **Step 1: Replace the "CL" monogram with an eclipse crescent SVG**

Replace the inner `<span>` monogram (the one containing `CL`) with a masked-crescent SVG. Full file:

```tsx
import Link from "next/link";
import { cn } from "@/lib/utils";
import { SITE_CONFIG } from "@/lib/config";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn("group flex items-center gap-2.5", className)}
      aria-label={`${SITE_CONFIG.dealerName} home`}
    >
      <span className="relative grid h-8 w-8 place-items-center rounded-lg border border-gold/40 bg-gradient-to-br from-gold/25 to-transparent">
        <svg
          viewBox="0 0 24 24"
          className="h-[18px] w-[18px] text-gold"
          aria-hidden="true"
        >
          <defs>
            <mask id="em-eclipse">
              <circle cx="12" cy="12" r="8" fill="white" />
              <circle cx="15.5" cy="10.5" r="7" fill="black" />
            </mask>
          </defs>
          <circle
            cx="12"
            cy="12"
            r="8"
            fill="currentColor"
            mask="url(#em-eclipse)"
          />
        </svg>
      </span>
      <span className="text-[17px] font-semibold tracking-tight">
        {SITE_CONFIG.dealerName}
      </span>
    </Link>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: `✓ Compiled successfully`.

- [ ] **Step 3: Commit**

```bash
git add components/site/logo.tsx
git commit -m "Add Eclipse Motors crescent logo mark"
```

---

### Task 3: Remove exposed admin credentials and demo-login button

**Files:**
- Modify: `lib/config.ts`
- Modify: `lib/auth.ts`
- Modify: `components/admin/login-form.tsx`
- Modify: `README.md`
- Modify: `.env.example`

**Interfaces:**
- Consumes: nothing new.
- Produces: no admin password in committed source or client defaults; client login only works if `NEXT_PUBLIC_ADMIN_*` are supplied at build (real gate is nginx Basic Auth, Task 4).

- [ ] **Step 1: Empty the committed admin credential defaults in `lib/config.ts`**

Replace the `ADMIN_CREDENTIALS` block:

```ts
export const ADMIN_CREDENTIALS = {
  email: process.env.NEXT_PUBLIC_ADMIN_EMAIL || "",
  password: process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "",
} as const;
```

- [ ] **Step 2: Make client sign-in fail closed when unconfigured (`lib/auth.ts`)**

In `signIn`, before the comparison, add a guard so empty configured creds can never match:

```ts
      signIn: (email, password) => {
        if (!ADMIN_CREDENTIALS.email || !ADMIN_CREDENTIALS.password) {
          return { ok: false, error: "Admin sign-in is not enabled." };
        }
        const okEmail =
          email.trim().toLowerCase() === ADMIN_CREDENTIALS.email.toLowerCase();
        const okPass = password === ADMIN_CREDENTIALS.password;
        if (okEmail && okPass) {
          set({ email: email.trim() });
          return { ok: true };
        }
        return { ok: false, error: "Invalid email or password." };
      },
```

- [ ] **Step 3: Remove the "Use demo credentials" button and its helper (`components/admin/login-form.tsx`)**

- Delete the `import { ADMIN_CREDENTIALS } from "@/lib/config";` line.
- Delete the `fillDemo` function (lines defining `const fillDemo = () => {...}`).
- Delete the entire `<button type="button" onClick={fillDemo} ...>Use demo credentials</button>` element.
- Change the email input `placeholder="admin@carlab.gh"` → `placeholder="you@eclipsemotors.org"`.
- Change the footer copy `"Demo auth for this build. Swap in Supabase Auth for production."` → `"Authorised access only."`.

- [ ] **Step 4: Scrub credentials from `README.md` and `.env.example`**

- `README.md`: replace the block showing `Email: admin@carlab.gh` / `Password: carlab-admin` with: `Admin access is protected at the server (nginx Basic Auth). Ask the site owner for credentials.` Update the env-var table rows for `NEXT_PUBLIC_ADMIN_EMAIL`/`_PASSWORD` descriptions to "Optional client login email/password; leave unset in production (server enforces access)." Change `NEXT_PUBLIC_DEALER_NAME` default cell to `Eclipse Motors` and the top `# CarLab` heading to `# Eclipse Motors`.
- `.env.example`: set `NEXT_PUBLIC_DEALER_NAME=Eclipse Motors`; change `NEXT_PUBLIC_ADMIN_EMAIL=admin@carlab.gh` → `NEXT_PUBLIC_ADMIN_EMAIL=` and `NEXT_PUBLIC_ADMIN_PASSWORD=carlab-admin` → `NEXT_PUBLIC_ADMIN_PASSWORD=`; change the `# CarLab environment variables` comment → `# Eclipse Motors environment variables`.

- [ ] **Step 5: Verify no committed secret or stray brand string remains**

Run: `grep -rn "carlab-admin\|admin@carlab" .` (Grep tool, exclude node_modules)
Expected: no matches.

- [ ] **Step 6: Verify build**

Run: `npm run build`
Expected: `✓ Compiled successfully`.

- [ ] **Step 7: Commit**

```bash
git add lib/config.ts lib/auth.ts components/admin/login-form.tsx README.md .env.example
git commit -m "Remove exposed admin credentials and demo-login button"
```

---

### Task 4: nginx — Basic Auth on /admin + security headers (Contabo)

**Files:**
- Modify (on server): `/etc/nginx/sites-available/eclipsemotors`
- Create (on server): `/etc/nginx/.htpasswd-eclipse-admin`

**Interfaces:**
- Consumes: the deployed static site at `/var/www/CarLab/out`.
- Produces: `/admin` returns `401` without credentials; all responses carry security headers.

- [ ] **Step 1: Create the htpasswd file with a generated password**

Run (on server):
```bash
ssh contabo 'apt-get install -y -qq apache2-utils >/dev/null 2>&1; PW=$(openssl rand -base64 12); htpasswd -bc /etc/nginx/.htpasswd-eclipse-admin eclipse "$PW" >/dev/null 2>&1; echo "ADMIN USER: eclipse"; echo "ADMIN PASS: $PW"'
```
Capture the printed user/pass to relay to the site owner.

- [ ] **Step 2: Add security headers + protected /admin location to the vhost**

Edit `/etc/nginx/sites-available/eclipsemotors`. Inside BOTH `server` blocks that certbot created (the `:443` one is what serves traffic; the `:80` one only redirects), add these headers inside the `:443` server block, above the first `location`:

```nginx
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
    add_header Content-Security-Policy "default-src 'self'; img-src 'self' data: https://images.unsplash.com https://plus.unsplash.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'self'" always;
```

And add a protected location (in the `:443` server block):

```nginx
    location /admin {
        auth_basic "Eclipse Motors Admin";
        auth_basic_user_file /etc/nginx/.htpasswd-eclipse-admin;
        try_files $uri $uri/ $uri.html /admin/index.html;
    }
```

- [ ] **Step 3: Test and reload nginx**

Run: `ssh contabo 'nginx -t && systemctl reload nginx'`
Expected: `syntax is ok` / `test is successful`, no error.

- [ ] **Step 4: Verify (after Task 5 deploy, or now against current build)**

Run: `ssh contabo 'curl -s -o /dev/null -w "no-auth /admin => %{http_code}\n" --resolve eclipsemotors.org:443:127.0.0.1 https://eclipsemotors.org/admin/'`
Expected: `401`.
Run: `ssh contabo 'curl -sI --resolve eclipsemotors.org:443:127.0.0.1 https://eclipsemotors.org/ | grep -i "strict-transport\|x-frame\|content-security"'`
Expected: the three headers present.

- [ ] **Step 5: Commit a copy of the vhost into the repo for reference**

Copy the final vhost to `deploy/nginx/eclipsemotors.conf` in the repo (documentation of server state), then:
```bash
git add deploy/nginx/eclipsemotors.conf
git commit -m "Document eclipsemotors nginx vhost (basic-auth admin + security headers)"
```

---

### Task 5: Deploy Phase 1 to Contabo and verify end-to-end

**Files:** none (deploy only).

- [ ] **Step 1: Push all Phase 1 commits**

Run: `git push origin main`
Expected: refs updated.

- [ ] **Step 2: Pull, build, reload on server**

Run:
```bash
ssh contabo 'cd /var/www/CarLab && git pull --ff-only origin main && npm install --no-audit --no-fund && npm run build && systemctl reload nginx && echo DEPLOYED'
```
Expected: `DEPLOYED`.

- [ ] **Step 3: Verify rebrand is live**

Run: `ssh contabo 'curl -s --resolve eclipsemotors.org:443:127.0.0.1 https://eclipsemotors.org/ | grep -io "Eclipse Motors" | head -1'`
Expected: `Eclipse Motors`.

- [ ] **Step 4: Verify admin is protected**

Run: `ssh contabo 'curl -s -o /dev/null -w "%{http_code}\n" --resolve eclipsemotors.org:443:127.0.0.1 https://eclipsemotors.org/admin/'`
Expected: `401`.

- [ ] **Step 5: Relay the generated admin credentials to the site owner** (from Task 4 Step 1) and confirm the audit report was delivered.

---

## Self-Review

**Spec coverage (Phase 1 rows):** Rebrand → Tasks 1–2 + Task 3 (README/env). Finding #1 (creds in bundle) → Task 3. Finding #2 (client-only auth) → Task 4 (nginx Basic Auth is the real gate). Finding #3 (demo button) → Task 3 Step 3. Finding #4 (headers) → Task 4 Step 2. Finding #5 (/admin reachable + noindex) → Task 4 (`noindex` already present in `app/admin/layout.tsx`; de-linked because nav has no admin link). Audit report delivery → Task 5 Step 5. Deploy + local mirror (commits pushed, server deploys from repo) → Task 5. **No gaps.**

**Placeholder scan:** No TBD/TODO; all edits show exact strings/code. Pass.

**Type consistency:** `SITE_CONFIG.dealerName` and `ADMIN_CREDENTIALS.{email,password}` names match across Tasks 1–3 and existing code. Pass.
