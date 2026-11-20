import { getSupabaseAdmin, getUserId, jsonError } from '@/lib/server';

export async function GET() {
  try {
    const id = await getUserId();
    if (!id) return Response.json({ user: null });
    const supabase = getSupabaseAdmin();
    const { data: profile, error } = await supabase
      .from('user_profiles').select('id,nickname,account_id,tokens')
      .eq('id', id).single();
    if (error) throw error;

    // Read the existing shared gacha wallet. Never use the legacy user_profiles.points field.
    const { data: wallet, error: walletError } = await supabase
      .from('point_wallets').select('balance').eq('account_id', profile.account_id).maybeSingle();
    if (walletError) throw walletError;

    return Response.json({ user: { nickname: profile.nickname, points: Number(wallet?.balance ?? 0) } });
  } catch (error) {
    return jsonError(error.message || '회원 정보를 불러오지 못했습니다.', 500);
  }
}
