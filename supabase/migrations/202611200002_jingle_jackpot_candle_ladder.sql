-- Incremental candle game: wager once, then stop or risk the next candle.
CREATE TABLE IF NOT EXISTS public.jingle_candle_sessions (
  id uuid PRIMARY KEY,
  account_id uuid NOT NULL,
  wager bigint NOT NULL CHECK (wager > 0),
  stage integer NOT NULL DEFAULT 0 CHECK (stage BETWEEN 0 AND 5),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'lost', 'completed')),
  payout bigint NOT NULL DEFAULT 0 CHECK (payout >= 0),
  start_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.jingle_candle_actions (
  idempotency_key text PRIMARY KEY,
  account_id uuid NOT NULL,
  session_id uuid NOT NULL,
  response jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.jingle_candle_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jingle_candle_actions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.jingle_candle_sessions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.jingle_candle_actions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.jingle_candle_sessions TO service_role;
GRANT SELECT ON public.jingle_candle_actions TO service_role;

CREATE OR REPLACE FUNCTION public.play_jingle_candle_step(
  p_account_id uuid,
  p_action text,
  p_session_id uuid,
  p_wager bigint,
  p_success boolean,
  p_idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_session public.jingle_candle_sessions%ROWTYPE;
  v_cached jsonb;
  v_balance bigint;
  v_payout bigint := 0;
  v_stage integer;
  v_status text;
  v_outcome jsonb;
  v_response jsonb;
  v_multiplier numeric;
BEGIN
  IF p_account_id IS NULL OR p_idempotency_key IS NULL OR length(p_idempotency_key) < 16 THEN
    RAISE EXCEPTION '요청 정보를 확인해 주세요.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_account_id::text, 741902));

  SELECT response INTO v_cached
  FROM public.jingle_candle_actions
  WHERE idempotency_key = p_idempotency_key;
  IF FOUND THEN
    RETURN v_cached;
  END IF;

  IF p_action = 'start' THEN
    IF p_session_id IS NULL OR p_wager IS NULL OR p_wager < 1 OR p_success IS NULL THEN
      RAISE EXCEPTION '베팅 정보를 확인해 주세요.';
    END IF;

    IF EXISTS (SELECT 1 FROM public.jingle_candle_sessions WHERE id = p_session_id) THEN
      RAISE EXCEPTION '이미 사용된 촛불 라운드입니다.';
    END IF;

    PERFORM public.change_shared_points(
      p_account_id, -p_wager, 'jingle-jackpot', 'game_bet',
      'JINGLE JACKPOT / last-candle wager', p_idempotency_key || ':bet'
    );

    v_stage := CASE WHEN p_success THEN 1 ELSE 0 END;
    v_status := CASE WHEN p_success THEN 'active' ELSE 'lost' END;

    INSERT INTO public.jingle_candle_sessions(id, account_id, wager, stage, status, start_key)
    VALUES (p_session_id, p_account_id, p_wager, v_stage, v_status, p_idempotency_key);

    SELECT balance INTO v_balance FROM public.point_wallets WHERE account_id = p_account_id;

    IF NOT p_success THEN
      v_outcome := jsonb_build_object('stage', 0, 'attempts', 1, 'success', false);
      INSERT INTO public.jingle_game_rounds(account_id, game_code, wager, payout, outcome, idempotency_key)
      VALUES (p_account_id, 'last-candle', p_wager, 0, v_outcome, 'jingle:candle:round:' || p_session_id::text);
    ELSE
      v_outcome := jsonb_build_object('stage', 1, 'attempts', 1, 'success', true);
    END IF;

    v_response := jsonb_build_object(
      'sessionId', p_session_id, 'status', v_status, 'stage', v_stage,
      'wager', p_wager, 'payout', 0, 'balance', coalesce(v_balance, 0), 'outcome', v_outcome
    );

  ELSE
    IF p_session_id IS NULL OR p_action NOT IN ('continue', 'stop') THEN
      RAISE EXCEPTION '촛불 진행 요청이 올바르지 않습니다.';
    END IF;

    SELECT * INTO v_session
    FROM public.jingle_candle_sessions
    WHERE id = p_session_id AND account_id = p_account_id
    FOR UPDATE;

    IF NOT FOUND OR v_session.status <> 'active' THEN
      RAISE EXCEPTION '진행 중인 촛불 라운드를 찾을 수 없습니다.';
    END IF;

    v_stage := v_session.stage;
    v_status := v_session.status;
    v_payout := 0;

    IF p_action = 'continue' THEN
      IF v_stage >= 5 OR p_success IS NULL THEN
        RAISE EXCEPTION '더 진행할 수 없는 촛불 라운드입니다.';
      END IF;

      IF p_success THEN
        v_stage := v_stage + 1;
        IF v_stage = 5 THEN
          v_multiplier := 3.0;
          v_payout := floor(v_session.wager * v_multiplier)::bigint;
          PERFORM public.change_shared_points(
            p_account_id, v_payout, 'jingle-jackpot', 'game_payout',
            'JINGLE JACKPOT / last-candle payout', p_idempotency_key || ':payout'
          );
          v_status := 'completed';
        END IF;
      ELSE
        v_status := 'lost';
      END IF;
    ELSE
      v_multiplier := CASE v_stage
        WHEN 1 THEN 1.15 WHEN 2 THEN 1.45 WHEN 3 THEN 1.85
        WHEN 4 THEN 2.4 WHEN 5 THEN 3.0 ELSE 0 END;
      v_payout := floor(v_session.wager * v_multiplier)::bigint;
      PERFORM public.change_shared_points(
        p_account_id, v_payout, 'jingle-jackpot', 'game_payout',
        'JINGLE JACKPOT / last-candle payout', p_idempotency_key || ':payout'
      );
      v_status := 'completed';
    END IF;

    UPDATE public.jingle_candle_sessions
    SET stage = v_stage, status = v_status, payout = v_payout, updated_at = now()
    WHERE id = p_session_id;

    IF v_status <> 'active' THEN
      v_outcome := jsonb_build_object(
        'stage', v_stage,
        'attempts', CASE WHEN p_action = 'continue' AND NOT p_success THEN v_stage + 1 ELSE v_stage END,
        'success', v_status = 'completed'
      );
      INSERT INTO public.jingle_game_rounds(account_id, game_code, wager, payout, outcome, idempotency_key)
      VALUES (p_account_id, 'last-candle', v_session.wager, v_payout, v_outcome, 'jingle:candle:round:' || p_session_id::text);
    ELSE
      v_outcome := jsonb_build_object('stage', v_stage, 'attempts', v_stage, 'success', true);
    END IF;

    SELECT balance INTO v_balance FROM public.point_wallets WHERE account_id = p_account_id;
    v_response := jsonb_build_object(
      'sessionId', p_session_id, 'status', v_status, 'stage', v_stage,
      'wager', v_session.wager, 'payout', v_payout,
      'balance', coalesce(v_balance, 0), 'outcome', v_outcome
    );
  END IF;

  INSERT INTO public.jingle_candle_actions(idempotency_key, account_id, session_id, response)
  VALUES (p_idempotency_key, p_account_id, p_session_id, v_response);

  RETURN v_response;
END;
$function$;

REVOKE ALL ON FUNCTION public.play_jingle_candle_step(uuid, text, uuid, bigint, boolean, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.play_jingle_candle_step(uuid, text, uuid, bigint, boolean, text) TO service_role;

-- Refresh PostgREST's function cache so the candle RPC is callable immediately.
NOTIFY pgrst, 'reload schema';
