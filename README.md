# 🏭 Content Factory

A full-stack web application that automates the weekly content pipeline for Delta (investment tracker by eToro). Handles research, content validation, carousel briefing, asset creation, and post-publish analytics.

## Quick Start

```bash
npm install
cp .env.example .env   # Fill in your API keys
npm run dev             # Starts server on :3000 and client on :5173
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude research |
| `FIGMA_ACCESS_TOKEN` | Figma personal access token |
| `FIGMA_FILE_ID` | Figma file ID (default: `RiCMWapLKbsuNXcKKqRo27`) |
| `FIGMA_START_NODE_ID` | Root node of carousel template (`1-19`) |
| `FIGMA_FRAME_NODE_IDS` | Comma-separated node IDs for the 6 carousel frames |
| `FIGMA_TEXT_NODE_MAP` | JSON mapping slide field keys to Figma text node IDs |
| `WEAVY_API_KEY` | Weavy.ai API key (mockup compositing only) |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Stringified Google service account credentials |
| `GOOGLE_DRIVE_FOLDER_ID` | Target Google Drive folder for exports |
| `IG_ACCESS_TOKEN` | Instagram Graph API token (read-only insights) |
| `IG_USER_ID` | Instagram user/page ID |
| `LINKEDIN_ACCESS_TOKEN` | LinkedIn API token (read-only stats) |
| `LINKEDIN_AUTHOR_URN` | LinkedIn organization/person URN |
| `X_BEARER_TOKEN` | X/Twitter bearer token (read-only metrics) |
| `PORT` | Server port (default: 3000) |

## Getting Figma Node IDs

1. Open the [2025-Socials Figma file](https://www.figma.com/design/RiCMWapLKbsuNXcKKqRo27/2025-Socials?node-id=1-19)
2. Select a text layer in your carousel template
3. The node ID appears in the URL after `node-id=` (e.g., `123:456`)
4. Alternatively, right-click a layer → "Copy link" and extract the node ID
5. Enter node IDs in the Settings page under "Figma Node ID Mapper"

### Node ID mapping keys

| Key | Slide | Field |
|-----|-------|-------|
| `slide1_title` | Slide 1 | Hook headline |
| `slide1_subtitle` | Slide 1 | Subtitle |
| `slide1_description` | Slide 1 | Description/teaser |
| `slide1_swipe_cta` | Slide 1 | Swipe CTA text |
| `slide2_title` – `slide5_title` | Slides 2–5 | Title |
| `slide2_description` – `slide5_description` | Slides 2–5 | Body text |
| `slide6_cta` | Slide 6 | CTA headline |

## Architecture

- **Frontend:** React + TypeScript + Tailwind CSS (Vite)
- **Backend:** Node.js + Express + TypeScript
- **Database:** SQLite via better-sqlite3
- **APIs:** Anthropic Claude, Figma, Weavy.ai, Google Drive, Instagram, LinkedIn, X

## Pipeline Flow

1. **Research** — Claude searches the web, evaluates topics, produces a scored brief
2. **Approval** — Review the brief, request changes, or approve
3. **Creation** — Populate Figma template, composite mockups (Weavy), export to Drive
4. **Ready** — Download slides, copy captions, post manually
5. **Posted** — Enter post IDs, start analytics monitoring
6. **Analytics** — Auto-fetch metrics at 24h, 48h, 7d; compute performance score

## Phone Mockups

Place phone mockup PNG frames in `server/assets/mockups/`. The tool composites uploaded Delta app screenshots into these frames using Weavy.ai.
