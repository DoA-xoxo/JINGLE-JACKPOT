import { getSupabaseAdmin, getUserId, jsonError } from '@/lib/server';
import { resolveGame } from '@/lib/game-engine';

export const runtime = 'nodejs';

const allowedGames = new Set(['santas-slot', 'cursed-gift', 'frozen-roulette', 'reindeer-race', 'last-candle']);

export async function POST(request) {
  try {
    const profileId = await getUserId();
    if (!profileId) return jsonError('로그인이 필요합니다.', 401);

    const body = await request.json();
    const gameCode = String(body.gameCode || '');
    const wagerText = String(body.wager ?? '');
    const requestId = String(body.requestId || '');
    if (!allowedGames.has(gameCode)) return jsonError('지원하지 않는 게임입니다.');
    if (!/^\d+$/.test(wagerText) || BigInt(wagerText) < 1n || BigInt(wagerText) > 9007199254740991n) {
      return jsonError('베팅 금액은 1 이상의 정수로 입력해 주세요.');
    }
    if (!/^[0-9a-f-]{36}$/i.test(requestId)) return jsonError('요청 식별자가 올바르지 않습니다.');

    const supabase = getSupabaseAdmin();
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles').select('account_id').eq('id', profileId).single();
    if (profileError || !profile?.account_id) return jsonError('회원 정보를 확인하지 못했습니다.', 401);

    const wager = BigInt(wagerText);
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
    const savedOutcome = data?.outcome || outcome;
    return Response.json({
      result: data,
      resultLabel: savedOutcome.result || savedOutcome.prize || (savedOutcome.success ? 'ALL CANDLES LIT' : savedOutcome.winner ? `WINNER: ${savedOutcome.winner}` : savedOutcome.lit !== undefined ? `${savedOutcome.lit}/${savedOutcome.stages} CANDLES` : 'RESULT'),
    });
  } catch (error) {
    console.error('Jingle Jackpot game failed:', error);
    return jsonError(error.message || '게임을 처리하지 못했습니다.', 500);
  }
}
