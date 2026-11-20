# JINGLE JACKPOT!

A vintage Christmas game parlour built with Next.js 15, React, and Supabase.

## Current foundation

- Responsive Christmas casino / vintage European market landing page.
- Shared account registration and login using the existing `public.event_users` table.
- Password compatibility with the shared gift / gacha accounts (scrypt and legacy bcrypt).
- Profile linking through `public.user_profiles.account_id`.
- Read-only display of the existing shared point balance from `public.point_wallets.balance`.
- Five game areas, three seasonal event panels, and the two agreed leaderboard panels are laid out in the UI.

Game play is intentionally not enabled yet. Point spending, winnings, ranking records, and game results must be processed atomically on the server before the buttons are activated.

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set the following values in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_EXISTING_PROJECT.supabase.co
SUPABASE_SECRET_KEY=YOUR_SERVICE_ROLE_KEY
SESSION_SECRET=use-a-random-secret-at-least-32-characters-long
```

**Use the exact same Supabase project as the existing gift and gacha sites.** Do not create a new Supabase project and do not expose the service-role key in a `NEXT_PUBLIC_*` variable.

## Shared accounts

The app uses:

- `public.event_users` for shared login IDs and password hashes.
- `public.user_profiles.account_id` to link the game profile to the shared account.
- The existing scrypt password format, with bcrypt verification for legacy accounts.

A new account created here is stored in `event_users`, so it can be used on the gift and gacha sites too. Since each site has its own domain and cookie, users sign in separately on each site with the same credentials.

The shared-auth migration already used by the gift/gacha ecosystem must have been applied successfully in the existing Supabase project. Do not rerun the old schema or shared-auth migration just for this site.

## Shared point balance

The gacha app reads the authoritative balance from `point_wallets.balance`, keyed by `account_id`. This project reads that same value and does not use the legacy `user_profiles.points` field.

Before enabling game actions, apply the SQL migration at `supabase/migrations/202611200001_jingle_jackpot_shared_wallet.sql` in the existing Supabase project. It extends the allowed `source_site` value with `jingle-jackpot`, creates game-round history, and adds a service-role-only atomic game RPC. Review the migration before applying it; it does not create or replace the shared wallet tables. Then confirm the live definitions of:

- `public.point_wallets`
- `public.point_transactions`
- `public.change_shared_points(...)`

The game transaction must debit the wager, calculate the result, credit any winnings, and record the game history in one database transaction with idempotency protection. No browser-side balance writes and no separate game wallet are allowed.

## Deploy to Vercel

1. Import this repository into Vercel.
2. Keep the project root directory as `./`.
3. Add `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SECRET_KEY`, and `SESSION_SECRET` to the Vercel environment variables.
4. Deploy with the default Next.js build settings.

## Agreed product plan

### Games
1. Santa's Slot
2. The Cursed Gift
3. Frozen Roulette
4. Reindeer Race
5. The Last Candle

### Special events
- Golden Bell
- Christmas Lottery
- Advent Jackpot

### Leaderboards
- LUCKY STAR — cumulative winnings
- BIGGEST JACKPOT — largest single-game win

The site uses virtual points only. They have no cash value and cannot be withdrawn or exchanged for money.
