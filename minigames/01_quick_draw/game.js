/**
 * MINIGAME 1: QUICK DRAW - DUELO DE REFLEXOS
 * The Last Outlaw
 */

// Sintetizador Web Audio Far West
class DuelAudio {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
  }

  init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();
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
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(440, t + 0.6);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.75);
  }

  playRicochet() {
    if (this.isMuted) return;
    this.init();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1400, t);
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.25);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.26);
  }

  playHeartbeat() {
    if (this.isMuted) return;
    this.init();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.15);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.18);
  }
}

const sfx = new DuelAudio();

// Configurações de Dificuldade
const DIFFICULTIES = {
  easy: { name: 'Pistoleiro Inexperiente', min: 600, max: 900 },
  normal: { name: 'Forasteiro Renegado', min: 350, max: 600 },
  hard: { name: 'Bala de Prata Bart', min: 200, max: 350 },
  boss: { name: 'Xerife Hank Mercer', min: 150, max: 280 }
};

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
    minigame: 'quick_draw',
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

class QuickDrawGame {
  constructor() {
    this.state = 'IDLE'; // IDLE, COUNTDOWN, WAITING, SIGNAL, RESOLVED
    this.signalStartTime = 0;
    this.playerReactionTime = null;
    this.enemyReactionTime = null;
    this.enemyTimer = null;
    this.waitTimer = null;
    this.countdownTimer = null;

    // DOM
    this.arena = document.getElementById('duelArena');
    this.arenaBg = document.getElementById('arenaBg');
    this.flashOverlay = document.getElementById('flashOverlay');
    this.countdownText = document.getElementById('countdownText');
    this.drawSignal = document.getElementById('drawSignal');
    this.playerTimeEl = document.getElementById('playerTime');
    this.enemyTimeEl = document.getElementById('enemyTime');
    this.enemyNameEl = document.getElementById('enemyName');
    this.drawTouchBtn = document.getElementById('drawTouchBtn');

    // Modal
    this.resultModal = document.getElementById('resultModal');
    this.resultBadge = document.getElementById('resultBadge');
    this.resultTitle = document.getElementById('resultTitle');
    this.resultDetail = document.getElementById('resultDetail');
    this.finalPlayerTime = document.getElementById('finalPlayerTime');
    this.finalEnemyTime = document.getElementById('finalEnemyTime');
    this.playAgainBtn = document.getElementById('playAgainBtn');

    // Canvas de Partículas
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
    this.enemyNameEl.textContent = diff.name;
  }

  setupEvents() {
    // Tecla ENTER para sacar
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.triggerPlayerDraw();
      } else if (e.key === ' ' && this.state === 'RESOLVED') {
        e.preventDefault();
        this.startRound();
      }
    });

    // Botão de toque para dispositivos móveis ou mouse
    this.drawTouchBtn.addEventListener('click', () => {
      this.triggerPlayerDraw();
    });

    this.playAgainBtn.addEventListener('click', () => {
      this.startRound();
    });

    document.getElementById('toggleAudioBtn').addEventListener('click', () => {
      sfx.isMuted = !sfx.isMuted;
      document.getElementById('audioIcon').textContent = sfx.isMuted ? '🔇' : '🔊';
    });
  }

  startRound() {
    this.clearAllTimers();
    this.state = 'COUNTDOWN';
    this.resultModal.classList.remove('visible');
    this.drawSignal.classList.remove('active');
    this.playerTimeEl.textContent = '--- ms';
    this.enemyTimeEl.textContent = '--- ms';
    this.playerReactionTime = null;
    this.enemyReactionTime = null;

    const diff = DIFFICULTIES[DIFF_KEY] || DIFFICULTIES.normal;
    this.enemyNameEl.textContent = diff.name;

    // Contagem Regressiva
    let count = 3;
    this.countdownText.textContent = `${count}...`;
    sfx.playHeartbeat();

    this.countdownTimer = setInterval(() => {
      count--;
      if (count > 0) {
        this.countdownText.textContent = `${count}...`;
        sfx.playHeartbeat();
      } else {
        clearInterval(this.countdownTimer);
        this.beginWaitingPeriod();
      }
    }, 900);
  }

  beginWaitingPeriod() {
    this.state = 'WAITING';
    this.countdownText.textContent = 'ATENÇÃO...';

    // Intervalo aleatório de 2.0 a 5.0 segundos antes de DRAW!
    const delay = Math.random() * 3000 + 2000;

    this.waitTimer = setTimeout(() => {
      this.fireSignal();
    }, delay);
  }

  fireSignal() {
    this.state = 'SIGNAL';
    this.countdownText.textContent = '';
    this.drawSignal.classList.add('active');
    sfx.playBell();

    this.signalStartTime = performance.now();

    // Calcula tempo de reação do bot pela dificuldade
    const diff = DIFFICULTIES[DIFF_KEY] || DIFFICULTIES.normal;
    const botReaction = Math.floor(Math.random() * (diff.max - diff.min) + diff.min);

    this.enemyTimer = setTimeout(() => {
      this.triggerEnemyDraw(botReaction);
    }, botReaction);
  }

  triggerPlayerDraw() {
    // Se atirar antes do DRAW: Derrota automática por saque antecipado
    if (this.state === 'COUNTDOWN' || this.state === 'WAITING') {
      this.handleEarlyDrawFoul();
      return;
    }

    if (this.state !== 'SIGNAL') return;

    this.playerReactionTime = Math.round(performance.now() - this.signalStartTime);
    this.playerTimeEl.textContent = `${this.playerReactionTime} ms`;

    // Verifica se venceu o bot
    if (this.enemyReactionTime === null) {
      // Jogador atirou primeiro!
      clearTimeout(this.enemyTimer);
      const diff = DIFFICULTIES[DIFF_KEY] || DIFFICULTIES.normal;
      this.enemyReactionTime = Math.floor(Math.random() * (diff.max - diff.min) + diff.min);
      this.enemyTimeEl.textContent = `${this.enemyReactionTime} ms`;
      this.resolveDuel('VICTORY');
    }
  }

  triggerEnemyDraw(reactionTime) {
    if (this.state !== 'SIGNAL') return;

    this.enemyReactionTime = reactionTime;
    this.enemyTimeEl.textContent = `${this.enemyReactionTime} ms`;

    if (this.playerReactionTime === null) {
      // Bot atirou primeiro!
      this.resolveDuel('DEFEAT');
    }
  }

  handleEarlyDrawFoul() {
    this.clearAllTimers();
    this.state = 'RESOLVED';
    sfx.playRicochet();

    this.showFlash();
    this.shakeArena();

    this.resultBadge.className = 'result-badge foul';
    this.resultBadge.textContent = 'SAQUE ANTECIPADO';
    this.resultTitle.textContent = 'QUEIMA DE LARGADA!';
    this.resultDetail.textContent = 'Você sacou sua arma antes do sinal "DRAW!". Pelas regras do Velho Oeste, você foi desclassificado.';
    this.finalPlayerTime.textContent = 'FOUL';
    this.finalEnemyTime.textContent = 'VENCEDOR';
    this.resultModal.classList.add('visible');

    // Envia derrota por foul para o mapa
    setTimeout(() => saveResultAndReturn(false), 1200);
  }

  resolveDuel(result) {
    this.state = 'RESOLVED';
    this.clearAllTimers();
    sfx.playGunshot();

    this.showFlash();
    this.shakeArena();
    this.createSmokeParticles(result === 'VICTORY' ? this.canvas.width * 0.25 : this.canvas.width * 0.75, this.canvas.height * 0.6);

    setTimeout(() => {
      if (result === 'VICTORY') {
        this.resultBadge.className = 'result-badge';
        this.resultBadge.textContent = 'VITÓRIA';
        this.resultTitle.textContent = 'O MAIS RÁPIDO DO OESTE!';
        this.resultDetail.textContent = `Seu gatilho foi fatal! Você sacou em ${this.playerReactionTime} ms, superando o adversário por ${this.enemyReactionTime - this.playerReactionTime} ms de vantagem.`;
      } else {
        this.resultBadge.className = 'result-badge defeat';
        this.resultBadge.textContent = 'DERROTA';
        this.resultTitle.textContent = 'LENTO DEMAIS NO GATILHO!';
        this.resultDetail.textContent = `O adversário foi mais veloz. Ele disparou em ${this.enemyReactionTime} ms contra seus ${this.playerReactionTime || '> 999'} ms.`;
      }

      this.finalPlayerTime.textContent = `${this.playerReactionTime || '> 999'} ms`;
      this.finalEnemyTime.textContent = `${this.enemyReactionTime} ms`;
      this.resultModal.classList.add('visible');

      // Botão de voltar substituído por ação automática
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

  createSmokeParticles(x, y) {
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
    if (this.waitTimer) clearTimeout(this.waitTimer);
    if (this.enemyTimer) clearTimeout(this.enemyTimer);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new QuickDrawGame();
});
