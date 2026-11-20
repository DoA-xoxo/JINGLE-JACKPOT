import { getSupabaseAdmin, createUserSession, jsonError } from '@/lib/server';
import { hashSharedPassword } from '@/lib/shared-password';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const body = await request.json();
    const nickname = String(body.nickname || '').trim();
    const password = body.password;
    if (!nickname || nickname.length > 20 || !/^[a-zA-Z0-9가-힣_-]+$/.test(nickname)) {
      return jsonError('아이디는 한글, 영문, 숫자, _ 또는 -로 1~20자 입력해 주세요.');
    }
    if (typeof password !== 'string' || password.length < 4 || password.length > 128) {
      return jsonError('비밀번호는 4~128자로 입력해 주세요.');
    }

    const supabase = getSupabaseAdmin();
    const password_hash = await hashSharedPassword(password);
    const { data: account, error: accountError } = await supabase
      .from('event_users')
      .insert({ nickname, password_hash })
      .select('id,nickname')
      .single();

    if (accountError) {
      if (accountError.code === '23505') return jsonError('이미 사용 중인 아이디입니다.', 409);
      throw accountError;
    }

    let { data: profile, error: profileError } = await supabase
      .from('user_profiles').select('id,nickname,account_id')
      .eq('account_id', account.id).maybeSingle();

    if (!profile && !profileError) {
      const created = await supabase.from('user_profiles')
        .insert({ account_id: account.id, nickname: account.nickname })
        .select('id,nickname,account_id').single();
      profile = created.data;
      profileError = created.error;
    }
    if (profileError || !profile) {
      await supabase.from('event_users').delete().eq('id', account.id);
      throw profileError || new Error('회원 프로필을 생성하지 못했습니다.');
    }

    await createUserSession(profile);
    return Response.json({ user: { nickname: profile.nickname } }, { status: 201 });
  } catch (error) {
    console.error('Jingle Jackpot registration failed:', error);
    return jsonError(error.message || '회원가입에 실패했습니다.', 500);
  }
}
