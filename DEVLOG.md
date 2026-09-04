# Development Log

A running record of real problems hit while building this, the decisions made, and what I learned. Written as I went, not reconstructed after the fact.

## A silently-broken AI model reference

**Problem:** Quiz generation, the tutor, and flashcards all failed in both local dev and production, with no obvious cause from the error messages alone.

**Cause:** `GROQ_MODEL` was set to `llama-3.3-70b-versatile`, which Groq had fully removed from their lineup by the time this was debugged - confirmed via Groq's own model docs, not just an access/quota issue.

**Fix:** Swapped to `openai/gpt-oss-120b` (same free-tier rate limits as the removed model, better quality than the smaller `20b` variant). Verified end-to-end in the browser afterward - flashcard generation and tutor chat both work again.

**What I learned:** A "no extra detail" 4xx/5xx from a third-party API is worth checking against that provider's own changelog or model list before assuming the bug is in application code.

## A security pass before calling this done

Before wrapping up, I went through the whole app looking for real, exploitable problems - not a checklist exercise, an actual attempt to find ways a user could see or modify data that isn't theirs.

### RLS looked fine in the dashboard UI - until I checked the database directly

Supabase's Policies page showed every table's `INSERT` policy for `documents` rendering what looked like `with check (true)` in a preview pane - which would have meant any authenticated user (including a throwaway demo account) could insert a `documents` row claiming any other user's `user_id`. That's a real vulnerability if true: the backend's ownership checks (`document["user_id"] != user_id`) only work if `user_id` can be trusted as belonging to whoever actually created the row.

It turned out to be a rendering artifact in the dashboard's policy editor, not the real policy. Querying `pg_policies` directly in the SQL editor showed the actual, currently-active policy: `with check (auth.uid() = user_id)` - correctly scoped. Same story for the `study-materials` storage bucket's policies, checked via `pg_policies` under the `storage` schema instead of trusting the Policies tab's visual summary.

**What I learned:** For anything security-relevant, read the actual system-of-record (here, `pg_policies`, the Postgres catalog table Supabase's RLS is built on) instead of trusting a dashboard's rendering of it. A UI can have rendering bugs; a direct query to the catalog can't lie about what's actually enforced.

### Unrestricted file uploads on the storage bucket

**Problem:** Documents get uploaded straight from the browser to Supabase Storage (not through the FastAPI backend), authorized by RLS alone. The bucket had no file-size limit and no MIME-type restriction configured - both toggles were off by default and had just never been touched.

**Why it mattered:** RLS correctly stops one user from touching another user's files, but it does nothing to stop a single authenticated user (or a throwaway demo account) from uploading an arbitrarily large file, or a file of a type the backend can't even parse, over and over, eating the free-tier storage quota.

**Fix:** Set a 20MB per-file limit and restricted allowed MIME types to exactly the four formats `extract_text()` actually handles (`application/pdf`, `.pptx`, `.docx`, `text/plain`) - both enforced by Supabase itself before a file ever reaches storage, not just by the `<input accept>` hint on the frontend, which is trivially bypassed.

**What I learned:** A client-side `accept` attribute on a file input is a UX convenience, not a control - anyone can select a different file type through the OS file picker's "all files" option or a direct API call. The actual restriction has to live on the server (or, here, the storage provider) side.

### An abuse vector in the public demo endpoint

**Problem:** `/demo/start` is intentionally public and unauthenticated - that's the whole point, a visitor can try the app with no signup. But it also creates a real Supabase user and calls the Groq API to generate a quiz, on every single hit, with no rate limiting.

**Why it mattered:** Anyone could script repeated calls to this one endpoint and burn through the Groq API quota that every real user's tutor/quiz/flashcard features depend on, effectively breaking the app for everyone else without needing an account at all.

**Fix:** Added a simple per-IP fixed-window rate limit (3 demo starts per hour) directly in `demo.py`, using an in-memory dict rather than adding a new dependency - fine for a single free-tier instance, and a restart just resets everyone's window, which is an acceptable tradeoff for a demo-abuse guard, not a security boundary that needs to survive restarts.

**What I learned:** "Unauthenticated by design" and "unlimited by design" are two different decisions - the first one was intentional here, the second one was just an oversight from focusing on the happy path while building the feature.

### Non-constant-time secret comparison

**Problem:** `/demo/cleanup` checked its bearer-token secret with a plain `==` string comparison.

**Why it mattered:** Python's `==` on strings short-circuits at the first mismatched character, so comparison time leaks (in theory) how many leading characters of a guess are correct - a textbook timing side-channel. Low real-world risk here given the secret is a 32+ character random token served over HTTPS, but it's a one-line fix for a well-known vulnerability class, so worth doing properly rather than relying on "probably fine."

**Fix:** Switched to `secrets.compare_digest()`, which is designed specifically for this - constant-time comparison regardless of where the strings first differ.

**What I learned:** Never compare secrets with `==` - it costs nothing to use the standard library's purpose-built function instead, and "the odds of exploitation are low" isn't a reason to skip a fix that's this cheap.

### Known limitations, deliberately left as-is

Not everything found during the pass got fixed - some things are better documented as conscious scope decisions than "fixed" with a change that would add real complexity for a beginner-scope portfolio project:

- **Error responses leak raw exception text.** Several endpoints (`documents.py`, `quiz.py`, `tutor.py`, `flashcards.py`) return `detail=str(exc)` straight to the client on failure - useful for debugging, but it can leak internal error details (e.g. a library's exact error message) to an authenticated caller. It's minor info disclosure, not a path to another user's data, since every one of these endpoints already checks ownership before doing anything else. Left as-is; a cleaner version would log the real exception server-side and return a generic message to the client.
- **The tutor endpoint doesn't restrict the `role` field in chat history.** A client could send `role: "system"` in the conversation history sent to `/documents/{id}/tutor`, effectively injecting a fake system-level instruction into their own tutoring session. This only affects the attacker's own conversation with the AI tutor - there's no cross-user impact, since the endpoint already scopes to the caller's own document via the same ownership check as everywhere else. Left as-is as a low-severity self-only issue.
- **No sandboxing for parsing untrusted uploaded documents.** PDFs, DOCX, and PPTX files are parsed server-side with `pypdf`, `python-docx`, and `python-pptx` directly - like any app that parses untrusted office documents, this inherits whatever parsing-library vulnerabilities exist upstream (e.g. resource-exhaustion via a maliciously crafted file). Real sandboxing (a separate worker process with resource limits, or an external parsing service) is the correct fix at production scale, but is out of scope for what this project needs to demonstrate.

## A CI check that failed on every push, silently

**Problem:** Right after adding a GitHub Actions workflow to run the frontend test suite on every push, the "Frontend tests" check went red - on every single commit - even though `npm test` passed cleanly when run locally.

**Cause:** jsdom v30 (the DOM environment Vitest uses to run component tests in Node) bundles `undici`, and `undici`'s `CacheStorage` calls a Node built-in - `webidl.util.markAsUncloneable` - that doesn't exist on Node 20, the version pinned in the workflow. This machine runs Node 24, where that API does exist, so the failure was invisible locally; the CI runner was the first place this code ever actually executed on an older Node.

**Fix:** Bumped the workflow's `node-version` from `"20"` to `"24"` to match what's actually used in local development.

**What I learned:** "Tests pass" only means "tests pass in the environment they ran in." A CI runner pinned to a different tool version than the local machine is a real, easy-to-miss way to ship a red check that a local `npm test` will never reproduce - worth actually opening the Actions tab after adding a new workflow, not just trusting that a local pass implies a CI pass.
