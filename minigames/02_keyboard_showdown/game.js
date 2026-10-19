/**
 * MINIGAME 2: KEYBOARD SHOWDOWN - DUELO DE VELOCIDADE DE TECLADO
 * The Last Outlaw
 */

class ShowdownAudio {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
  }

  init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();
  }

  playKey() {
    if (this.isMuted) return;
    this.init();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.05);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  playError() {
    if (this.isMuted) return;
    this.init();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.setValueAtTime(110, t + 0.08);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.21);
  }

  playGunshot() {
    if (this.isMuted) return;
    this.init();
    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, t);
    filter.frequency.exponentialRampToValueAtTime(80, t + 0.38);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.9, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(t);
  }

  playBell() {
    if (this.isMuted) return;
    this.init();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(920, t);
    osc.frequency.exponentialRampToValueAtTime(460, t + 0.5);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.6);
  }
}

const sfx = new ShowdownAudio();

const DIFFICULTIES = {
  easy: { name: 'Pistoleiro Calouro', minLen: 3, maxLen: 3, botDelay: 650, botErrorRate: 0.15 },
  normal: { name: 'Gatilho da Gangue', minLen: 4, maxLen: 5, botDelay: 420, botErrorRate: 0.10 },
  hard: { name: 'Assassino de Aluguel', minLen: 6, maxLen: 7, botDelay: 290, botErrorRate: 0.05 },
  boss: { name: 'Xerife Hank Mercer', minLen: 8, maxLen: 10, botDelay: 210, botErrorRate: 0.02 }
};

const KEY_OPTIONS = ['W', 'A', 'S', 'D'];

// Parâmetros vindos do mapa (URL)
const urlParams = new URLSearchParams(location.search);
const DIFF_KEY = urlParams.get('difficulty') || 'normal';
const NODE_TYPE = urlParams.get('nodeType') || 'combat';

// Recompensas por tipo de nó e vitória
const REWARDS = {
  combat:  { gold: 24, hpCost: 8,  ammoCost: 0 },
  elite:   { gold: 50, hpCost: 6,  ammoCost: 2 },
  boss:    { gold: 200, hpCost: 0, ammoCost: 0 },
  rest:    { gold: 0,  hpCost: 0, ammoCost: 0 },
  merchant:{ gold: 0,  hpCost: 0, ammoCost: 0 },
  event:   { gold: 35, hpCost: 0, ammoCost: 0 },
  treasure:{ gold: 55, hpCost: 0, ammoCost: 2 }
};

function saveResultAndReturn(win) {
  const r = REWARDS[NODE_TYPE] || REWARDS.combat;
  const result = {
    type: 'MINIGAME_RESULT',
    minigame: 'keyboard_showdown',
    win,
    nodeType: NODE_TYPE,
    difficulty: DIFF_KEY,
    gold: win ? r.gold : Math.floor(r.gold * 0.4),
    hpCost: win ? 0 : r.hpCost,
    ammoCost: win ? 0 : r.ammoCost
  };
  // Envia para a janela pai (mapa.js)
  if (window.opener && !window.opener.closed) {
    window.opener.postMessage(result, window.location.origin);
  }
  // Salva no storage como fallback
  try { sessionStorage.setItem('minigameResult', JSON.stringify(result)); } catch (e) {}
  // Fecha a popup
  window.close();
}

class KeyboardShowdownGame {
  constructor() {
    this.state = 'IDLE'; // COUNTDOWN, ACTIVE, PENALIZED, RESOLVED
    this.sequence = [];
    this.playerIndex = 0;
    this.enemyIndex = 0;
    this.playerErrors = 0;
    this.startTime = 0;
    this.timerInterval = null;
    this.botTimeout = null;
    this.countdownTimer = null;
    this.penaltyTimeout = null;

    // DOM
    this.arena = document.getElementById('duelArena');
    this.arenaBg = document.getElementById('arenaBg');
    this.flashOverlay = document.getElementById('flashOverlay');
    this.keysContainer = document.getElementById('keysDisplayContainer');
    this.stageText = document.getElementById('stageStateText');
    this.penaltyIndicator = document.getElementById('penaltyIndicator');
    this.timerDisplay = document.getElementById('timerDisplay');
    this.playerBar = document.getElementById('playerBarFill');
    this.enemyBar = document.getElementById('enemyBarFill');
    this.playerKeysCount = document.getElementById('playerKeysCount');
    this.enemyKeysCount = document.getElementById('enemyKeysCount');
    this.enemyNameDisplay = document.getElementById('enemyNameDisplay');

    // Modal
    this.resultModal = document.getElementById('resultModal');
    this.resultBadge = document.getElementById('resultBadge');
    this.resultTitle = document.getElementById('resultTitle');
    this.resultDetail = document.getElementById('resultDetail');
    this.finalPlayerTime = document.getElementById('finalPlayerTime');
    this.finalEnemyTime = document.getElementById('finalEnemyTime');
    this.finalPlayerErrors = document.getElementById('finalPlayerErrors');
    this.playAgainBtn = document.getElementById('playAgainBtn');

    // Canvas
    this.canvas = document.getElementById('fxCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    this.setupEvents();
    this.setDifficulty(DIFF_KEY);
    this.startRound();
    this.animateParticles();
  }

  resizeCanvas() {
    this.canvas.width = this.arena.clientWidth;
    this.canvas.height = this.arena.clientHeight;
  }

  setDifficulty(key) {
    const diff = DIFFICULTIES[key] || DIFFICULTIES.normal;
    this.enemyNameDisplay.textContent = diff.name;
  }

  setupEvents() {
    window.addEventListener('keydown', (e) => {
      const key = e.key.toUpperCase();
      if (KEY_OPTIONS.includes(key)) {
        if (!e.repeat) {
          this.handleKeyPress(key);
        }
      } else if (e.key === ' ' && this.state === 'RESOLVED') {
        e.preventDefault();
        this.startRound();
      }
    });

    // Teclado virtual
    document.querySelectorAll('.vkey').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.key;
        this.handleKeyPress(key);
      });
    });

    this.playAgainBtn.addEventListener('click', () => this.startRound());

    document.getElementById('toggleAudioBtn').addEventListener('click', () => {
      sfx.isMuted = !sfx.isMuted;
      document.getElementById('audioIcon').textContent = sfx.isMuted ? '🔇' : '🔊';
    });
  }

  generateSequence() {
    const diff = DIFFICULTIES[DIFF_KEY] || DIFFICULTIES.normal;
    const len = Math.floor(Math.random() * (diff.maxLen - diff.minLen + 1) + diff.minLen);
    const seq = [];

    for (let i = 0; i < len; i++) {
      // Evita repetição tripla consecutiva
      let validKeys = KEY_OPTIONS;
      if (seq.length >= 2 && seq[seq.length - 1] === seq[seq.length - 2]) {
        validKeys = KEY_OPTIONS.filter(k => k !== seq[seq.length - 1]);
      }
      seq.push(validKeys[Math.floor(Math.random() * validKeys.length)]);
    }
    return seq;
  }

  startRound() {
    this.clearAllTimers();
    this.state = 'COUNTDOWN';
    this.resultModal.classList.remove('visible');
    this.penaltyIndicator.classList.remove('visible');
    this.timerDisplay.textContent = '0.00s';

    this.sequence = this.generateSequence();
    this.playerIndex = 0;
    this.enemyIndex = 0;
    this.playerErrors = 0;

    const diff = DIFFICULTIES[DIFF_KEY] || DIFFICULTIES.normal;
    this.enemyNameDisplay.textContent = diff.name;

    this.renderKeys();
    this.updateProgressBars();

    // Contagem Regressiva
    let count = 3;
    this.stageText.className = 'stage-state-text';
    this.stageText.textContent = `PREPARAR: ${count}...`;

    this.countdownTimer = setInterval(() => {
      count--;
      if (count > 0) {
        this.stageText.textContent = `PREPARAR: ${count}...`;
      } else {
        clearInterval(this.countdownTimer);
        this.beginShowdown();
      }
    }, 850);
  }

  renderKeys() {
    this.keysContainer.innerHTML = '';
    this.sequence.forEach((key, idx) => {
      const box = document.createElement('div');
      box.className = 'key-box';
      box.id = `key_${idx}`;
      box.textContent = key;

      if (idx < this.playerIndex) {
        box.classList.add('completed');
      } else if (idx === this.playerIndex && (this.state === 'ACTIVE' || this.state === 'PENALIZED')) {
        box.classList.add('active');
      }

      this.keysContainer.appendChild(box);
    });
  }

  updateProgressBars() {
    const total = this.sequence.length;
    const playerPct = (this.playerIndex / total) * 100;
    const enemyPct = (this.enemyIndex / total) * 100;

    this.playerBar.style.width = `${playerPct}%`;
    this.enemyBar.style.width = `${enemyPct}%`;

    this.playerKeysCount.textContent = `${this.playerIndex} / ${total}`;
    this.enemyKeysCount.textContent = `${this.enemyIndex} / ${total}`;
  }

  beginShowdown() {
    this.state = 'ACTIVE';
    this.stageText.className = 'stage-state-text draw';
    this.stageText.textContent = 'DRAW!';
    sfx.playBell();

    this.renderKeys();

    this.startTime = performance.now();
    this.timerInterval = setInterval(() => {
      const elapsed = (performance.now() - this.startTime) / 1000;
      this.timerDisplay.textContent = `${elapsed.toFixed(2)}s`;
    }, 30);

    // Inicia IA do Bot
    this.scheduleNextBotKey();
  }

  scheduleNextBotKey() {
    if (this.state !== 'ACTIVE' && this.state !== 'PENALIZED') return;

    const diff = DIFFICULTIES[DIFF_KEY] || DIFFICULTIES.normal;
    // Variação de velocidade do bot
    const jitter = (Math.random() - 0.5) * 80;
    const delay = Math.max(120, diff.botDelay + jitter);

    this.botTimeout = setTimeout(() => {
      if (this.state !== 'ACTIVE' && this.state !== 'PENALIZED') return;

      // Chance de erro do bot (simula hesitação ou correção)
      if (Math.random() < diff.botErrorRate) {
        // Erro do bot aplica uma pausa de 350ms
        setTimeout(() => this.scheduleNextBotKey(), 350);
        return;
      }

      this.enemyIndex++;
      this.updateProgressBars();

      if (this.enemyIndex >= this.sequence.length) {
        // Bot terminou primeiro!
        this.resolveShowdown('DEFEAT');
      } else {
        this.scheduleNextBotKey();
      }
    }, delay);
  }

  handleKeyPress(key) {
    if (this.state !== 'ACTIVE') return;

    const expectedKey = this.sequence[this.playerIndex];

    if (key === expectedKey) {
      // Acerto!
      sfx.playKey();
      this.playerIndex++;
      this.renderKeys();
      this.updateProgressBars();

      if (this.playerIndex >= this.sequence.length) {
        // Jogador venceu!
        this.resolveShowdown('VICTORY');
      }
    } else {
      // Erro! Penalidade
      sfx.playError();
      this.playerErrors++;
      this.triggerPenalty();
    }
  }

  triggerPenalty() {
    this.state = 'PENALIZED';
    this.penaltyIndicator.classList.add('visible');

    // Treme a tecla atual em vermelho
    const currentBox = document.getElementById(`key_${this.playerIndex}`);
    if (currentBox) {
      currentBox.classList.add('error-shake');
    }

    if (this.penaltyTimeout) clearTimeout(this.penaltyTimeout);
    this.penaltyTimeout = setTimeout(() => {
      if (this.state === 'PENALIZED') {
        this.state = 'ACTIVE';
        this.penaltyIndicator.classList.remove('visible');
        if (currentBox) currentBox.classList.remove('error-shake');
      }
    }, 320); // 320ms de bloqueio
  }

  resolveShowdown(result) {
    this.state = 'RESOLVED';
    this.clearAllTimers();
    sfx.playGunshot();

    const finalPlayerSec = ((performance.now() - this.startTime) / 1000).toFixed(2);
    const diff = DIFFICULTIES[DIFF_KEY] || DIFFICULTIES.normal;
    const approxEnemySec = ((diff.botDelay * this.sequence.length) / 1000).toFixed(2);

    this.showFlash();
    this.shakeArena();
    this.createSmoke(result === 'VICTORY' ? this.canvas.width * 0.25 : this.canvas.width * 0.75, this.canvas.height * 0.6);

    setTimeout(() => {
      if (result === 'VICTORY') {
        this.resultBadge.className = 'result-badge';
        this.resultBadge.textContent = 'VITÓRIA';
        this.resultTitle.textContent = 'DEDOS DE AÇO!';
        this.resultDetail.textContent = `Você completou os ${this.sequence.length} comandos em ${finalPlayerSec}s antes do disparo adversário!`;
      } else {
        this.resultBadge.className = 'result-badge defeat';
        this.resultBadge.textContent = 'DERROTA';
        this.resultTitle.textContent = 'GATILHO ENGASGADO!';
        this.resultDetail.textContent = `O oponente completou a sequência primeiro (${approxEnemySec}s). Treine a agilidade de suas mãos!`;
      }

      this.finalPlayerTime.textContent = `${finalPlayerSec}s`;
      this.finalEnemyTime.textContent = `${approxEnemySec}s`;
      this.finalPlayerErrors.textContent = this.playerErrors;
      this.resultModal.classList.add('visible');

      // Envia resultado para o mapa e fecha a popup
      setTimeout(() => saveResultAndReturn(result === 'VICTORY'), 1200);
    }, 600);
  }

  showFlash() {
    this.flashOverlay.style.opacity = '0.9';
    setTimeout(() => {
      this.flashOverlay.style.opacity = '0';
    }, 80);
  }

  shakeArena() {
    this.arenaBg.style.transform = 'scale(1.04) translate(-4px, 3px)';
    setTimeout(() => {
      this.arenaBg.style.transform = 'scale(1)';
    }, 120);
  }

  createSmoke(x, y) {
    for (let i = 0; i < 35; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 30,
        y: y + (Math.random() - 0.5) * 30,
        vx: (Math.random() - 0.5) * 4,
        vy: -Math.random() * 3 - 1,
        radius: Math.random() * 8 + 4,
        alpha: 0.8,
        color: Math.random() > 0.4 ? 'rgba(200, 190, 180,' : 'rgba(255, 170, 70,'
      });
    }
  }

  animateParticles() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.radius += 0.2;
      p.alpha -= 0.012;

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = `${p.color} ${p.alpha})`;
      this.ctx.fill();
    }

    requestAnimationFrame(() => this.animateParticles());
  }

  clearAllTimers() {
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.botTimeout) clearTimeout(this.botTimeout);
    if (this.penaltyTimeout) clearTimeout(this.penaltyTimeout);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new KeyboardShowdownGame();
});
