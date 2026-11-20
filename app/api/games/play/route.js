import { randomInt, randomUUID } from 'node:crypto';
import { getSupabaseAdmin, getUserId, jsonError } from '@/lib/server';
import { resolveGame } from '@/lib/game-engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const allowedGames = new Set(['santas-slot', 'cursed-gift', 'frozen-roulette', 'reindeer-race', 'last-candle']);

function getResultLabel(gameCode, outcome) {
  if (gameCode === 'santas-slot') return ({ TRIPLE: 'THREE OF A KIND!', PAIR: 'A LUCKY PAIR!', MISS: 'NO MATCH THIS TIME' })[outcome.result] || 'THE REELS HAVE STOPPED';
  if (gameCode === 'cursed-gift') return ({ 'GOLDEN STAR': 'THE GOLDEN GIFT!', 'LUCKY BELL': 'A LUCKY GIFT!', 'LITTLE GIFT': 'A LITTLE PRESENT', 'EMPTY BOX': 'THE CURSED BOX...' })[outcome.prize] || 'THE BOX IS OPEN';
  if (gameCode === 'frozen-roulette') return outcome.result === outcome.selection ? 'THE WHEEL FAVOURS YOU!' : `THE WHEEL LANDED ON ${outcome.result}`;
  if (gameCode === 'reindeer-race') return outcome.winner === outcome.selected ? `REINDEER ${outcome.winner} WINS!` : `REINDEER ${outcome.winner} TAKES THE LEAD!`;
  if (gameCode === 'last-candle') return outcome.status === 'active' ? 'A CANDLE IS LIT!' : outcome.status === 'completed' ? (outcome.stage === 5 ? 'ALL FIVE CANDLES ARE BURNING!' : 'A WISE MOMENT TO COLLECT!') : 'THE FLAME WENT OUT...';
  return 'THE GAME IS OVER';
}

export async function POST(request) {
  try {
    const profileId = await getUserId();
    if (!profileId) return jsonError('로그인이 필요합니다.', 401);

    const body = await request.json();
    const gameCode = String(body.gameCode || '');
    const wagerText = String(body.wager ?? '');
    const requestId = String(body.requestId || '');
    if (!allowedGames.has(gameCode)) return jsonError('지원하지 않는 게임입니다.');
    if (gameCode !== 'last-candle' && !/^[0-9]+$/.test(wagerText)) return jsonError('베팅 금액은 1 이상의 정수로 입력해 주세요.');

    const wager = gameCode === 'last-candle' ? 0n : BigInt(wagerText);
    // Technical safe-integer ceiling keeps even a 10x payout exactly representable.
    if (gameCode !== 'last-candle' && (wager < 1n || wager > 900719925474099n)) return jsonError('베팅 금액을 안전한 정수 범위로 입력해 주세요.');
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) {
      return jsonError('요청 식별자가 올바르지 않습니다.');
    }

    const supabase = getSupabaseAdmin();

    if (gameCode === 'last-candle') {
      const action = String(body.action || 'start');
      if (!['start', 'continue', 'stop'].includes(action)) return jsonError('촛불 진행 요청이 올바르지 않습니다.');
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) {
        return jsonError('요청 식별자가 올바르지 않습니다.');
      }

      let candleWager = null;
      let sessionId = body.sessionId || null;
      if (action === 'start') {
        const wagerText = String(body.wager ?? '');
        if (!/^[0-9]+$/.test(wagerText)) return jsonError('베팅 금액은 1 이상의 정수로 입력해 주세요.');
        candleWager = BigInt(wagerText);
        if (candleWager < 1n || candleWager > 900719925474099n) return jsonError('베팅 금액을 안전한 정수 범위로 입력해 주세요.');
        sessionId = randomUUID();
      } else if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(sessionId || ''))) {
        return jsonError('촛불 라운드 정보가 올바르지 않습니다.');
      }

      const { data: profile, error: profileError } = await supabase
        .from('user_profiles').select('account_id').eq('id', profileId).single();
      if (profileError || !profile?.account_id) return jsonError('회원 정보를 확인하지 못했습니다.', 401);

      const idempotencyKey = `jingle:candle:${profile.account_id}:${requestId}`;
      const { data, error } = await supabase.rpc('play_jingle_candle_step', {
        p_account_id: profile.account_id,
        p_action: action,
        p_session_id: sessionId,
        p_wager: candleWager?.toString() ?? '0',
        p_success: action === 'stop' ? false : randomInt(100) < 80,
        p_idempotency_key: idempotencyKey,
      });
      if (error) {
        if (/포인트가 부족합니다/.test(error.message)) return jsonError(error.message, 409);
        throw error;
      }

      const saved = typeof data === 'string' ? JSON.parse(data) : data;
      return Response.json({
        result: {
          ...saved,
          wager: Number(saved?.wager ?? candleWager ?? 0),
          payout: Number(saved?.payout ?? 0),
          balance: Number(saved?.balance ?? 0),
        },
        resultLabel: getResultLabel(gameCode, { ...saved, status: saved?.status }),
      });
    }
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles').select('account_id').eq('id', profileId).single();
    if (profileError || !profile?.account_id) return jsonError('회원 정보를 확인하지 못했습니다.', 401);

    const { payout, outcome } = resolveGame(gameCode, wager, body.selection);
    const idempotencyKey = `jingle:${profile.account_id}:${requestId}`;
    const { data, error } = await supabase.rpc('play_jingle_game', {
      p_account_id: profile.account_id,
      p_game_code: gameCode,
      p_wager: wager.toString(),
      p_payout: payout.toString(),
      p_outcome: outcome,
      p_idempotency_key: idempotencyKey,
    });
    if (error) {
      if (/포인트가 부족합니다/.test(error.message)) return jsonError(error.message, 409);
      throw error;
    }

    const saved = typeof data === 'string' ? JSON.parse(data) : data;
    const savedOutcome = saved?.outcome || outcome;
    return Response.json({
      result: {
        ...saved,
        wager: Number(saved?.wager ?? wager),
        payout: Number(saved?.payout ?? payout),
        balance: Number(saved?.balance ?? 0),
      },
      resultLabel: getResultLabel(gameCode, savedOutcome),
    });
  } catch (error) {
    console.error('Jingle Jackpot game failed:', error);
    return jsonError(error.message || '게임을 처리하지 못했습니다.', 500);
  }
}
