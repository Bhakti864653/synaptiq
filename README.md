# Synaptiq

An adaptive AI study platform: upload your own study material, take a diagnostic quiz, and get a personalized path back through the concepts you're actually weak on - practice questions, an AI tutor grounded only in your material, an exam-mode study plan, and spaced-repetition flashcards.

**Live app:** https://synaptiq-eta.vercel.app
**Backend API:** https://synaptiq-api-phbj.onrender.com
*(both hosted on free tiers - the API may take ~30s to wake up on first request)*

**Try it instantly, no account needed:** click "Try the demo" on the landing page. Every visitor gets their own private, isolated account seeded with a real sample document, run through the actual upload-to-quiz pipeline - not canned/fake data.

## Features

**Study material and diagnostics**
- Upload PDF, PPTX, DOCX, or TXT files; text is extracted and chunked server-side
- AI-generated diagnostic quiz (Groq) that identifies 3-6 distinct concepts in your material and tests each one
- Per-concept mastery scoring, recalculated from your full answer history every time you submit

**Adaptive study loop**
- **Adaptive practice** - generates new questions targeting your current weakest concepts, not a random resample
- **AI tutor** - answers questions grounded only in your uploaded material (told explicitly not to use outside knowledge, and to say so honestly when the material doesn't cover something), with the last 10 turns of conversation history kept for context
- **Exam Mode** - give it an exam date and hours/day available, and it produces a mastery-weighted time allocation across concepts (a pure algorithm, no AI call - low mastery gets more time, but every concept gets at least a light review pass)
- **Flashcards** with real SM-2 spaced repetition scheduling (the same algorithm behind Anki), not a fixed review interval

**Everything else**
- Dashboard with visual mastery bars across all your documents
- Manual dark/light mode toggle (hand-rolled, no flash of unstyled theme on load)
- Responsive layout, tested down to 320px
- Friendly error states with retry, in place of raw exception text, on every AI-dependent action
- **Demo mode** - a fully isolated, throwaway account per visitor, auto-cleaned after 24 hours by a scheduled GitHub Actions job, rate-limited to stop the public demo endpoint from being used to drain the shared Groq API quota

## Tech stack

- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS v4, deployed on Vercel
- **Backend:** FastAPI (Python), deployed on Render
- **Database & auth:** [Supabase](https://supabase.com) - Postgres with Row Level Security, Auth, and Storage
- **AI:** [Groq](https://groq.com) (`openai/gpt-oss-120b`) for quiz generation, adaptive practice, the tutor, and flashcard generation
- **Document parsing:** `pypdf`, `python-docx`, `python-pptx`

## Architecture notes

- **Two Supabase clients, deliberately kept separate:** the backend uses a service-role ("admin") client for all writes and cross-referencing queries, and the frontend talks to Supabase directly with the publishable ("anon") key for auth and file upload/insert. Per-user data isolation is enforced by Postgres Row Level Security on every table and the storage bucket (`auth.uid() = user_id`), not just by application code - verified directly against `pg_policies` rather than assumed from the dashboard UI. See [DEVLOG.md](DEVLOG.md) for a real case where the dashboard's own rendering of a policy was momentarily misleading and the database catalog was the actual source of truth.
- **The tutor is grounded by full-document context, not real vector search.** The original plan considered pgvector-based retrieval; in practice, study documents are short enough that the whole extracted text fits in the model's context window directly, so retrieval was dropped as unnecessary complexity for what this needs to do. Documented as a deliberate scope decision, and a clear place to extend if a future document is too large to fit whole.
- **Demo accounts are real Supabase users**, not a separate mocked code path - flagged with `is_demo` in user metadata and swept by the same `/demo/cleanup` endpoint pattern, run on a schedule via GitHub Actions.

For the real story of what broke and how it got fixed - a removed AI model silently breaking every AI feature, and a full security pass (a dashboard rendering artifact that looked like a real vulnerability, unrestricted file uploads, an unrate-limited public endpoint spending real API quota, a non-constant-time secret comparison, and a few things found and deliberately left as documented limitations) - see **[DEVLOG.md](DEVLOG.md)**.

## Running it locally

Backend:
```
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in the repo root (see `.env.example`) with your own Supabase project's `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, a `GROQ_API_KEY`, and a `DEMO_CLEANUP_SECRET` of your choosing - the backend loads it from there, not from `backend/`. Then, from `backend/`:
```
uvicorn app.main:app --reload
```

Frontend:
```
cd frontend
npm install
```

Create `frontend/.env.local` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_BACKEND_URL` (`http://localhost:8000` for local dev). Then:
```
npm run dev
```

Open `http://localhost:3000`, sign up, and upload a document to try the full flow.

## What I learned building this

This was the third project in my learning-to-code journey, built after a straightforward CRUD app, and it's the one with real algorithmic and AI-integration depth. Along the way it took me through:
- Designing a normalized Postgres schema (documents, chunks, concepts, questions, responses, mastery) and writing Row Level Security policies that actually enforce per-user isolation at the database level, not just in application code
- Prompt design for structured JSON output from an LLM, and handling the ways that can fail (malformed JSON, missing fields, a model that's been deprecated out from under you)
- Implementing a real spaced-repetition algorithm (SM-2) instead of reaching for a library
- Running a genuine security review of my own code and infrastructure - and learning to verify claims (like "is RLS actually enforced?") against the real system instead of trusting how a dashboard renders it
- The gap between "the client-side hint says only these file types" and "the server actually enforces it" - and where that enforcement really has to live
