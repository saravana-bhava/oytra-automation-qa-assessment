# Task 2 — HN Morning Brief (n8n)

**APIs used**

1. `https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=30`: the current HackerNews front page with points and comment counts.
2. `https://hacker-news.firebaseio.com/v0/item/<id>.json`, called twice. The first call fetches the #1 story's item and gets its `kids` (comment ids). The second fetches the top comment, which is added to the digest as the enrichment.

**Why these:**
- Both APIs are free and need no key, so the workflow runs anywhere.
- The data changes hourly, so the trigger is meaningful.
- They're two separate services, which makes the enrichment a real second API call.

**Transformation:** the *Top 5 by points* Code node:
- drops items without a title
- sorts by points
- keeps 5
- reshapes each item to `{rank, id, title, url, points, comments, author}`. Self-posts get the HN discussion URL.

*Build digest* strips HTML from the comment, escapes the text for Telegram's HTML mode and builds one message.

**Branch:** the *IF* node routes on `topPoints > 300`. Above it, the message goes out as a “🔥 hot day” brief; otherwise as a normal brief.

**Error path:**
- Each HTTP node has *Retry on fail* (3 tries, 2 s apart) and *On Error → continue (using error output)*.
- All error outputs go to *Format API error*, then *Telegram: error fallback*, which sends the error message and a timestamp.
- Telegram nodes also retry 3×.
- The workflow's *Error workflow* setting points to `error-handler`. That workflow uses an Error Trigger to report any unexpected crash with the node name and execution link.
- Tested: blocking `hn.algolia.com` produced the fallback alert ([screenshot](screenshots/execution-error-fallback.png)).

**Credentials:** the Telegram token is stored in n8n Credentials (`Telegram – Oytra brief bot`). There are no secrets in the JSON. Replace `YOUR_TELEGRAM_CHAT_ID` after import.

Screenshots:
- [canvas](screenshots/canvas.png)
- [successful execution (canvas)](screenshots/execution-success-canvas.png)
- [successful execution (node output)](screenshots/execution-success.png)
- [error fallback run](screenshots/execution-error-fallback.png)
