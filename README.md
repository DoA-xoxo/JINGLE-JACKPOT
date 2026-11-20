# JINGLE JACKPOT!

A vintage Christmas game parlour built with Next.js 15, React, and Supabase.

## Current foundation

- Responsive Christmas casino / vintage European market landing page.
- Shared account registration and login using the existing `public.event_users` table.
- Password compatibility with the shared gift / gacha accounts (scrypt and legacy bcrypt).
- Profile linking through `public.user_profiles.account_id`.
- Read-only display of the existing shared point balance from `public.point_wallets.balance`.
- Five server-resolved games, three seasonal event panels, and two leaderboard panels.

## Shared account and points

The app uses:

- `public.event_users` for shared login IDs and password hashes.
- `public.user_profiles.account_id` to link the game profile to the shared account.
- The existing scrypt password format, with bcrypt verification for legacy accounts.
- The existing `public.point_wallets` and `public.point_transactions` tables. No separate wallet is created.

A new account created here is stored in `event_users`, so it can be used on the gift and gacha sites too. Since each site has its own domain and cookie, users sign in separately on each site with the same credentials.

**Use the exact same Supabase project as the existing gift and gacha sites.** Do not create a new Supabase project and do not expose the service-role key in a `NEXT_PUBLIC_*` variable.

## Database migration — required before gameplay

Apply `supabase/migrations/202611200001_jingle_jackpot_shared_wallet.sql` in the existing Supabase project before enabling gameplay in a public deployment.

The migration:

1. Extends the existing `change_shared_points` RPC to accept `jingle-jackpot` as a source site.
2. Creates `jingle_game_rounds` to record completed game rounds.
3. Adds the service-role-only `play_jingle_game` RPC. It debits the wager, credits the payout, and records the round in one database transaction with idempotency protection.
4. Adds the service-role-only `get_jingle_leaderboards` RPC.

It does not create, replace, or reset the shared wallet tables. Review the SQL before applying it. The migration has been prepared in this repository but must still be applied manually to the existing Supabase project.

## Game rules

All outcomes are generated on the server with Node's cryptographic random number generator. The browser sends only the game choice, wager, and selection; it cannot submit a desired outcome or payout. Wagers are whole-number points. Payouts include the original wager.

| Game | Result | Gross payout |
|---|---|---:|
| Santa's Slot | Three matching symbols | 8x |
| Santa's Slot | Exactly one matching pair | 1.2x |
| Santa's Slot | No match | 0x |
| The Cursed Gift | One of five shuffled boxes: 1 jackpot, 1 lucky, 1 small, 2 empty | 2.5x / 1.5x / 1x / 0x |
| Frozen Roulette | 12 pockets: 6 red, 5 green, 1 gold | Red 1.8x / Green 2.2x / Gold 10x |
| Reindeer Race | Four reindeer with 40% / 30% / 20% / 10% win probabilities | 2.2x / 3x / 4.5x / 8x |
| The Last Candle | Each candle has an independent 80% chance to stay lit; all selected candles must stay lit | 1 candle 1.15x, 2 candles 1.45x, 3 candles 1.85x, 4 candles 2.4x, 5 candles 3x |

A payout is the total amount credited, including the wager amount. For example, a 100P wager with a 200P payout increases the wallet by 100P net.

There is no configured gameplay minimum or preset wager list. The server enforces a technical integer-safety ceiling so the wager and the maximum 10x payout remain exactly representable.

## Leaderboards

- **LUCKY STAR** — sum of gross payouts received across all recorded games.
- **BIGGEST JACKPOT** — largest gross payout from a single game.

Both rankings count gross payouts and do not subtract wagers. No current-balance ranking is provided.

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

## Deploy to Vercel

1. Import this repository into Vercel.
2. Keep the project root directory as `./`.
3. Add `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SECRET_KEY`, and `SESSION_SECRET` to the Vercel environment variables.
4. Apply the database migration to the existing Supabase project.
5. Deploy with the default Next.js build settings.

The site uses virtual points only. They have no cash value and cannot be withdrawn or exchanged for money.
