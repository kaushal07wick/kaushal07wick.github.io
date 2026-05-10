# stats/

Auto-generated visit counts. Updated every Monday by `.github/workflows/weekly-stats.yml`.

- `latest.json` — most recent snapshot: `{ date, timestamp, count }`
- `visits.json` — full history: array of weekly snapshots

## Live count

The site uses [abacus](https://abacus.jasoncameron.dev/) (free, no signup) to count visits.
A page-view is counted at most once per browser per day (gated by `localStorage`).

You can read the current count anytime:

```bash
curl https://abacus.jasoncameron.dev/get/kaushal07wick-github-io/visits
# → {"value": 1234}
```

## Weekly email

GitHub commits the snapshot every Monday. If you have repo notifications turned on
(your default for repos you own), you'll get an email for each commit — that's your
weekly visit-count digest.

To reduce noise: GitHub → Settings → Notifications → Watching → "Participating, @mentions, and custom".
