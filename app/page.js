'use client';

import { useEffect, useRef, useState } from 'react';

const games = [
  { no:'01', title:"SANTA'S SLOT", type:'THE CLASSIC', desc:'세 개의 릴이 멈추는 순간, 산타의 선물이 결정돼요.', rule:'세 그림 일치 8 배 · 두 그림 일치 1.2 배 · 그 외 0 배', color:'red', code:'santas-slot' },
  { no:'02', title:'THE CURSED GIFT', type:'MYSTERY BOX', desc:'다섯 개의 선물 상자 중 행운이 숨은 상자를 골라 보세요.', rule:'잭팟 2.5 배 · 행운 1.5 배 · 작은 선물 1 배 · 꽝 0 배', color:'green', code:'cursed-gift' },
  { no:'03', title:'FROZEN ROULETTE', type:'SPIN & WIN', desc:'원하는 색에 포인트를 걸고 얼어붙은 룰렛을 돌려 보세요.', rule:'RED 1.8 배 · GREEN 2.2 배 · GOLD 10 배', color:'gold', code:'frozen-roulette' },
  { no:'04', title:'REINDEER RACE', type:'RACE GAME', desc:'네 마리 순록 중 우승할 주자를 선택하세요.', rule:'우승 확률 40 % / 30 % / 20 % / 10 % · 배당 2.2 / 3 / 4.5 / 8 배', color:'green', code:'reindeer-race' },
  { no:'05', title:'THE LAST CANDLE', type:'RISK OR STOP', desc:'촛불을 하나씩 밝혀 보세요. 멈출지, 다음 촛불에 도전할지는 당신의 선택!', rule:'촛불마다 성공 확률 80 % · 최대 다섯 번 · 성공 단계에 따라 배당 증가', color:'red', code:'last-candle' },
  { no:'06', title:'ODD OR EVEN', type:'GUESS THE NUMBER', desc:'뒤집힌 카드에 숨겨진 숫자가 홀수일지 짝수일지 맞혀 보세요.', rule:'정답이면 베팅 포인트의 2 배 지급 · 오답이면 베팅 포인트 전액 소멸', color:'gold', code:'odd-even' },
];
const slotIcons = { BELL:'🔔', STAR:'⭐', TREE:'🎄', GIFT:'🎁', CANDY:'🍬' };
const payoutLabels = ['×2.2','×3','×4.5','×8'];

function SlotMachine({ reels, spinning }) {
  const [spinSymbols,setSpinSymbols]=useState(reels);
  useEffect(()=>{
    if(!spinning){setSpinSymbols(reels);return;}
    const symbols=Object.keys(slotIcons);
    const timer=setInterval(()=>setSpinSymbols(current=>current.map(()=>symbols[Math.floor(Math.random()*symbols.length)])),85);
    return ()=>clearInterval(timer);
  },[spinning,reels]);
  return <div className="slot-machine-visual">
    <div className="slot-marquee"><span>✦ SANTA'S</span><b>LUCKY SLOTS</b><span>✦</span></div>
    <div className="slot-reel-window">{reels.map((s,i)=><div className={'slot-reel '+(spinning?'is-spinning':'')} key={i}><span key={spinning?spinSymbols[i]:s}>{slotIcons[spinning?spinSymbols[i]:s] || '🎁'}</span></div>)}</div>
    <div className="slot-machine-base"><span>JINGLE JACKPOT</span><i>✦</i><span>GOOD LUCK!</span></div>
    <div className="slot-lever"><i /></div>
  </div>;
}

function GiftBox({ number, selected, onClick, disabled, opened }) {
  return <button type="button" className={'gift-choice '+(selected?'selected ':'')+(opened?'opened':'')} onClick={onClick} disabled={disabled} aria-label={'선물 상자 '+number}>
    <svg viewBox="0 0 100 112" role="img" aria-label={opened?"뚜껑이 열린 선물 상자":"리본 선물 상자"}>
      <path d="M17 35h66v66H17z" fill="#8c303b" stroke="#54232a" strokeWidth="3"/>
      {opened ? null : <path d="M12 27h76v15H12z" fill="#d4b16e" stroke="#785b34" strokeWidth="2" /> }
      <path d="M45 35h12v66H45z" fill="#d9b66f"/>
      {opened ? null : <path d="M50 35C20 32 25 8 42 13c8 2 9 13 8 22M51 35c30-3 25-27 8-22-8 2-9 13-8 22" fill="none" stroke="#e6c77f" strokeWidth="7" strokeLinecap="round" /> }
    </svg><span>{opened?'OPENED':'BOX '+number}</span>
  </button>;
}

function RouletteWheel({ spinning, result, pocketIndex, rotation, onStopped }) {
  const colors = ['#8c303b','#284b3c','#8c303b','#284b3c','#8c303b','#284b3c','#8c303b','#284b3c','#8c303b','#284b3c','#8c303b','#c49b50'];
  const wheelRef = useRef(null);
  const animationRef = useRef(null);
  const baseRotationRef = useRef(rotation || 0);
  const onStoppedRef = useRef(onStopped);
  onStoppedRef.current = onStopped;

  useEffect(() => {
    const wheel = wheelRef.current;
    if (!wheel) return;

    if (spinning) {
      if (animationRef.current) animationRef.current.cancel();
      baseRotationRef.current = Number(rotation || 0);
      wheel.style.transform = 'rotate(' + baseRotationRef.current + 'deg)';
      animationRef.current = wheel.animate(
        [
          { transform: 'rotate(' + baseRotationRef.current + 'deg)' },
          { transform: 'rotate(' + (baseRotationRef.current + 360) + 'deg)' }
        ],
        { duration: 1000, iterations: Infinity, easing: 'linear' }
      );
      return;
    }

    if (animationRef.current && result) {
      const active = animationRef.current;
      const elapsed = Number(active.currentTime || 0);
      const startAngle = baseRotationRef.current + (elapsed % 1000) / 1000 * 360;
      active.cancel();

      let targetAngle = Number(rotation || 0);
      while (targetAngle < startAngle + 360) targetAngle += 360;

      const settle = wheel.animate(
        [
          { transform: 'rotate(' + startAngle + 'deg)', offset: 0 },
          { transform: 'rotate(' + (startAngle + (targetAngle - startAngle) * 0.45) + 'deg)', offset: 0.45 },
          { transform: 'rotate(' + targetAngle + 'deg)', offset: 1 }
        ],
        { duration: 2200, easing: 'cubic-bezier(0.25, 0.3, 0.8, 1)', fill: 'forwards' }
      );
      animationRef.current = settle;
      settle.onfinish = () => {
        baseRotationRef.current = targetAngle;
        wheel.style.transform = 'rotate(' + targetAngle + 'deg)';
        settle.cancel();
        animationRef.current = null;
        if (onStoppedRef.current) onStoppedRef.current();
      };
    }
  }, [spinning, result, pocketIndex, rotation]);

  useEffect(() => () => {
    if (animationRef.current) animationRef.current.cancel();
  }, []);

  return <div className="roulette-stage">
    <div className="roulette-pointer">▼</div>
    <div ref={wheelRef} className="roulette-wheel" style={{ transform: 'rotate(' + (baseRotationRef.current || 0) + 'deg)' }}>
      <svg viewBox="0 0 300 300" role="img" aria-label="12칸 크리스마스 룰렛">
        {colors.map((color, i) => <path key={i} d="M150 150 L150 12 A138 138 0 0 1 219 30 Z" fill={color} stroke="#f0dfbd" strokeWidth="2" transform={'rotate(' + (i * 30) + ' 150 150)'} />)}
        <circle cx="150" cy="150" r="29" fill="#e7d3a9" stroke="#76502f" strokeWidth="5" />
        <circle cx="150" cy="150" r="9" fill="#7a2934" />
      </svg>
    </div>
  </div>;
}
function Reindeer({ number, selected, winner, racing }) {
  return <div className={'reindeer-choice '+(selected?'selected ':'')+(winner?'winner ':'')+(racing?'racing':'')}>
    <span className="reindeer-emoji" role="img" aria-label={'순록 '+number}>🦌</span>
    <b>{number===1?'RUDOLPH':'REINDEER '+number}</b><small>{payoutLabels[number-1]} PAYOUT</small>{winner&&<em>WINNER!</em>}
  </div>;
}

function CandleArt({ lit, active }) {
  return <div className={'candle-art '+(lit?'lit':'unlit')+(active?' candle-flicker':'')}>
    <svg viewBox="0 0 70 125" role="img" aria-label={lit?'불이 켜진 촛불':'꺼진 촛불'}>
      {lit&&<><path className="flame-outer" d="M35 7C13 31 26 43 35 45 50 39 54 25 35 7Z" fill="#e7a83f"/><path d="M35 20c-10 13-5 19 0 21 7-5 9-12 0-21Z" fill="#fff0b0"/></>}
      <path d="M20 47h30v67H20z" fill="#e8d7b4" stroke="#b89b69" strokeWidth="2"/><path d="M20 57h30M20 101h30" stroke="#c5a978" strokeWidth="2" opacity=".7"/>
      <path d="M35 47v-7" stroke="#554337" strokeWidth="3" strokeLinecap="round"/><ellipse cx="35" cy="114" rx="20" ry="5" fill="#b89b69" opacity=".4"/>
    </svg>
  </div>;
}

export default function Home() {
  const [user,setUser]=useState(null), [authOpen,setAuthOpen]=useState(false), [mode,setMode]=useState('login');
  const [nickname,setNickname]=useState(''), [password,setPassword]=useState(''), [busy,setBusy]=useState(false), [message,setMessage]=useState('');
  const [activeGame,setActiveGame]=useState(null), [wager,setWager]=useState('100'), [selection,setSelection]=useState('1');
  const [playing,setPlaying]=useState(false), [playResult,setPlayResult]=useState(null), [slotReels,setSlotReels]=useState(['BELL','STAR','GIFT']), [raceOutcome,setRaceOutcome]=useState(null), [raceAnimating,setRaceAnimating]=useState(false), [rouletteRotation,setRouletteRotation]=useState(0), [rouletteAnimating,setRouletteAnimating]=useState(false), [rouletteOutcome,setRouletteOutcome]=useState(null);
  const rouletteFinishRef=useRef(null);
  const [boards,setBoards]=useState({luckyStar:[],biggestJackpot:[]});

  async function refreshUser(){const res=await fetch('/api/me',{cache:'no-store'});const data=await res.json();setUser(data.user||null);}
  function refreshBoards(){fetch('/api/leaderboards',{cache:'no-store'}).then(r=>r.json()).then(setBoards).catch(()=>{});}
  useEffect(()=>{refreshUser().catch(()=>{});refreshBoards();},[]);

  async function submitAuth(e){
    e.preventDefault();setBusy(true);setMessage('');
    try{const res=await fetch('/api/auth/'+mode,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nickname,password})});const data=await res.json();if(!res.ok)throw new Error(data.error||'요청을 처리하지 못했습니다.');await refreshUser();setAuthOpen(false);setNickname('');setPassword('');}
    catch(err){setMessage(err.message);}finally{setBusy(false);}
  }

  async function postGame(body, deferResult=false){
    const res=await fetch('/api/games/play',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const data=await res.json();if(!res.ok)throw new Error(data.error||'게임을 진행하지 못했습니다.');
    if(!deferResult)setPlayResult(data);if(data.result&&data.result.balance!==undefined)await refreshUser();refreshBoards();return data;
  }

  async function playGame(e){
    e.preventDefault();if(!user){setActiveGame(null);setMode('login');setAuthOpen(true);return;}
    setPlaying(true);setPlayResult(null);
    if(activeGame.code==='reindeer-race'){setRaceOutcome(null);setRaceAnimating(false);}
    try{
      if(activeGame.code==='santas-slot')setSlotReels(['BELL','STAR','TREE']);
      const request={gameCode:activeGame.code,wager,selection,requestId:crypto.randomUUID()};
      if(activeGame.code==='reindeer-race'){
        const data=await postGame(request,true);
        const winner=data.result?.outcome?.winner;
        setRaceOutcome(winner||null);setRaceAnimating(true);
        await new Promise(resolve=>setTimeout(resolve,4200));
        setRaceAnimating(false);setPlayResult(data);
      }else if(activeGame.code==='santas-slot'){
        const spinStartedAt=Date.now();
        const data=await postGame(request,true);
        const remainingSpinTime=Math.max(0,3000-(Date.now()-spinStartedAt));
        if(remainingSpinTime)await new Promise(resolve=>setTimeout(resolve,remainingSpinTime));
        if(data.result?.outcome?.reels)setSlotReels(data.result.outcome.reels);
        setPlayResult(data);
      }else if(activeGame.code==='frozen-roulette'){
        setRouletteOutcome(null);
        setRouletteAnimating(true);
        setPlayResult({rouletteAnimating:true});
        const data=await postGame(request,true);
        const pocketIndex=data.result?.outcome?.pocketIndex;
        const landingAngle=Number.isInteger(pocketIndex)?(360-(pocketIndex*30+15)+360)%360:0;
        const current=((rouletteRotation%360)+360)%360;
        const clockwiseDelta=(landingAngle-current+360)%360;
        const nextRotation=rouletteRotation+720+clockwiseDelta;
        setRouletteOutcome(data.result?.outcome || {});
        setRouletteRotation(nextRotation);
        setRouletteAnimating(false);
        await new Promise(resolve=>{
          rouletteFinishRef.current=()=>{setPlayResult(data);resolve();};
        });
      }else{
        await postGame(request);
      }
    }catch(err){setPlayResult({error:err.message});setRaceAnimating(false);setRouletteAnimating(false);setRouletteOutcome(null);rouletteFinishRef.current=null;}finally{setPlaying(false);}
  }

  async function candleAction(action){
    if(!user){setActiveGame(null);setMode('login');setAuthOpen(true);return;}
    setPlaying(true);
    try{await postGame({gameCode:'last-candle',action,wager:action==='start'?wager:undefined,sessionId:playResult&&playResult.result&&playResult.result.sessionId,requestId:crypto.randomUUID()});}
    catch(err){setPlayResult({error:err.message});}finally{setPlaying(false);}
  }

  function openGame(game){setActiveGame(game);setWager('100');setSelection(game.code==='frozen-roulette'?'RED':game.code==='odd-even'?'EVEN':'1');setPlayResult(null);setSlotReels(['BELL','STAR','GIFT']);setRaceOutcome(null);setRaceAnimating(false);setRouletteAnimating(false);setRouletteOutcome(null);rouletteFinishRef.current=null;setRouletteRotation(0);}
  async function logout(){await fetch('/api/auth/logout',{method:'POST'});setUser(null);}

  const result=playResult&&playResult.result;
  const candleStage=result&&result.stage?result.stage:0;

  return <main className="site-shell">
    <div className="topline"><span>✦ EST. CHRISTMAS TIME ✦</span><span>NO CASH VALUE · JUST FOR FUN</span></div>
    <header className="header">
      <a className="wordmark" href="#"><span className="wordmark-small">THE MOST WONDERFUL</span><span>JINGLE <i>✦</i> JACKPOT!</span><span className="wordmark-small">CHRISTMAS GAME PARLOUR</span></a>
      <nav><a href="#games">THE GAMES</a><a href="#lottery">CHRISTMAS LOTTERY</a><a href="#rankings">HALL OF FAME</a></nav>
      <div className="account">{user?<><span className="balance">{user.nickname}<b>{Number(user.points||0).toLocaleString()} P</b></span><button className="login-btn" onClick={logout}>LOG OUT</button></>:<button className="login-btn" onClick={()=>{setMode('login');setAuthOpen(true);}}>LOGIN / JOIN</button>}</div>
    </header>

    <section className="hero">
      <div className="hero-copy"><p className="eyebrow">A LITTLE CHRISTMAS, A LOT OF LUCK!</p><h1>LET THE<br/><em>HOLIDAY</em><br/>MAGIC BEGIN.</h1><p className="hero-desc">반짝이는 선물과 조금은 위험한 행운이 기다리는<br/>빈티지 크리스마스 게임 파를러에 오신 걸 환영해요.</p><a className="cta" href="#games">FIND YOUR FORTUNE <span>↗</span></a></div>
      <div className="hero-art"><div className="ornament ornament-one">✳</div><div className="poster"><span className="poster-top">A VERY MERRY</span><strong>CHRIST<br/>MAS!</strong><span className="poster-star">✦</span><span className="poster-bottom">LUCK IS IN THE AIR · 2026</span></div><div className="seal">GOOD<br/>LUCK<br/><b>✦</b></div></div>
      <div className="hero-foot"><span>★ 6 GAMES TO PLAY</span><span>★ 1 CHRISTMAS LOTTERY</span><span>★ ONE VERY LUCKY YOU</span></div>
    </section>

    <section className="section" id="games"><div className="section-heading"><div><p className="eyebrow">PICK YOUR POISON</p><h2>THE GAME <em>ROOM</em></h2></div><p>오늘의 행운은 어떤 모습일까요?</p></div>
      <div className="game-grid">{games.map(g=><article className={'game-card '+g.color} key={g.no} role="button" tabIndex={0} aria-label={g.title+' 게임 열기'} onClick={()=>openGame(g)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openGame(g);}}}><div className="game-card-top"><span>GAME NO. {g.no}</span><span>✦</span></div><div className="game-symbol">{g.code==='santas-slot'?'🎰':g.code==='cursed-gift'?'🎁':g.code==='frozen-roulette'?'🎡':g.code==='reindeer-race'?'🦌':g.code==='odd-even'?'🃏':'🕯️'}</div><div className="game-type">{g.type}</div><h3>{g.title}</h3><p>{g.desc}</p></article>)}</div>
    </section>

    <section className="events-section lottery-section" id="lottery"><div className="lottery-copy"><p className="eyebrow">ONLY THIS SEASON</p><h2>CHRISTMAS <em>LOTTERY</em></h2><p>크리스마스 시즌에 찾아오는 단 하나의 특별 추첨.</p><span className="coming">COMING SOON</span></div><div className="lottery-ticket"><span>✦ THE CHRISTMAS DRAW ✦</span><strong>LUCKY<br/>NUMBER</strong><i>NO. 1225</i><small>ONE TICKET · ONE WISH</small></div></section>

    <section className="hall" id="rankings"><p className="eyebrow">A PLACE FOR THE LUCKIEST</p><h2>HALL OF <em>FAME</em></h2><div className="ranking-grid cumulative-ranking"><article><span className="rank-icon">♛</span><div><small>LUCKY STAR</small><h3>CUMULATIVE WINNINGS</h3><p>누적 당첨금 랭킹</p>{boards.luckyStar&&boards.luckyStar.slice(0,10).map((x,i)=><p key={x.nickname}>{i+1}. {x.nickname} · {Number(x.winnings).toLocaleString()} P</p>)}</div><b>{boards.luckyStar&&boards.luckyStar.length?'TOP 10':'—'}</b></article></div></section>
    <footer><div className="footer-mark">JINGLE <i>✦</i> JACKPOT!</div><p>A LITTLE CHRISTMAS, A LOT OF LUCK!</p><small>ⓒ胡桃劇場</small></footer>

    {activeGame&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!playing)setActiveGame(null);}}><form className="auth-modal game-modal" onSubmit={activeGame.code==='last-candle'?e=>{e.preventDefault();candleAction('start');}:playGame}>
      <button type="button" className="modal-close" onClick={()=>setActiveGame(null)} disabled={playing}>×</button>
      <p className="eyebrow">GAME NO. {activeGame.no} · JINGLE JACKPOT</p><h2>{activeGame.title}</h2><p className="auth-note">{activeGame.desc}</p><p className="game-rule-note">{activeGame.rule}</p>

      {activeGame.code==='santas-slot'&&<div className="game-art-panel"><SlotMachine reels={slotReels} spinning={playing}/><p className="visual-hint">세 개의 릴을 돌려 오늘의 행운을 확인하세요.</p></div>}
      {activeGame.code==='cursed-gift'&&<div className="game-art-panel"><p className="visual-hint">마음에 드는 선물 상자 하나를 선택하세요.</p><div className="gift-grid">{[1,2,3,4,5].map(n=><GiftBox key={n} number={n} selected={selection===String(n)} opened={!!(result&&result.outcome&&result.outcome.selectedBox===n)} onClick={()=>setSelection(String(n))} disabled={playing}/>)}</div></div>}
      {activeGame.code==='frozen-roulette'&&<div className="game-art-panel"><RouletteWheel spinning={rouletteAnimating} result={rouletteOutcome?.result || null} pocketIndex={rouletteOutcome?.pocketIndex ?? null} rotation={rouletteRotation} onStopped={()=>{const finish=rouletteFinishRef.current;rouletteFinishRef.current=null;if(finish)finish();}}/><p className="visual-hint">먼저 행운을 걸 색을 선택하세요.</p><div className="color-bets">{[['RED','1.8×','red'],['GREEN','2.2×','green'],['GOLD','10×','gold']].map(item=><button type="button" key={item[0]} className={'color-bet '+item[2]+(selection===item[0]?' selected':'')} onClick={()=>setSelection(item[0])} disabled={playing}>{item[0]}<small>{item[1]}</small></button>)}</div></div>}
      {activeGame.code==='odd-even'&&<div className="game-art-panel odd-even-panel"><p className="visual-hint">카드 뒷면을 보고 숫자의 홀짝을 예측하세요.</p><div className={'number-card '+(result?'revealed':playing?'flipping':'')}><div className="number-card-inner"><div className="number-card-back"><span>✦</span><strong>J</strong><span>JINGLE JACKPOT</span></div><div className="number-card-front"><small>YOUR NUMBER</small><strong>{result?.outcome?.number ?? '?'}</strong><span>{result?.outcome?.number%2===0?'EVEN':'ODD'}</span></div></div></div><div className="odd-even-bets"><button type="button" className={'odd-even-choice '+(selection==='ODD'?'selected':'')} onClick={()=>setSelection('ODD')} disabled={playing}>홀수 <small>ODD</small></button><button type="button" className={'odd-even-choice '+(selection==='EVEN'?'selected':'')} onClick={()=>setSelection('EVEN')} disabled={playing}>짝수 <small>EVEN</small></button></div></div>}
      {activeGame.code==='reindeer-race'&&<div className="game-art-panel"><p className="visual-hint">우승할 순록을 선택하세요. 경주가 시작되면 결승선까지 달려갑니다!</p><div className="reindeer-grid">{[1,2,3,4].map(n=><button type="button" key={n} className="reindeer-button" onClick={()=>setSelection(String(n))} disabled={playing}><Reindeer number={n} selected={selection===String(n)} winner={!!(result&&result.outcome&&result.outcome.winner===n)} racing={playing}/></button>)}</div><div className={'race-track '+(raceAnimating?'race-running ':(!raceAnimating&&raceOutcome&&result?'race-finished ':''))+(raceOutcome?'winner-'+raceOutcome:'')}><span>START</span><div className="race-lanes">{[1,2,3,4].map(n=><div className="race-lane" key={n}><b className={'race-runner runner-'+n}>🦌</b></div>)}</div><i>🏁</i></div></div>}
      {activeGame.code==='last-candle'&&<div className="game-art-panel candle-panel">
        {!result&&<p className="visual-hint">베팅 후 첫 번째 촛불을 밝혀 보세요.</p>}
        <div className="candle-row">{[1,2,3,4,5].map(n=><CandleArt key={n} lit={n<=candleStage} active={playing&&n===candleStage+1}/>)}</div>
        {result&&<div className="candle-status">
          {result.status==='active'&&<><strong>{candleStage} 번째 촛불이 켜졌어요!</strong><p>지금 멈추면 {({1:'1.15',2:'1.45',3:'1.85',4:'2.4',5:'3'})[candleStage]} 배를 받을 수 있어요.</p></>}
          {result.status==='lost'&&<><strong>촛불이 꺼졌어요…</strong><p>이번 라운드 당첨금은 0 P입니다.</p></>}
          {result.status==='completed'&&<><strong>촛불 도전을 마쳤어요!</strong><p>{Number(result.payout||0).toLocaleString()} P 지급 완료</p></>}
        </div>}
      </div>}

      {activeGame.code!=='last-candle'&&<label>YOUR WAGER (P)<input inputMode="numeric" pattern="[0-9]*" value={wager} onChange={e=>setWager(e.target.value.replace(/[^0-9]/g,''))} required/></label>}
      {activeGame.code==='last-candle'&&!result&&<label>YOUR WAGER (P)<input inputMode="numeric" pattern="[0-9]*" value={wager} onChange={e=>setWager(e.target.value.replace(/[^0-9]/g,''))} required/></label>}
      {playResult&&playResult.error&&<p className="form-message">{playResult.error}</p>}
      {activeGame.code!=='last-candle'&&result&&<div className="play-result"><strong>{playResult.resultLabel}</strong><p>BET {Number(result.wager).toLocaleString()} P · PRIZE {Number(result.payout).toLocaleString()} P</p><p>NEW BALANCE {Number(result.balance).toLocaleString()} P</p></div>}
      {activeGame.code==='last-candle'&&result&&result.status!=='active'&&<div className="play-result"><strong>{playResult.resultLabel}</strong><p>BET {Number(result.wager).toLocaleString()} P · PRIZE {Number(result.payout||0).toLocaleString()} P</p><p>NEW BALANCE {Number(result.balance).toLocaleString()} P</p><button type="button" className="secondary-game-btn" onClick={()=>setPlayResult(null)}>PLAY AGAIN</button></div>}
      {activeGame.code==='last-candle'&&result&&result.status==='active'?<div className="candle-actions"><button type="button" className="modal-submit secondary-game-btn" onClick={()=>candleAction('stop')} disabled={playing}>STOP & COLLECT</button><button type="button" className="modal-submit" onClick={()=>candleAction('continue')} disabled={playing}>{playing?'THE FLAME IS FLICKERING...':candleStage===4?'LIGHT THE FINAL CANDLE':'LIGHT THE NEXT CANDLE'}</button></div>:<button className="modal-submit" disabled={playing||!wager||Number(wager)<1||(activeGame.code==='last-candle'&&!!result)}>{playing?'THE MAGIC IS HAPPENING...':activeGame.code==='last-candle'?'LIGHT THE FIRST CANDLE':'PLAY NOW'}</button>}
      <p className="auth-note">당첨금은 원금을 포함한 지급액입니다. 가상 포인트는 현금 가치가 없습니다.</p>
    </form></div>}

    {authOpen&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget){setAuthOpen(false);setMessage('');}}}><form className="auth-modal" onSubmit={submitAuth}><button type="button" className="modal-close" onClick={()=>{setAuthOpen(false);setMessage('');}}>×</button><p className="eyebrow">WELCOME TO THE PARLOUR</p><h2>{mode==='login'?'GOOD TO SEE YOU.':'JOIN THE CLUB.'}</h2><p className="auth-note">기존 계정으로 로그인하거나 새 계정을 만들어 주세요.</p><label>NICKNAME<input value={nickname} onChange={e=>setNickname(e.target.value)} maxLength={20} autoComplete="username" required/></label><label>PASSWORD<input type="password" value={password} onChange={e=>setPassword(e.target.value)} maxLength={128} autoComplete={mode==='login'?'current-password':'new-password'} required/></label>{message&&<p className="form-message">{message}</p>}<button className="modal-submit" disabled={busy}>{busy?'PLEASE WAIT...':mode==='login'?'LET ME IN':'CREATE ACCOUNT'}</button><p className="switch-mode">{mode==='login'?'처음 오셨나요?':'이미 계정이 있나요?'} <button type="button" onClick={()=>{setMode(mode==='login'?'register':'login');setMessage('');}}>{mode==='login'?'회원가입':'로그인'}</button></p></form></div>}
  </main>;
}
