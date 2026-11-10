# Automation & QA Developer — Take-Home Assessment (Oytra)

Candidate: **Saravana** · Submitted 10 Nov 2026

| Part | Deliverable | Where |
|---|---|---|
| Task 1 — Web App QA & Debug | `Task1_QA_Report_Saravana.pdf` (12 issues + root-cause analysis) | [`task1/`](task1/) |
| Task 2 — n8n API workflow | `Task2_Workflow_Saravana.json` + screenshots + README | [`task2/`](task2/) |
| Bonus — Uptime monitor | `Bonus_UptimeMonitor_Saravana.json` + screenshot | [`bonus/`](bonus/) |
| Error workflow | Error Trigger → Telegram (linked to both workflows) | [`error-handler/`](error-handler/) |
| Video walkthrough | `walkthrough.mp4` | [`video/`](video/) |

## Documentation (1 page)

### Task 1 — QA of a “vibe-coded” app

- **App tested:** the official RealWorld “Conduit” live demo (`demo.realworld.show`, Angular 21 + REST API). The PDF's `demo.realworld.io` URL is gone (S3 `NoSuchBucket`), and the project moved its demo to `.show`.
- **Method:**
  - Scripted every main flow in a real Chrome (Puppeteer): sign-up, login, create, edit, delete, logout.
  - Probed the API directly with curl for validation, auth, pagination, CORS and latency.
  - Repro scripts are in [`task1/qa/`](task1/qa/).
- **Results:** 12 issues (1 Critical, 2 High, 5 Medium, 4 Low). I also list what passed: XSS escaping, double-submit guard, auth guard.
- **Root-cause analysis:** a whitespace-only title creates an article with an **empty slug**. It can never be opened, edited or deleted. The report covers the cause (presence check without trim, plus a slugify edge case) and a 6-step fix with a regression test.

### Task 2 — “HN Morning Brief” workflow

`Schedule (1h) / Webhook` → **HN Algolia API** (front page) → **Code**: top 5 by points → **HN Firebase API** (#1 story item → its top comment) → **Code**: build digest → **IF** #1 points > 300 → Telegram “🔥 hot” or “📰 normal” message.

- **API choice:** HackerNews needs no key and has two independent APIs (Algolia search and Firebase items), so the enrichment step is a real second call.
- **Error path:** every HTTP node retries 3× (2 s apart), then routes its **error output** to *Format API error* → *Telegram: error fallback*. Nothing fails silently. I tested this by blackholing `hn.algolia.com` inside the container ([screenshot](task2/screenshots/execution-error-fallback.png)). Anything that still crashes triggers the separate **Error Trigger** workflow.
- **Secrets:** the Telegram bot token lives only in n8n's Credentials store. The exported JSON references the credential by id and name. The chat id is replaced with `YOUR_TELEGRAM_CHAT_ID`.

### Bonus — Uptime monitor

Every 5 min, a Code node GETs the app with up to **3 attempts** and measures **response time**. Then:

- Non-200 → 🚨 DOWN alert.
- 200 but > 3 s → 🐢 slow warning.
- Each check is appended to workflow static data, and a **daily 09:00** trigger posts uptime %, average and worst response time, and failure count.

### How to run

```bash
docker run -it --rm -p 5678:5678 -v n8n_data:/home/node/.n8n docker.n8n.io/n8nio/n8n
```

1. Import the JSON files.
2. Create a *Telegram API* credential (bot token from @BotFather).
3. Set the chat id.
4. Publish.

Trigger the brief manually with `curl http://localhost:5678/webhook/morning-brief`.

Tested on n8n 2.46.7 (self-hosted, Docker).
