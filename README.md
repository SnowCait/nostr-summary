# Nostr Summary

A bot that posts when Nostr-related repositories are updated.

## Required secrets

- Nostr Private Key
- GitHub Access Token (optional)

## Develop

### Create `.env`

```dotenv
NOSTR_NSEC=nsec1...
GITHUB_TOKEN=
RELAYS="wss://relay1.example.com/
wss://relay2.example.com/"
```

### Run

```bash
npm run dev
curl "http://localhost:8787/__scheduled?cron=*+*+*+*+*"
```

## Deploy

```bash
npx wrangler secret put NOSTR_NSEC
npx wrangler secret put GITHUB_TOKEN
npm run deploy
```
