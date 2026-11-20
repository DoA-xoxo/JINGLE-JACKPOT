-- JINGLE JACKPOT shared-wallet integration
-- Apply this migration in the EXISTING Supabase project used by gift and gacha.
-- This migration preserves the shared wallet and transaction tables.

-- 1) Permit this site as a source while preserving the existing function behavior.
CREATE OR REPLACE FUNCTION public.change_shared_points(
  p_account_id uuid,
  p_delta bigint,
  p_source_site text,
  p_transaction_type text,
  p_description text DEFAULT ''::text,
  p_idempotency_key text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_balance bigint;
BEGIN
  IF p_account_id IS NULL OR p_delta = 0 THEN
    RAISE EXCEPTION '회원과 포인트 금액을 확인해 주세요.';
  END IF;

  IF p_source_site NOT IN ('gacha', 'market', 'gift', 'admin', 'system', 'jingle-jackpot') THEN
    RAISE EXCEPTION '잘못된 사이트 구분입니다.';
  END IF;

  IF p_transaction_type IS NULL OR length(p_transaction_type) > 40 THEN
    RAISE EXCEPTION '거래 유형을 확인해 주세요.';
  END IF;

  IF p_idempotency_key IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.point_transactions
    WHERE idempotency_key = p_idempotency_key
  ) THEN
    SELECT balance INTO v_balance
    FROM public.point_wallets
    WHERE account_id = p_account_id;

    RETURN jsonb_build_object(
      'ok', true,
      'duplicate', true,
      'balance', coalesce(v_balance, 0)
    );
  END IF;

  INSERT INTO public.point_wallets(account_id, balance)
  VALUES (p_account_id, 0)
  ON CONFLICT (account_id) DO NOTHING;

  SELECT balance INTO v_balance
  FROM public.point_wallets
  WHERE account_id = p_account_id
  FOR UPDATE;

  IF v_balance + p_delta < 0 THEN
    RAISE EXCEPTION '포인트가 부족합니다. 현재 잔액: %P', v_balance;
  END IF;

  UPDATE public.point_wallets
  SET balance = balance + p_delta,
      updated_at = now()
  WHERE account_id = p_account_id
  RETURNING balance INTO v_balance;

  INSERT INTO public.point_transactions (
    account_id, amount, transaction_type, source_site, description, idempotency_key
  )
  VALUES (
    p_account_id, p_delta, p_transaction_type, p_source_site,
    coalesce(p_description, ''), p_idempotency_key
  );

  RETURN jsonb_build_object('ok', true, 'duplicate', false, 'balance', v_balance);
END;
$function$;

-- 2) One row per completed game round. No separate wallet is created.
CREATE TABLE IF NOT EXISTS public.jingle_game_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  game_code text NOT NULL CHECK (
    game_code IN ('santas-slot', 'cursed-gift', 'frozen-roulette', 'reindeer-race', 'last-candle')
  ),
  wager bigint NOT NULL CHECK (wager > 0),
  payout bigint NOT NULL DEFAULT 0 CHECK (payout >= 0),
  net bigint GENERATED ALWAYS AS (payout - wager) STORED,
  outcome jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS jingle_game_rounds_account_created_idx
  ON public.jingle_game_rounds (account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS jingle_game_rounds_game_created_idx
  ON public.jingle_game_rounds (game_code, created_at DESC);
CREATE INDEX IF NOT EXISTS jingle_game_rounds_net_idx
  ON public.jingle_game_rounds (net DESC, created_at ASC);

-- 3) Atomically debit the wager, credit the payout, and record the round.
-- Only the trusted Next.js server (service_role) may execute this function.
CREATE OR REPLACE FUNCTION public.play_jingle_game(
  p_account_id uuid,
  p_game_code text,
  p_wager bigint,
  p_payout bigint,
  p_outcome jsonb,
  p_idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_existing public.jingle_game_rounds%ROWTYPE;
  v_debit jsonb;
  v_credit jsonb;
  v_balance bigint;
  v_round_id uuid;
BEGIN
  IF p_account_id IS NULL THEN
    RAISE EXCEPTION '로그인이 필요합니다.';
  END IF;
  IF p_game_code NOT IN ('santas-slot', 'cursed-gift', 'frozen-roulette', 'reindeer-race', 'last-candle') THEN
    RAISE EXCEPTION '지원하지 않는 게임입니다.';
  END IF;
  IF p_wager IS NULL OR p_wager < 1 OR p_payout IS NULL OR p_payout < 0 THEN
    RAISE EXCEPTION '베팅 금액 또는 당첨금을 확인해 주세요.';
  END IF;
  IF p_idempotency_key IS NULL OR length(p_idempotency_key) < 16 OR length(p_idempotency_key) > 180 THEN
    RAISE EXCEPTION '요청 식별자가 올바르지 않습니다.';
  END IF;

  -- Serialize rounds for the same account, then re-check idempotency.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_account_id::text, 741902));

  SELECT * INTO v_existing
  FROM public.jingle_game_rounds
  WHERE idempotency_key = p_idempotency_key;

  IF FOUND THEN
    SELECT balance INTO v_balance
    FROM public.point_wallets
    WHERE account_id = p_account_id;
    RETURN jsonb_build_object(
      'ok', true, 'duplicate', true, 'round_id', v_existing.id,
      'payout', v_existing.payout, 'wager', v_existing.wager,
      'balance', coalesce(v_balance, 0), 'outcome', v_existing.outcome
    );
  END IF;

  v_debit := public.change_shared_points(
    p_account_id, -p_wager, 'jingle-jackpot', 'game_bet',
    'JINGLE JACKPOT / ' || p_game_code || ' wager',
    p_idempotency_key || ':bet'
  );

  IF p_payout > 0 THEN
    v_credit := public.change_shared_points(
      p_account_id, p_payout, 'jingle-jackpot', 'game_payout',
      'JINGLE JACKPOT / ' || p_game_code || ' payout',
      p_idempotency_key || ':payout'
    );
    v_balance := (v_credit->>'balance')::bigint;
  ELSE
    v_balance := (v_debit->>'balance')::bigint;
  END IF;

  INSERT INTO public.jingle_game_rounds (
    account_id, game_code, wager, payout, outcome, idempotency_key
  )
  VALUES (
    p_account_id, p_game_code, p_wager, p_payout,
    coalesce(p_outcome, '{}'::jsonb), p_idempotency_key
  )
  RETURNING id INTO v_round_id;

  RETURN jsonb_build_object(
    'ok', true, 'duplicate', false, 'round_id', v_round_id,
    'wager', p_wager, 'payout', p_payout, 'balance', v_balance,
    'outcome', coalesce(p_outcome, '{}'::jsonb)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.play_jingle_game(uuid, text, bigint, bigint, jsonb, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.play_jingle_game(uuid, text, bigint, bigint, jsonb, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.play_jingle_game(uuid, text, bigint, bigint, jsonb, text) TO service_role;

-- Do not expose game history for direct client writes.
ALTER TABLE public.jingle_game_rounds ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.jingle_game_rounds FROM anon, authenticated;
GRANT SELECT ON TABLE public.jingle_game_rounds TO service_role;
