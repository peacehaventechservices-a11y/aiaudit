# AI Opportunity Audit → Build Pipeline

Next.js app. **Start with [START-HERE.md](START-HERE.md)** for what this project is,
then [docs/phase1-build-spec.md](docs/phase1-build-spec.md) for what's being built now.

## Local development

```bash
npm install
npm run dev      # dev server at http://localhost:3000
npm test         # unit tests (Vitest)
npm run build    # production build
```

Copy `.env.example` to `.env.local` and fill in the real values before running anything
that touches Supabase, Claude, Bright Data, or email.
