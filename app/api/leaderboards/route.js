import { getSupabaseAdmin } from '@/lib/server';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc('get_jingle_leaderboards');
    if (error) throw error;
    return Response.json(data || { luckyStar: [], biggestJackpot: [] }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Jingle Jackpot leaderboard failed:', error);
    return Response.json({ error: '랭킹을 불러오지 못했습니다.' }, { status: 500 });
  }
}
