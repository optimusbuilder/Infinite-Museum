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

Copy `.env.example` to `.env` and add your OpenAI API key:

```bash
cp .env.example .env
# Edit .env and set OPENAI_API_KEY=sk-...
```

Without a key, exhibits fall back to seeded mock catalog entries. Generated rooms are cached in IndexedDB — revisiting the same seed always shows the same exhibit.

## Controls

- **WASD** — walk
- **Mouse** — look (after entering the museum)
- **E** — enter the next room when near the exit
- **Esc** — release mouse / pause

## Share a room

Append a room seed to the URL: `?room=7f3a9c2e`
