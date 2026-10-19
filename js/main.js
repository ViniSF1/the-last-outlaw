/**
 * THE LAST OUTLAW - ENGINE DA TELA INICIAL
 * Gerencia a navegação, efeitos de partículas, sintetizador de áudio e modais.
 */

// ==========================================
// 1. SINTETIZADOR DE ÁUDIO WEB (SEM ARQUIVOS EXTERNOS)
// ==========================================
class SoundFX {
  constructor() {
    this.ctx = null;
    this.isMuted = true;
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.musicInterval = null;
  }

  init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.7;

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.8;
    this.sfxGain.connect(this.masterGain);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.5;
    this.musicGain.connect(this.masterGain);

    this.masterGain.connect(this.ctx.destination);
  }

  toggleAudio() {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      this.stopMusic();
    } else {
      this.masterGain.gain.setTargetAtTime(0.7, this.ctx.currentTime, 0.05);
      this.startAmbientMusic();
      this.playHammerClick();
    }
    return !this.isMuted;
  }

  // Efeito sonoro: Engatilhar do revólver (Hammer Cock)
  playHammerClick() {
    if (this.isMuted || !this.ctx) return;
    const t = this.ctx.currentTime;
    
    // Ruído metálico agudo
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.04);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.04);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.05);
  }

  // Efeito sonoro: Seleção leve no menu
  playTick() {
    if (this.isMuted || !this.ctx) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(500, t);
    osc.frequency.exponentialRampToValueAtTime(150, t + 0.03);

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.04);
  }

  // Efeito sonoro: Disparo de revólver ao clicar em "Jogar"
  playGunshot() {
    if (this.isMuted || !this.ctx) return;
    const t = this.ctx.currentTime;

    // Buffer de ruído branco para a explosão
    const bufferSize = this.ctx.sampleRate * 0.4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    // Filtro passa-baixa para o eco pesado do tiro
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, t);
    filter.frequency.exponentialRampToValueAtTime(80, t + 0.35);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.8, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(t);
  }

  // Trilha sonora procedural de violão acústico estilo faroeste
  startAmbientMusic() {
    if (this.musicInterval) return;

    // Escala menor harmônica / western (D, F, A, C, etc.)
    const notes = [146.83, 174.61, 220.0, 261.63, 293.66, 349.23, 440.0];
    let step = 0;

    const playChord = () => {
      if (this.isMuted || !this.ctx) return;
      const t = this.ctx.currentTime;
      const freq = notes[step % notes.length];
      step = (step + Math.floor(Math.random() * 3) + 1) % notes.length;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);

      // Filtro quente de madeira
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, t);

      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);

      osc.start(t);
      osc.stop(t + 1.3);
    };

    playChord();
    this.musicInterval = setInterval(playChord, 1600);
  }

  stopMusic() {
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }

  setMasterVolume(val) {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(val / 100, this.ctx.currentTime);
    }
  }

  setMusicVolume(val) {
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setValueAtTime(val / 100, this.ctx.currentTime);
    }
  }

  setSfxVolume(val) {
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(val / 100, this.ctx.currentTime);
    }
  }
}

const audio = new SoundFX();

// ==========================================
// 2. SISTEMA DE PARTÍCULAS (POEIRA & BRASAS)
// ==========================================
class AmbientParticles {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.maxParticles = 65;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.init();
    this.animate();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
  }

  init() {
    this.particles = [];
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push(this.createParticle(true));
    }
  }

  createParticle(randomStart = false) {
    const w = this.canvas.width || 537;
    const h = this.canvas.height || 346;
    return {
      x: randomStart ? Math.random() * w : -10,
      y: Math.random() * h,
      size: Math.random() * 2 + 0.8,
      speedX: Math.random() * 0.8 + 0.3,
      speedY: (Math.random() - 0.5) * 0.4,
      alpha: Math.random() * 0.6 + 0.2,
      isEmber: Math.random() > 0.65, // Algumas partículas brilham em laranja como brasas
    };
  }

  animate() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.ctx.clearRect(0, 0, w, h);

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.x += p.speedX;
      p.y += p.speedY;

      if (p.x > w + 10 || p.y < -10 || p.y > h + 10) {
        this.particles[i] = this.createParticle(false);
      }

      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      if (p.isEmber) {
        this.ctx.fillStyle = `rgba(255, 170, 70, ${p.alpha})`;
        this.ctx.shadowBlur = 4;
        this.ctx.shadowColor = '#ff6600';
      } else {
        this.ctx.fillStyle = `rgba(220, 190, 150, ${p.alpha * 0.6})`;
        this.ctx.shadowBlur = 0;
      }
      this.ctx.fill();
    }

    requestAnimationFrame(() => this.animate());
  }
}

// ==========================================
// 3. CONTROLE DO MENU & NAVEGAÇÃO
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('ambientCanvas');
  new AmbientParticles(canvas);

  const menuButtons = Array.from(document.querySelectorAll('.menu-btn'));
  const crosshair = document.getElementById('menuCrosshair');
  const gameScreen = document.getElementById('gameScreen');

  let activeIndex = -1;

  function updateCrosshair(btn) {
    if (!btn) {
      crosshair.style.opacity = '0';
      return;
    }
    const screenRect = gameScreen.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();

    // Posiciona a mira levemente à esquerda do botão
    const targetLeft = btnRect.left - screenRect.left - 8;
    const targetTop = btnRect.top - screenRect.top + btnRect.height / 2;

    crosshair.style.left = `${targetLeft}px`;
    crosshair.style.top = `${targetTop}px`;
    crosshair.style.opacity = '1';
  }

  function setActiveButton(index, playSound = true) {
    if (index < 0 || index >= menuButtons.length) return;
    activeIndex = index;

    menuButtons.forEach((btn, i) => {
      if (i === activeIndex) {
        btn.classList.add('active');
        btn.focus();
        updateCrosshair(btn);
        if (playSound) audio.playTick();
      } else {
        btn.classList.remove('active');
      }
    });
  }

  menuButtons.forEach((btn, idx) => {
    btn.addEventListener('mouseenter', () => {
      setActiveButton(idx, true);
    });

    btn.addEventListener('mouseleave', () => {
      btn.classList.remove('active');
      crosshair.style.opacity = '0';
      activeIndex = -1;
    });

    btn.addEventListener('click', () => {
      handleMenuAction(btn.id);
    });
  });

  // ==========================================
  // 4. REPRODUTOR DE CENAS DE HISTÓRIA (CUTSCENES)
  // ==========================================
  const STORY_SCENES = [
    { file: 'imagens/Cena 1 - história.png', label: 'CENA 1 / 8' },
    { file: 'imagens/Cena 2 - história.png', label: 'CENA 2 / 8' },
    { file: 'imagens/Cena 3 - história.png', label: 'CENA 3 / 8' },
    { file: 'imagens/Cena 4 - história.png', label: 'CENA 4 / 8' },
    { file: 'imagens/Cena 5 - história.png', label: 'CENA 5 / 8' },
    { file: 'imagens/Cena 6 - história.png', label: 'CENA 6 / 8' },
    { file: 'imagens/Cena 7 - história.png', label: 'CENA 7 / 8' },
    { file: 'imagens/Cena 8 - história.png', label: 'CENA 8 / 8' },
  ];

  class CutscenePlayer {
    constructor() {
      this.layer = document.getElementById('cutsceneLayer');
      this.slideA = document.getElementById('slideA');
      this.slideB = document.getElementById('slideB');
      this.imgA = document.getElementById('cutsceneImgA');
      this.imgB = document.getElementById('cutsceneImgB');
      this.progressBar = document.getElementById('cutsceneProgressBar');
      this.badge = document.getElementById('sceneBadge');
      this.skipBtn = document.getElementById('skipCutsceneBtn');
      this.endLayer = document.getElementById('prologueEndLayer');
      this.replayBtn = document.getElementById('replayStoryBtn');
      this.returnBtn = document.getElementById('returnMenuBtn');
      this.ambientBackdrop = document.querySelector('.ambient-backdrop');
      this.menuOverlay = document.querySelector('.menu-overlay');
      this.footer = document.getElementById('mainFooter');

      this.currentIndex = -1;
      this.activeSlideIsA = true;
      this.sceneTimer = null;
      this.sceneDurationMs = 10000; // Pelo menos 10 segundos por imagem
      this.isPlaying = false;
      this.canAdvance = true;

      this.preloadImages();
      this.setupEvents();
    }

    preloadImages() {
      STORY_SCENES.forEach(scene => {
        const img = new Image();
        img.src = scene.file;
      });
    }

    setupEvents() {
      // Clique em qualquer lugar para avançar
      this.layer.addEventListener('click', (e) => {
        if (e.target.closest('#skipCutsceneBtn')) return;
        if (this.isPlaying) this.advance();
      });

      // Botão Pular
      this.skipBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.finishCutscenes();
      });

      // Rever História
      this.replayBtn.addEventListener('click', () => {
        this.endLayer.classList.remove('visible');
        this.start();
      });

      // Voltar ao Menu
      this.returnBtn.addEventListener('click', () => {
        this.resetToMenu();
      });
    }

    start() {
      this.isPlaying = true;
      this.currentIndex = -1;
      this.activeSlideIsA = false;
      this.canAdvance = false; // Bloqueia avanço acidental pela mesma tecla Enter/Espaço que iniciou

      // Remove o foco de qualquer botão e desativa temporariamente
      if (document.activeElement && document.activeElement.blur) {
        document.activeElement.blur();
      }
      menuButtons.forEach(btn => {
        btn.disabled = true;
        btn.blur();
      });

      // Libera avanço manual após 400ms da tecla inicial
      setTimeout(() => {
        this.canAdvance = true;
      }, 400);

      // Inicia o áudio/violão caso ainda esteja mutado
      if (audio.isMuted) {
        audio.toggleAudio();
        const audioIcon = document.getElementById('audioIcon');
        const audioText = document.getElementById('audioText');
        if (audioIcon && audioText) {
          audioIcon.textContent = '🔊';
          audioText.textContent = 'Som: Ligado';
        }
      }

      // Oculta os botões do menu e rodapé
      this.menuOverlay.classList.add('hidden');
      if (this.footer) this.footer.classList.add('hidden');

      // Exibe a camada da cutscene
      this.layer.classList.add('visible');
      this.endLayer.classList.remove('visible');

      // Inicia a primeira cena
      this.advance();
    }

    advance() {
      // Previne duplo avanço rápido ou disparo acidental na inicialização
      if (!this.canAdvance && this.currentIndex >= 0) return;
      this.canAdvance = false;
      setTimeout(() => {
        this.canAdvance = true;
      }, 400);

      this.clearCurrentTimer();
      this.currentIndex++;

      if (this.currentIndex >= STORY_SCENES.length) {
        this.finishCutscenes();
        return;
      }

      const scene = STORY_SCENES[this.currentIndex];
      this.badge.textContent = `PRÓLOGO — ${scene.label}`;

      // Atualiza o ambient glow para combinar com as cores de cada cena
      if (this.ambientBackdrop) {
        this.ambientBackdrop.style.backgroundImage = `url('${scene.file}')`;
      }

      // Alterna entre slideA e slideB com fade cruzado suave
      const nextSlide = this.activeSlideIsA ? this.slideB : this.slideA;
      const prevSlide = this.activeSlideIsA ? this.slideA : this.slideB;
      const nextImg = this.activeSlideIsA ? this.imgB : this.imgA;

      nextImg.src = scene.file;
      nextSlide.classList.add('active');
      prevSlide.classList.remove('active');
      this.activeSlideIsA = !this.activeSlideIsA;

      // Animação da barra de tempo de 10 segundos
      this.animateProgressBar();

      // Som suave de transição
      audio.playTick();

      // Agenda a próxima cena após 10 segundos
      this.sceneTimer = setTimeout(() => {
        this.advance();
      }, this.sceneDurationMs);
    }

    animateProgressBar() {
      this.progressBar.style.transition = 'none';
      this.progressBar.style.width = '0%';
      void this.progressBar.offsetWidth; // Força reflow
      this.progressBar.style.transition = `width ${this.sceneDurationMs}ms linear`;
      this.progressBar.style.width = '100%';
    }

    clearCurrentTimer() {
      if (this.sceneTimer) {
        clearTimeout(this.sceneTimer);
        this.sceneTimer = null;
      }
      this.progressBar.style.transition = 'none';
    }

    finishCutscenes() {
      this.clearCurrentTimer();
      this.isPlaying = false;
      this.layer.classList.remove('visible');
      this.endLayer.classList.add('visible');
      audio.playHammerClick();
    }

    resetToMenu() {
      this.clearCurrentTimer();
      this.isPlaying = false;
      this.layer.classList.remove('visible');
      this.endLayer.classList.remove('visible');
      this.menuOverlay.classList.remove('hidden');
      if (this.footer) this.footer.classList.remove('hidden');

      // Reativa os botões do menu
      menuButtons.forEach(btn => {
        btn.disabled = false;
      });

      // Restaura o fundo do menu principal
      if (this.ambientBackdrop) {
        this.ambientBackdrop.style.backgroundImage = `url('imagens/Tela Inicial.png')`;
      }
    }
  }

  const cutscenePlayer = new CutscenePlayer();

  // Navegação unificada por teclado (sem conflitos entre menu e cutscenes)
  window.addEventListener('keydown', (e) => {
    // Se algum modal estiver aberto, não interfere
    if (document.querySelector('dialog[open]')) return;

    // Se estiver no reprodutor de história:
    if (cutscenePlayer.isPlaying) {
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') {
        e.preventDefault();
        e.stopPropagation();
        cutscenePlayer.advance();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        cutscenePlayer.finishCutscenes();
      }
      return;
    }

    // Se estiver no menu principal:
    if (e.key === 'm' || e.key === 'M') {
      window.location.href = 'mapa.html';
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = (activeIndex + 1) % menuButtons.length;
      setActiveButton(next, true);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = (activeIndex - 1 + menuButtons.length) % menuButtons.length;
      setActiveButton(prev, true);
    } else if (e.key === 'Enter' || e.key === ' ') {
      if (activeIndex >= 0 && activeIndex < menuButtons.length) {
        e.preventDefault();
        handleMenuAction(menuButtons[activeIndex].id);
      }
    }
  });

  // Ações de cada botão
  function handleMenuAction(btnId) {
    switch (btnId) {
      case 'btnJogar':
        audio.playGunshot();
        cutscenePlayer.start();
        break;

      case 'btnConfig':
        audio.playHammerClick();
        openModal('modalConfig');
        break;

      case 'btnCreditos':
        audio.playHammerClick();
        openModal('modalCreditos');
        break;

      case 'btnSair':
        audio.playHammerClick();
        openModal('modalSair');
        break;
    }
  }

  // Navegação direta para o mapa procedural (mapa.html)
  const startAct1Btn = document.getElementById('startAct1Btn');
  if (startAct1Btn) {
    startAct1Btn.addEventListener('click', () => {
      window.location.href = 'mapa.html';
    });
  }

  // ==========================================
  // 6. MODAIS & CONFIGURAÇÕES
  // ==========================================
  function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.showModal();
  }

  function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.close();
    audio.playTick();
  }

  // Botões de fechar dos modais
  document.getElementById('closeConfigBtn').addEventListener('click', () => closeModal('modalConfig'));
  document.getElementById('closeCreditosBtn').addEventListener('click', () => closeModal('modalCreditos'));
  document.getElementById('cancelSairBtn').addEventListener('click', () => closeModal('modalSair'));

  // Confirmação de Sair
  document.getElementById('confirmSairBtn').addEventListener('click', () => {
    closeModal('modalSair');
    alert('Até a próxima, pistoleiro! Feche esta aba quando desejar.');
  });

  // Sliders de Volume
  const masterVolume = document.getElementById('masterVolume');
  const masterVolumeVal = document.getElementById('masterVolumeVal');
  masterVolume.addEventListener('input', (e) => {
    masterVolumeVal.textContent = `${e.target.value}%`;
    audio.setMasterVolume(e.target.value);
  });

  const musicVolume = document.getElementById('musicVolume');
  const musicVolumeVal = document.getElementById('musicVolumeVal');
  musicVolume.addEventListener('input', (e) => {
    musicVolumeVal.textContent = `${e.target.value}%`;
    audio.setMusicVolume(e.target.value);
  });

  const sfxVolume = document.getElementById('sfxVolume');
  const sfxVolumeVal = document.getElementById('sfxVolumeVal');
  sfxVolume.addEventListener('input', (e) => {
    sfxVolumeVal.textContent = `${e.target.value}%`;
    audio.setSfxVolume(e.target.value);
  });

  // Alternar Tela Cheia
  const fullscreenToggle = document.getElementById('fullscreenToggle');
  fullscreenToggle.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  });

  // Botão de Áudio no Rodapé
  const toggleAudioBtn = document.getElementById('toggleAudioBtn');
  const audioIcon = document.getElementById('audioIcon');
  const audioText = document.getElementById('audioText');

  toggleAudioBtn.addEventListener('click', () => {
    const isPlaying = audio.toggleAudio();
    if (isPlaying) {
      audioIcon.textContent = '🔊';
      audioText.textContent = 'Som: Ligado';
    } else {
      audioIcon.textContent = '🔇';
      audioText.textContent = 'Som: Desligado';
    }
  });
});


