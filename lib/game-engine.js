import { randomInt } from 'node:crypto';

const pick = (items) => items[randomInt(items.length)];
const payoutFor = (wager, multiplier) => {
  const [whole, fraction = ''] = String(multiplier).split('.');
  const denominator = 10n ** BigInt(fraction.length);
  const numerator = BigInt(whole + fraction);
  return (wager * numerator) / denominator;
};

export function resolveGame(gameCode, wager, selection) {
  const amount = BigInt(wager);

  switch (gameCode) {
    case 'santas-slot': {
      const symbols = ['BELL', 'STAR', 'TREE', 'GIFT', 'CANDY'];
      const reels = [pick(symbols), pick(symbols), pick(symbols)];
      const triple = reels[0] === reels[1] && reels[1] === reels[2];
      const pair = !triple && (reels[0] === reels[1] || reels[0] === reels[2] || reels[1] === reels[2]);
      const multiplier = triple ? 8 : pair ? 1.2 : 0;
      return { payout: payoutFor(amount, multiplier), outcome: { reels, result: triple ? 'TRIPLE' : pair ? 'PAIR' : 'MISS', multiplier } };
    }
    case 'cursed-gift': {
      const boxNumber = Number(selection);
      if (!Number.isInteger(boxNumber) || boxNumber < 1 || boxNumber > 5) throw new Error('선물 상자를 선택해 주세요.');
      const boxes = [
        { label: 'GOLDEN STAR', multiplier: 2.5 },
        { label: 'LUCKY BELL', multiplier: 1.5 },
        { label: 'LITTLE GIFT', multiplier: 1 },
        { label: 'EMPTY BOX', multiplier: 0 },
        { label: 'EMPTY BOX', multiplier: 0 },
      ];
      const prize = boxes[randomInt(boxes.length)];
      return { payout: payoutFor(amount, prize.multiplier), outcome: { selectedBox: boxNumber, prize: prize.label, multiplier: prize.multiplier } };
    }
    case 'frozen-roulette': {
      if (!['RED', 'GREEN', 'GOLD'].includes(selection)) throw new Error('룰렛 색상을 선택해 주세요.');
      const pockets = [...Array(6).fill('RED'), ...Array(5).fill('GREEN'), 'GOLD'];
      const result = pick(pockets);
      const multiplier = result === selection ? ({ RED: 1.8, GREEN: 2.2, GOLD: 10 })[selection] : 0;
      return { payout: payoutFor(amount, multiplier), outcome: { selection, result, multiplier } };
    }
    case 'reindeer-race': {
      const horse = Number(selection);
      if (!Number.isInteger(horse) || horse < 1 || horse > 4) throw new Error('순록을 선택해 주세요.');
      const roll = randomInt(100);
      const winner = roll < 40 ? 1 : roll < 70 ? 2 : roll < 90 ? 3 : 4;
      const multipliers = { 1: 2.2, 2: 3, 3: 4.5, 4: 8 };
      const multiplier = winner === horse ? multipliers[horse] : 0;
      return { payout: payoutFor(amount, multiplier), outcome: { selected: horse, winner, multiplier } };
    }
    case 'last-candle': {
      const stages = Number(selection);
      const multipliers = { 1: 1.15, 2: 1.45, 3: 1.85, 4: 2.4, 5: 3 };
      if (!Number.isInteger(stages) || !multipliers[stages]) throw new Error('촛불 개수를 선택해 주세요.');
      let lit = 0;
      for (let i = 0; i < stages; i += 1) {
        if (randomInt(100) >= 80) break;
        lit += 1;
      }
      const multiplier = lit === stages ? multipliers[stages] : 0;
      return { payout: payoutFor(amount, multiplier), outcome: { stages, lit, success: lit === stages, multiplier } };
    }
    default:
      throw new Error('지원하지 않는 게임입니다.');
  }
}
