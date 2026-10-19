/* ==========================================================================
    THE LAST OUTLAW — DUELO 3: DEADEYE CHALLENGE (LOGIC)
    ========================================================================== */

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
    minigame: 'deadeye_challenge',
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

(() => {
  'use strict';

  // --- Audio Synthesis via Web Audio API ---
  class SoundFX {
    constructor() {
      this.ctx = null;
      this.enabled = true;
    }

    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    toggle() {
      this.enabled = !this.enabled;
      return this.enabled;
    }

    playCountdownBell(freq = 440) {
      if (!this.enabled) return;
      this.init();
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.85, now + 0.35);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.5);
    }

    playDrawTone() {
      if (!this.enabled) return;
      this.init();
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1100, now + 0.1);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.4);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.45);
    }

    playGunshot() {
      if (!this.enabled) return;
      this.init();
      const now = this.ctx.currentTime;

      // 1. Noise blast (explosion / gunpowder)
      const bufferSize = this.ctx.sampleRate * 0.35;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.06));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, now);
      filter.frequency.exponentialRampToValueAtTime(250, now + 0.3);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.7, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      noise.start(now);

      // 2. Low-frequency punch
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.18);

      oscGain.gain.setValueAtTime(0.6, now);
      oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    }

    playHitDing() {
      if (!this.enabled) return;
      this.init();
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.15);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    }

    playRicochet() {
      if (!this.enabled) return;
      this.init();
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1600, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.25);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    }

    playFanfare(win) {
      if (!this.enabled) return;
      this.init();
      const notes = win ? [440, 554, 659, 880] : [330, 311, 293, 220];
      const step = 0.12;
      const start = this.ctx.currentTime;

      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = win ? 'triangle' : 'sawtooth';
        osc.frequency.setValueAtTime(freq, start + idx * step);

        gain.gain.setValueAtTime(0.28, start + idx * step);
        gain.gain.exponentialRampToValueAtTime(0.001, start + (idx + 1) * step + 0.1);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(start + idx * step);
        osc.stop(start + (idx + 1) * step + 0.1);
      });
    }
  }

  // --- Visual Particles & FX Manager ---
  class FXEngine {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.particles = [];
      this.bulletHoles = [];
      this.resize();
      window.addEventListener('resize', () => this.resize());
      this.loop = this.loop.bind(this);
      requestAnimationFrame(this.loop);
    }

    resize() {
      const rect = this.canvas.getBoundingClientRect();
      this.canvas.width = rect.width;
      this.canvas.height = rect.height;
    }

    addShot(x, y, isHit) {
      // Bullet hole
      this.bulletHoles.push({
        x,
        y,
        radius: isHit ? 5 : 4,
        alpha: 1.0,
        decay: isHit ? 0.004 : 0.008
      });

      // Muzzle flash / spark particles
      const count = isHit ? 22 : 12;
      const baseColor = isHit ? '#ffd700' : '#888888';

      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 1.5;
        this.particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1.0,
          decay: Math.random() * 0.04 + 0.02,
          radius: Math.random() * 3 + 1,
          color: Math.random() > 0.4 ? baseColor : '#ff9800'
        });
      }

      // Smoke puff
      for (let i = 0; i < 4; i++) {
        this.particles.push({
          x: x + (Math.random() - 0.5) * 8,
          y: y + (Math.random() - 0.5) * 8,
          vx: (Math.random() - 0.5) * 1,
          vy: -Math.random() * 1.5 - 0.5,
          life: 1.0,
          decay: 0.015,
          radius: Math.random() * 8 + 6,
          color: 'rgba(200, 190, 180, 0.4)'
        });
      }
    }

    clear() {
      this.particles = [];
      this.bulletHoles = [];
    }

    loop() {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // Render bullet holes
      for (let i = this.bulletHoles.length - 1; i >= 0; i--) {
        const hole = this.bulletHoles[i];
        hole.alpha -= hole.decay;
        if (hole.alpha <= 0) {
          this.bulletHoles.splice(i, 1);
          continue;
        }
        this.ctx.save();
        this.ctx.globalAlpha = hole.alpha;
        this.ctx.beginPath();
        this.ctx.arc(hole.x, hole.y, hole.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = '#0f0b07';
        this.ctx.fill();
        this.ctx.lineWidth = 1.5;
        this.ctx.strokeStyle = '#4a3321';
        this.ctx.stroke();
        this.ctx.restore();
      }

      // Render particles
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.decay;

        if (p.life <= 0) {
          this.particles.splice(i, 1);
          continue;
        }

        this.ctx.save();
        this.ctx.globalAlpha = p.life;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = p.color;
        this.ctx.fill();
        this.ctx.restore();
      }

      requestAnimationFrame(this.loop);
    }
  }

  // --- Difficulty Settings ---
  const DIFFICULTIES = {
    easy: {
      id: 'easy',
      name: 'BANDIDO "JACK"',
      targetCount: 4,
      targetSize: 84, // diameter in px
      botBaseSpeed: 950, // ms per target
      botVariance: 200,
      botErrorChance: 0.15
    },
    normal: {
      id: 'normal',
      name: 'BILLY DOIS-TIROS',
      targetCount: 6,
      targetSize: 70,
      botBaseSpeed: 680,
      botVariance: 160,
      botErrorChance: 0.08
    },
    hard: {
      id: 'hard',
      name: 'COLT COLD-EYES',
      targetCount: 8,
      targetSize: 58,
      botBaseSpeed: 480,
      botVariance: 100,
      botErrorChance: 0.04
    },
    boss: {
      id: 'boss',
      name: 'EL GRINGO NEGRO',
      targetCount: 12,
      targetSize: 50,
      botBaseSpeed: 340,
      botVariance: 70,
      botErrorChance: 0.02
    }
  };

  // --- Main Game Controller ---
  class DeadeyeGame {
    constructor() {
      this.sound = new SoundFX();
      this.fx = new FXEngine(document.getElementById('fx-canvas'));

      // DOM Elements
      this.arena = document.getElementById('shooting-arena');
      this.targetsLayer = document.getElementById('targets-layer');
      this.signalBanner = document.getElementById('signal-banner');
      this.signalText = document.getElementById('signal-text');
      this.startOverlay = document.getElementById('start-overlay');
      this.resultOverlay = document.getElementById('result-overlay');
      this.btnStart = document.getElementById('btn-start');
      this.btnRestart = document.getElementById('btn-restart');
      this.btnSound = document.getElementById('btn-sound');
      this.soundIcon = document.getElementById('sound-icon');

      // HUD Elements
      this.matchTimerEl = document.getElementById('match-timer');
      this.playerProgressEl = document.getElementById('player-progress');
      this.playerScoreTextEl = document.getElementById('player-score-text');
      this.botProgressEl = document.getElementById('bot-progress');
      this.botScoreTextEl = document.getElementById('bot-score-text');
      this.botNameEl = document.getElementById('bot-name');
      this.accuracyStatEl = document.getElementById('accuracy-stat');
      this.shotsStatEl = document.getElementById('shots-stat');

      // Result Elements
      this.resultBadge = document.getElementById('result-badge');
      this.resultTitle = document.getElementById('result-title');
      this.resultDesc = document.getElementById('result-desc');
      this.resPlayerTime = document.getElementById('res-player-time');
      this.resBotTime = document.getElementById('res-bot-time');
      this.resAccuracy = document.getElementById('res-accuracy');
      this.resShots = document.getElementById('res-shots');

      // State
      this.currentDiff = DIFFICULTIES[DIFF_KEY] || DIFFICULTIES.normal;
      this.state = 'IDLE'; // IDLE, COUNTDOWN, PLAYING, FINISHED
      this.targets = []; // array of target elements & metadata
      this.playerTargetIndex = 0;
      this.botTargetIndex = 0;
      this.totalShots = 0;
      this.hitShots = 0;
      this.missShots = 0;
      this.matchStartTime = 0;
      this.playerFinishTime = null;
      this.botFinishTime = null;
      this.botTimeoutId = null;
      this.timerIntervalId = null;
      this.recoilCooldown = false;

      this.initEvents();
      this.setDifficulty(DIFF_KEY);
    }

    initEvents() {
      // Start & Restart buttons
      this.btnStart.addEventListener('click', () => this.startMatch());
      this.btnRestart.addEventListener('click', () => this.startMatch());

      // Audio toggle
      this.btnSound.addEventListener('click', () => {
        const active = this.sound.toggle();
        this.soundIcon.innerHTML = active ? '&#128266;' : '&#128263;';
        this.btnSound.style.opacity = active ? '1' : '0.6';
      });

      // Arena Click Handling
      this.arena.addEventListener('mousedown', e => this.handleArenaClick(e));

      // Global Spacebar shortcut
      window.addEventListener('keydown', e => {
        if (e.code === 'Space') {
          if (this.state === 'IDLE' || this.state === 'FINISHED') {
            e.preventDefault();
            this.startMatch();
          }
        }
      });
    }

    setDifficulty(key) {
      this.currentDiff = DIFFICULTIES[key] || DIFFICULTIES.normal;
      this.botNameEl.textContent = this.currentDiff.name;
      this.playerScoreTextEl.textContent = `0 / ${this.currentDiff.targetCount}`;
      this.botScoreTextEl.textContent = `0 / ${this.currentDiff.targetCount}`;
    }

    startMatch() {
      if (this.state === 'COUNTDOWN' || this.state === 'PLAYING') return;

      this.clearBotLoop();
      this.stopTimer();
      this.fx.clear();
      this.targetsLayer.innerHTML = '';

      this.state = 'COUNTDOWN';
      this.playerTargetIndex = 0;
      this.botTargetIndex = 0;
      this.totalShots = 0;
      this.hitShots = 0;
      this.missShots = 0;
      this.playerFinishTime = null;
      this.botFinishTime = null;

      this.playerProgressEl.style.width = '0%';
      this.botProgressEl.style.width = '0%';
      this.playerScoreTextEl.textContent = `0 / ${this.currentDiff.targetCount}`;
      this.botScoreTextEl.textContent = `0 / ${this.currentDiff.targetCount}`;
      this.matchTimerEl.textContent = '0.000s';
      this.accuracyStatEl.textContent = '100%';
      this.shotsStatEl.textContent = '0';

      this.startOverlay.classList.add('hidden');
      this.resultOverlay.classList.add('hidden');

      // Generate target positions on the arena
      this.generateTargets();

      // Start Countdown: READY -> STEADY -> DRAW!
      this.showSignal('READY', 'signal-ready');
      this.sound.playCountdownBell(440);

      setTimeout(() => {
        if (this.state !== 'COUNTDOWN') return;
        this.showSignal('STEADY', 'signal-steady');
        this.sound.playCountdownBell(550);
      }, 900);

      setTimeout(() => {
        if (this.state !== 'COUNTDOWN') return;
        this.showSignal('DRAW!', 'signal-draw');
        this.sound.playDrawTone();
        this.beginCombat();
      }, 1800);
    }

    showSignal(text, className) {
      this.signalBanner.className = '';
      this.signalText.className = className;
      this.signalText.textContent = text;
    }

    hideSignal() {
      this.signalBanner.className = 'hidden';
    }

    beginCombat() {
      this.state = 'PLAYING';
      this.matchStartTime = performance.now();

      // Hide DRAW signal after 650ms
      setTimeout(() => {
        if (this.state === 'PLAYING') this.hideSignal();
      }, 650);

      // Start Realtime Monotonic Timer
      this.timerIntervalId = setInterval(() => {
        if (this.state !== 'PLAYING') return;
        const elapsed = (performance.now() - this.matchStartTime) / 1000;
        this.matchTimerEl.textContent = elapsed.toFixed(3) + 's';
      }, 25);

      // Highlight first target
      this.updateTargetStyles();

      // Launch Bot AI loop
      this.scheduleNextBotShot();
    }

    stopTimer() {
      if (this.timerIntervalId) {
        clearInterval(this.timerIntervalId);
        this.timerIntervalId = null;
      }
    }

    generateTargets() {
      this.targets = [];
      const count = this.currentDiff.targetCount;
      const size = this.currentDiff.targetSize;
      const arenaRect = this.arena.getBoundingClientRect();

      // Safe bounds (keep away from HUD, edges)
      const minX = size * 0.8 + 20;
      const maxX = arenaRect.width - size * 0.8 - 20;
      const minY = size * 0.8 + 20;
      const maxY = arenaRect.height - size * 0.8 - 20;
      const minDistance = size * 1.35;

      const placedPoints = [];

      for (let i = 1; i <= count; i++) {
        let x = 0;
        let y = 0;
        let attempts = 0;
        let valid = false;

        while (attempts < 100 && !valid) {
          x = Math.floor(minX + Math.random() * (maxX - minX));
          y = Math.floor(minY + Math.random() * (maxY - minY));

          valid = true;
          for (const p of placedPoints) {
            const dist = Math.hypot(p.x - x, p.y - y);
            if (dist < minDistance) {
              valid = false;
              break;
            }
          }
          attempts++;
        }

        placedPoints.push({ x, y });

        // Create DOM element for target
        const targetEl = document.createElement('div');
        targetEl.className = 'dead-target is-upcoming';
        targetEl.dataset.index = (i - 1).toString();
        targetEl.dataset.number = i.toString();
        targetEl.style.width = `${size}px`;
        targetEl.style.height = `${size}px`;
        targetEl.style.left = `${x}px`;
        targetEl.style.top = `${y}px`;

        targetEl.innerHTML = `
          <div class="target-ring-outer"></div>
          <div class="target-ring-inner">
            <span class="target-number" style="font-size: ${Math.round(size * 0.45)}px">${i}</span>
          </div>
        `;

        this.targetsLayer.appendChild(targetEl);
        this.targets.push({
          number: i,
          element: targetEl,
          x,
          y,
          size,
          hitByPlayer: false
        });
      }
    }

    updateTargetStyles() {
      this.targets.forEach((t, idx) => {
        if (t.hitByPlayer) {
          t.element.classList.remove('is-active', 'is-upcoming');
        } else if (idx === this.playerTargetIndex) {
          t.element.classList.remove('is-upcoming');
          t.element.classList.add('is-active');
        } else {
          t.element.classList.remove('is-active');
          t.element.classList.add('is-upcoming');
        }
      });
    }

    handleArenaClick(e) {
      if (this.state !== 'PLAYING') return;

      // Prevent shot spam during recoil
      if (this.recoilCooldown) return;

      const arenaRect = this.arena.getBoundingClientRect();
      const clickX = e.clientX - arenaRect.left;
      const clickY = e.clientY - arenaRect.top;

      this.totalShots++;

      // Check if user clicked on a target
      const clickedTargetEl = e.target.closest('.dead-target');

      if (clickedTargetEl) {
        const targetIndex = parseInt(clickedTargetEl.dataset.index, 10);
        if (targetIndex === this.playerTargetIndex) {
          // CORRECT TARGET HIT!
          this.handleCorrectHit(targetIndex, clickX, clickY);
        } else {
          // WRONG NUMBER CLICKED
          this.handleMissShot(clickX, clickY, true);
        }
      } else {
        // CLICKED EMPTY ARENA SPACE
        this.handleMissShot(clickX, clickY, false);
      }

      this.updateStatsDisplay();
    }

    handleCorrectHit(index, x, y) {
      const targetObj = this.targets[index];
      targetObj.hitByPlayer = true;
      targetObj.element.classList.add('is-hit');

      this.hitShots++;
      this.sound.playGunshot();
      this.sound.playHitDing();
      this.fx.addShot(x, y, true);

      this.playerTargetIndex++;
      const count = this.currentDiff.targetCount;
      const pct = (this.playerTargetIndex / count) * 100;
      this.playerProgressEl.style.width = `${pct}%`;
      this.playerScoreTextEl.textContent = `${this.playerTargetIndex} / ${count}`;

      if (this.playerTargetIndex >= count) {
        // Player completed all targets!
        this.playerFinishTime = performance.now() - this.matchStartTime;
        this.endMatch('PLAYER_WIN');
      } else {
        this.updateTargetStyles();
      }
    }

    handleMissShot(x, y, isWrongTarget) {
      this.missShots++;
      this.sound.playGunshot();
      this.sound.playRicochet();
      this.fx.addShot(x, y, false);

      // Arena recoil & penalty delay
      this.arena.classList.add('recoil', 'miss-flash');
      this.recoilCooldown = true;

      setTimeout(() => {
        this.arena.classList.remove('recoil', 'miss-flash');
        this.recoilCooldown = false;
      }, 160);
    }

    updateStatsDisplay() {
      const accuracy = this.totalShots > 0 
        ? Math.round((this.hitShots / this.totalShots) * 100) 
        : 100;
      this.accuracyStatEl.textContent = `${accuracy}%`;
      this.shotsStatEl.textContent = this.totalShots.toString();
    }

    // --- Bot AI Simulation ---
    scheduleNextBotShot() {
      if (this.state !== 'PLAYING') return;

      const diff = this.currentDiff;
      const variance = (Math.random() * 2 - 1) * diff.botVariance;
      let delay = diff.botBaseSpeed + variance;

      // Bot error simulation (bot misses and takes longer)
      if (Math.random() < diff.botErrorChance) {
        delay += 350; // extra penalty delay for bot misfire
      }

      this.botTimeoutId = setTimeout(() => {
        if (this.state !== 'PLAYING') return;

        this.botExecuteShot();
      }, Math.max(180, delay));
    }

    botExecuteShot() {
      const targetObj = this.targets[this.botTargetIndex];
      if (!targetObj) return;

      // Visual indicator on target that bot hit it
      const botMarker = document.createElement('div');
      botMarker.className = 'bot-hit-marker';
      botMarker.textContent = 'X';
      botMarker.style.left = `${targetObj.x}px`;
      botMarker.style.top = `${targetObj.y}px`;
      this.targetsLayer.appendChild(botMarker);

      setTimeout(() => botMarker.remove(), 400);

      this.botTargetIndex++;
      const count = this.currentDiff.targetCount;
      const pct = (this.botTargetIndex / count) * 100;
      this.botProgressEl.style.width = `${pct}%`;
      this.botScoreTextEl.textContent = `${this.botTargetIndex} / ${count}`;

      if (this.botTargetIndex >= count) {
        // Bot completed all targets!
        this.botFinishTime = performance.now() - this.matchStartTime;
        this.endMatch('BOT_WIN');
      } else {
        this.scheduleNextBotShot();
      }
    }

    clearBotLoop() {
      if (this.botTimeoutId) {
        clearTimeout(this.botTimeoutId);
        this.botTimeoutId = null;
      }
    }

    endMatch(winner) {
      this.state = 'FINISHED';
      this.stopTimer();
      this.clearBotLoop();

      const elapsed = (performance.now() - this.matchStartTime) / 1000;
      this.matchTimerEl.textContent = elapsed.toFixed(3) + 's';

      const playerSec = this.playerFinishTime ? (this.playerFinishTime / 1000).toFixed(3) + 's' : (elapsed).toFixed(3) + 's';
      const botSec = this.botFinishTime ? (this.botFinishTime / 1000).toFixed(3) + 's' : (this.botTargetIndex < this.currentDiff.targetCount ? 'Abatido' : elapsed.toFixed(3) + 's');
      const accuracy = this.totalShots > 0 ? Math.round((this.hitShots / this.totalShots) * 100) : 100;

      const isPlayerWin = winner === 'PLAYER_WIN';

      if (isPlayerWin) {
        this.resultBadge.className = 'result-badge';
        this.resultBadge.textContent = 'VITÓRIA!';
        this.resultTitle.textContent = 'O MAIS RÁPIDO DO OESTE!';
        this.resultDesc.textContent = `Você completou os ${this.currentDiff.targetCount} alvos antes de ${this.currentDiff.name}!`;
        this.sound.playFanfare(true);
      } else {
        this.resultBadge.className = 'result-badge defeat';
        this.resultBadge.textContent = 'DERROTA!';
        this.resultTitle.textContent = 'FALTOU GATILHO!';
        this.resultDesc.textContent = `${this.currentDiff.name} acertou a sequência primeiro e levou a melhor.`;
        this.sound.playFanfare(false);
      }

      this.resPlayerTime.textContent = playerSec;
      this.resBotTime.textContent = botSec;
      this.resAccuracy.textContent = `${accuracy}%`;
      this.resShots.textContent = `${this.totalShots} (${this.missShots} erros)`;

      setTimeout(() => {
        this.resultOverlay.classList.remove('hidden');
        // Envia resultado para o mapa e fecha a popup
        setTimeout(() => saveResultAndReturn(isPlayerWin), 1200);
      }, 500);
    }
  }

  // Bootstrap when DOM is ready
  window.addEventListener('DOMContentLoaded', () => {
    new DeadeyeGame();
  });
})();
