// Rendering: the whole table is drawn from the game state, every time, so the
// screen can never drift from the rules. Cards are plain DOM, each suit told
// by its colour, its glyph and its name together.
import { SUIT_GLYPH, SUIT_COLOR } from './deck.mjs';
import { lanePower } from './rules.mjs';
import { isTideSuit } from './tide.mjs';

export const LANE_NAMES = ['Pantai Utara', 'Pantai Tengah', 'Pantai Selatan'];

export function buildCardElement(card, tide, afford) {
  const el = document.createElement('div');
  el.className = 'card';
  el.dataset.cardId = card.id;
  el.style.setProperty('--suit', SUIT_COLOR[card.suit]);
  if (isTideSuit(card.suit, tide)) el.classList.add('tide-card');
  if (afford === false) el.classList.add('unaffordable');
  const cost = document.createElement('span');
  cost.className = 'cost';
  cost.textContent = String(card.cost);
  cost.title = `Biaya ${card.cost} energi`;
  const value = document.createElement('div');
  value.className = 'value';
  value.textContent = String(card.value);
  const glyph = document.createElement('div');
  glyph.className = 'glyph';
  glyph.textContent = SUIT_GLYPH[card.suit];
  const name = document.createElement('div');
  name.className = 'suit-name';
  name.textContent = card.suit;
  el.append(cost, value, glyph, name);
  return el;
}

function fillHand(container, hand, tide, energy, selectable) {
  container.replaceChildren();
  for (const card of hand) {
    const afford = energy === undefined ? undefined : card.cost <= energy;
    const el = buildCardElement(card, tide, afford);
    if (!selectable) el.style.cursor = 'default';
    container.appendChild(el);
  }
}

/** Redraw the table, the hands, the tide banner and the lane totals. */
export function renderGame(game, ui) {
  const tideGlyph = SUIT_GLYPH[game.tide];
  ui.tide.innerHTML = '';
  const glyph = document.createElement('span');
  glyph.className = 'glyph';
  glyph.textContent = tideGlyph;
  glyph.style.color = SUIT_COLOR[game.tide];
  const label = document.createElement('span');
  label.textContent = `Pasang: ${game.tide} `;
  const bonus = document.createElement('span');
  bonus.className = 'bonus';
  bonus.textContent = '+2';
  ui.tide.append(glyph, label, bonus);
  ui.round.textContent = `Ronde ${game.round} / 12`;

  ui.youLife.innerHTML = `Nyawa <b>${game.you.life}</b>`;
  ui.youScore.innerHTML = `Skor <b>${game.you.score}</b>`;
  ui.youEnergy.innerHTML = `Energi <b>${game.you.energy}</b>`;
  ui.foeLife.innerHTML = `Nyawa <b>${game.foe.life}</b>`;
  ui.foeScore.innerHTML = `Skor <b>${game.foe.score}</b>`;
  ui.foeEnergy.innerHTML = `Energi <b>${game.foe.energy}</b>`;

  fillHand(ui.foeHand, game.foe.hand, game.tide, undefined, false);
  fillHand(ui.youHand, game.you.hand, game.tide, game.you.energy, true);

  game.lanes.forEach((lane, index) => {
    const laneEl = ui.laneEls[index];
    const foeRow = laneEl.querySelector('.foe-row');
    const youRow = laneEl.querySelector('.you-row');
    const powerEl = laneEl.querySelector('.lane-power');
    const markEl = laneEl.querySelector('.lane-mark');
    foeRow.replaceChildren();
    for (const card of lane.foe) foeRow.appendChild(buildCardElement(card, game.tide));
    youRow.replaceChildren();
    for (const card of lane.you) youRow.appendChild(buildCardElement(card, game.tide));
    const yours = lane.you.length + lane.foe.length > 0
      ? lanePower(lane.you, game.tide)
      : game.lastPowers[index][0];
    const theirs = lane.you.length + lane.foe.length > 0
      ? lanePower(lane.foe, game.tide)
      : game.lastPowers[index][1];
    powerEl.textContent = `${yours} — ${theirs}`;
    const result = game.lastResults[index];
    laneEl.classList.toggle('won-you', result === 'you');
    laneEl.classList.toggle('won-foe', result === 'foe');
    markEl.textContent = result === 'you' ? '★ Kamu' : result === 'foe' ? '★ Lawan' : '';
  });

  ui.endRound.disabled = game.phase !== 'play';
  ui.status.textContent =
    `Ronde ${game.round}. Pasang ${game.tide} +2. Nyawamu ${game.you.life}, nyawa lawan ${game.foe.life}. ` +
    `Skor ${game.you.score} lawan ${game.foe.score}. Energimu ${game.you.energy}.`;
}

/** Show the title, win or lose overlay; pass null to hide it. */
export function showOverlay(ui, kind, data) {
  if (!kind) {
    ui.overlay.classList.add('hidden');
    ui.overlay.classList.remove('win', 'lose');
    return;
  }
  ui.overlay.classList.remove('hidden');
  ui.overlay.classList.toggle('win', kind === 'win');
  ui.overlay.classList.toggle('lose', kind === 'lose');
  const glyphs = { title: '☾', win: '★', lose: '≋' };
  ui.overlayGlyph.textContent = glyphs[kind] ?? '☾';
  if (kind === 'title') {
    ui.overlayTitle.textContent = 'Pasang & Purnama';
    ui.overlayText.textContent =
      'Duel kartu di tiga pantai. Tiap ronde, pasang menguatkan satu lambang (+2). ' +
      'Mainkan kartumu ke jalur pantai, menangkan jalurnya untuk merebut skor dan mengikis nyawa lawan. ' +
      'Klik kartu lalu klik jalur — atau tekan 1–5 memilih kartu, Q/W/E menaruhnya, Enter mengakhiri ronde.';
    ui.overlayScore.textContent = 'Nyawa 20 · 12 ronde · tangan lawan selalu terbuka';
    ui.overlayButton.textContent = 'Mulai Bermain';
  } else if (kind === 'win') {
    ui.overlayTitle.textContent = 'MENANG!';
    ui.overlayText.textContent = 'Bulan purnama naik dan ombak berpihak padamu. Sang Penjaga Ombak menyerah di pantai.';
    ui.overlayScore.textContent = `Skor akhir ${data.you} — ${data.foe} · Nyawamu ${data.youLife} · Ronde ${data.round}`;
    ui.overlayButton.textContent = 'Main Lagi';
  } else {
    ui.overlayTitle.textContent = 'KALAH';
    ui.overlayText.textContent = 'Ombak menarikmu ke laut. Sang Penjaga Ombak masih menguasai pantai — coba lagi saat purnama berikutnya.';
    ui.overlayScore.textContent = `Skor akhir ${data.you} — ${data.foe} · Nyawamu ${data.youLife} · Ronde ${data.round}`;
    ui.overlayButton.textContent = 'Coba Lagi';
  }
}
