'use client';

import { useEffect, useState } from 'react';

const games = [
  { no: '01', title: "SANTA'S SLOT", type: 'THE CLASSIC', desc: '세 개의 릴이 멈추는 순간, 산타의 선물이 결정돼요.', rule: '세 그림 일치 8배 · 두 그림 일치 1.2배 · 그 외 0배', symbol: '✳', color: 'red' },
  { no: '02', title: 'THE CURSED GIFT', type: 'MYSTERY BOX', desc: '무엇이 들어 있을까요? 행운일까, 꽝일까?', rule: '잭팟 2.5배 · 행운 1.5배 · 작은 선물 1배 · 꽝 0배', symbol: '♜', color: 'green' },
  { no: '03', title: 'FROZEN ROULETTE', type: 'SPIN & WIN', desc: '차가운 운명의 룰렛을 돌려 보세요.', rule: 'RED 6칸 1.8배 · GREEN 5칸 2.2배 · GOLD 1칸 10배', symbol: '❄', color: 'gold' },
  { no: '04', title: 'REINDEER RACE', type: 'RACE GAME', desc: '루돌프의 질주에 포인트를 걸어 보세요.', rule: '순록별 우승 확률 40% / 30% / 20% / 10% · 배당 2.2배 / 3배 / 4.5배 / 8배', symbol: '♞', color: 'green' },
  { no: '05', title: 'THE LAST CANDLE', type: 'RISK OR STOP', desc: '한 번 더 도전할까요, 여기서 멈출까요?', rule: '촛불마다 성공 확률 80% · 1~5개 모두 성공해야 1.15~3배 지급', symbol: '♧', color: 'red' },
];
const events = [
  { title: 'GOLDEN BELL', sub: 'A golden surprise' },
  { title: 'CHRISTMAS LOTTERY', sub: 'The lucky draw' },
  { title: 'ADVENT JACKPOT', sub: 'A seasonal grand prize' },
];

export default function Home() {
  const [user, setUser] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [mode, setMode] = useState('login');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [activeGame, setActiveGame] = useState(null);
  const [wager, setWager] = useState('100');
  const [selection, setSelection] = useState('1');
  const [playing, setPlaying] = useState(false);
  const [playResult, setPlayResult] = useState(null);
  const [boards, setBoards] = useState({ luckyStar: [], biggestJackpot: [] });

  async function refreshUser() {
    const res = await fetch('/api/me', { cache: 'no-store' });
    const data = await res.json();
    setUser(data.user || null);
  }
  useEffect(() => {
    refreshUser().catch(() => {});
    fetch('/api/leaderboards', { cache: 'no-store' }).then(r => r.json()).then(setBoards).catch(() => {});
  }, []);

  async function submitAuth(e) {
    e.preventDefault();
    setBusy(true); setMessage('');
    try {
      const res = await fetch('/api/auth/' + mode, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '요청을 처리하지 못했습니다.');
      await refreshUser();
      setAuthOpen(false); setNickname(''); setPassword('');
    } catch (err) { setMessage(err.message); }
    finally { setBusy(false); }
  }

  async function playGame(e) {
    e.preventDefault();
    if (!user) { setActiveGame(null); setMode('login'); setAuthOpen(true); return; }
    setPlaying(true); setPlayResult(null);
    try {
      const res = await fetch('/api/games/play', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameCode: activeGame.code, wager, selection, requestId: crypto.randomUUID() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '게임을 진행하지 못했습니다.');
      setPlayResult(data);
      await refreshUser();
      fetch('/api/leaderboards', { cache: 'no-store' }).then(r => r.json()).then(setBoards).catch(() => {});
    } catch (err) { setPlayResult({ error: err.message }); }
    finally { setPlaying(false); }
  }

  function openGame(game) {
    setActiveGame(game);
    setWager('100');
    setSelection(game.code === 'frozen-roulette' ? 'RED' : '1');
    setPlayResult(null);
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
  }

  return <main className="site-shell">
    <div className="topline"><span>✦ EST. CHRISTMAS TIME ✦</span><span>NO CASH VALUE · JUST FOR FUN</span></div>
    <header className="header">
      <a className="wordmark" href="#"><span className="wordmark-small">THE MOST WONDERFUL</span><span>JINGLE <i>✦</i> JACKPOT!</span><span className="wordmark-small">CHRISTMAS GAME PARLOUR</span></a>
      <nav><a href="#games">THE GAMES</a><a href="#events">SPECIALS</a><a href="#rankings">HALL OF FAME</a></nav>
      <div className="account">
        {user ? <><span className="balance">{user.nickname} <b>{Number(user.points || 0).toLocaleString()} P</b></span><button className="login-btn" onClick={logout}>LOG OUT</button></> : <button className="login-btn" onClick={() => { setMode('login'); setAuthOpen(true); }}>LOGIN / JOIN</button>}
      </div>
    </header>

    <section className="hero">
      <div className="hero-copy"><p className="eyebrow">A LITTLE CHRISTMAS, A LOT OF LUCK!</p><h1>LET THE<br/><em>HOLIDAY</em><br/>MAGIC BEGIN.</h1><p className="hero-desc">반짝이는 선물과 조금은 위험한 행운이 기다리는<br/>빈티지 크리스마스 게임 파를러에 오신 걸 환영해요.</p><a className="cta" href="#games">FIND YOUR FORTUNE <span>↗</span></a></div>
      <div className="hero-art"><div className="ornament ornament-one">✳</div><div className="poster"><span className="poster-top">A VERY MERRY</span><strong>CHRIST<br/>MAS!</strong><span className="poster-star">✦</span><span className="poster-bottom">LUCK IS IN THE AIR · 2026</span></div><div className="seal">GOOD<br/>LUCK<br/><b>✦</b></div></div>
      <div className="hero-foot"><span>★ 5 GAMES TO PLAY</span><span>★ 3 SPECIAL EVENTS</span><span>★ ONE VERY LUCKY YOU</span></div>
    </section>

    <section className="section" id="games"><div className="section-heading"><div><p className="eyebrow">PICK YOUR POISON</p><h2>THE GAME <em>ROOM</em></h2></div><p>오늘의 행운은 어떤 모습일까요?</p></div>
      <div className="game-grid">{games.map((g) => <article className={'game-card ' + g.color} key={g.no}><div className="game-card-top"><span>GAME NO. {g.no}</span><span>✦</span></div><div className="game-symbol">{g.symbol}</div><div className="game-type">{g.type}</div><h3>{g.title}</h3><p>{g.desc}</p><button className="play-btn" onClick={() => openGame({ ...g, code: ['santas-slot','cursed-gift','frozen-roulette','reindeer-race','last-candle'][Number(g.no)-1] })}>ENTER GAME <span>↗</span></button></article>)}</div>
    </section>

    <section className="events-section" id="events"><div className="section-heading"><div><p className="eyebrow">ONLY THIS SEASON</p><h2>HOLIDAY <em>SPECIALS</em></h2></div><p>특별한 날에만 열리는 보너스 이벤트</p></div><div className="event-grid">{events.map((e,i)=><article className="event-card" key={e.title}><span className="event-number">0{i+1} / LIMITED</span><div className="event-star">✧</div><h3>{e.title}</h3><p>{e.sub}</p><span className="coming">COMING SOON</span></article>)}</div></section>

    <section className="hall" id="rankings"><p className="eyebrow">A PLACE FOR THE LUCKIEST</p><h2>HALL OF <em>FAME</em></h2><div className="ranking-grid"><article><span className="rank-icon">♛</span><div><small>LUCKY STAR</small><h3>BIGGEST WINNINGS</h3><p>누적 당첨금 랭킹</p>{boards.luckyStar?.slice(0,5).map((x,i)=><p key={x.nickname}>{i+1}. {x.nickname} · {Number(x.winnings).toLocaleString()} P</p>)}</div><b>{boards.luckyStar?.length ? 'TOP 5' : '—'}</b></article><article><span className="rank-icon">✦</span><div><small>ONE IN A MILLION</small><h3>BIGGEST JACKPOT</h3><p>단일 게임 최고 당첨 기록</p>{boards.biggestJackpot?.slice(0,5).map((x,i)=><p key={x.nickname}>{i+1}. {x.nickname} · {Number(x.winnings).toLocaleString()} P</p>)}</div><b>{boards.biggestJackpot?.length ? 'TOP 5' : '—'}</b></article></div></section>

    <footer><div className="footer-mark">JINGLE <i>✦</i> JACKPOT!</div><p>A LITTLE CHRISTMAS, A LOT OF LUCK!</p><small>© 2026 JINGLE JACKPOT! · VIRTUAL POINTS HAVE NO CASH VALUE</small></footer>


    {activeGame && <div className="modal-backdrop" onMouseDown={(e) => { if(e.target===e.currentTarget && !playing) setActiveGame(null); }}><form className="auth-modal game-modal" onSubmit={playGame}>
      <button type="button" className="modal-close" onClick={()=>setActiveGame(null)} disabled={playing}>×</button>
      <p className="eyebrow">GAME NO. {activeGame.no} · JINGLE JACKPOT</p><h2>{activeGame.title}</h2><p className="auth-note">{activeGame.desc}</p>
      <label>YOUR WAGER (P)<input inputMode="numeric" pattern="[0-9]*" value={wager} onChange={e=>setWager(e.target.value.replace(/[^0-9]/g,''))} required /></label>
      {activeGame.code === 'cursed-gift' && <label>CHOOSE A GIFT BOX<select value={selection} onChange={e=>setSelection(e.target.value)}>{[1,2,3,4,5].map(n=><option key={n} value={n}>BOX {n}</option>)}</select></label>}
      {activeGame.code === 'frozen-roulette' && <label>CHOOSE A COLOR<select value={selection} onChange={e=>setSelection(e.target.value)}><option value="RED">RED</option><option value="GREEN">GREEN</option><option value="GOLD">GOLD</option></select></label>}
      {activeGame.code === 'reindeer-race' && <label>CHOOSE YOUR REINDEER<select value={selection} onChange={e=>setSelection(e.target.value)}>{[1,2,3,4].map(n=><option key={n} value={n}>REINDEER {n}</option>)}</select></label>}
      {activeGame.code === 'last-candle' && <label>NUMBER OF CANDLES<select value={selection} onChange={e=>setSelection(e.target.value)}>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n} CANDLE{n>1?'S':''}</option>)}</select></label>}
      {playResult?.error && <p className="form-message">{playResult.error}</p>}
      {playResult?.result && <div className="play-result"><strong>{playResult.resultLabel}</strong><p>BET {Number(playResult.result.wager).toLocaleString()} P · PRIZE {Number(playResult.result.payout).toLocaleString()} P</p><p>NEW BALANCE {Number(playResult.result.balance).toLocaleString()} P</p></div>}
      <button className="modal-submit" disabled={playing || !wager || Number(wager) < 1}>{playing?'THE WHEELS ARE TURNING...':'PLAY NOW'}</button>
      <p className="auth-note">당첨금은 베팅 원금을 포함한 지급액입니다. 가상 포인트는 현금 가치가 없습니다.</p>
    </form></div>}

    {authOpen && <div className="modal-backdrop" onMouseDown={(e) => { if(e.target===e.currentTarget){setAuthOpen(false);setMessage('');} }}><form className="auth-modal" onSubmit={submitAuth}><button type="button" className="modal-close" onClick={()=>{setAuthOpen(false);setMessage('');}}>×</button><p className="eyebrow">WELCOME TO THE PARLOUR</p><h2>{mode === 'login' ? 'GOOD TO SEE YOU.' : 'JOIN THE CLUB.'}</h2><p className="auth-note">기존 gift / gacha 계정으로 로그인하거나 새 계정을 만들어 주세요.</p><label>YOUR ID<input value={nickname} onChange={e=>setNickname(e.target.value)} maxLength={20} autoComplete="username" required /></label><label>PASSWORD<input type="password" value={password} onChange={e=>setPassword(e.target.value)} maxLength={128} autoComplete={mode==='login'?'current-password':'new-password'} required /></label>{message && <p className="form-message">{message}</p>}<button className="modal-submit" disabled={busy}>{busy?'PLEASE WAIT...':mode==='login'?'LET ME IN':'CREATE ACCOUNT'}</button><p className="switch-mode">{mode==='login'?'처음 오셨나요?':'이미 계정이 있나요?'} <button type="button" onClick={()=>{setMode(mode==='login'?'register':'login');setMessage('');}}>{mode==='login'?'회원가입':'로그인'}</button></p></form></div>}
  </main>;
}
