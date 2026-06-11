# The Infinite Museum

Walk through endless museums of things that never existed.

Each room contains an AI-generated artifact, a fake historical description, and a fake civilization — all on a seeded, cacheable path you can share.

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Live AI generation (optional)

Copy `.env.example` to `.env` and add an API key:

```bash
cp .env.example .env
```

**Gemini (recommended)** — set `GEMINI_API_KEY` from [Google AI Studio](https://aistudio.google.com/apikey).

**OpenAI (alternative)** — set `OPENAI_API_KEY` instead.

If both keys are present, Gemini is used by default. Set `LLM_PROVIDER=openai` to prefer OpenAI.

Without a key, exhibits fall back to seeded mock catalog entries. Generated rooms are cached in IndexedDB — revisiting the same seed always shows the same exhibit.

## Controls

- **WASD** — walk
- **Mouse** — look (after entering the museum)
- **E** — enter the next room when near the exit
- **Esc** — release mouse / pause

## Share a room

Append a room seed to the URL: `?room=7f3a9c2e`
