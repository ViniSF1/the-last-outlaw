/**
 * THE LAST OUTLAW - ENGINE DO MAPA PROCEDURAL DO ATO I
 * Gerador de mapas no estilo Slay the Spire, encontros narrativos e progressão.
 */

// ==========================================
// 1. SINTETIZADOR DE ÁUDIO WEB
// ==========================================
class SoundFX {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.masterGain = null;
    this.musicInterval = null;
  }

  init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.6;
    this.masterGain.connect(this.ctx.destination);
    this.startAmbient();
  }

  toggle() {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
    } else {
      this.masterGain.gain.setValueAtTime(0.6, this.ctx.currentTime);
      this.playClick();
    }
    return !this.isMuted;
  }

  playClick() {
    if (this.isMuted || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1000, t);
    osc.frequency.exponentialRampToValueAtTime(250, t + 0.04);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.04);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  playGunshot() {
    if (this.isMuted || !this.ctx) return;
    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.35;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, t);
    filter.frequency.exponentialRampToValueAtTime(60, t + 0.35);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.8, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(t);
  }

  startAmbient() {
    if (this.musicInterval) return;
    const notes = [146.83, 174.61, 220.0, 261.63, 293.66];
    let step = 0;
    this.musicInterval = setInterval(() => {
      if (this.isMuted || !this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(notes[step % notes.length], t);
      step = (step + 1) % notes.length;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(500, t);

      gain.gain.setValueAtTime(0.05, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 1.3);
    }, 2200);
  }
}

const audio = new SoundFX();

// ==========================================
// 2. GERADOR PROCEDURAL DE MAPAS (SLAY THE SPIRE)
// ==========================================
class ProceduralMapGenerator {
  constructor() {
    this.totalFloors = 10; // Do Andar 1 ao 10 (Chefe)
  }

  generate() {
    const nodes = {};
    const floors = [];

    // 1. Gera os andares de baixo para cima (andar 0 = base, andar 9 = chefe)
    for (let f = 0; f < this.totalFloors; f++) {
      const floorNodes = [];

      if (f === 0) {
        // Andar inicial: 3 ou 4 rotas de partida
        const startCount = 3 + (Math.random() > 0.5 ? 1 : 0);
        const xPositions = this.distributeX(startCount);
        for (let i = 0; i < startCount; i++) {
          const id = `node_${f}_${i}`;
          const node = {
            id,
            floor: f,
            type: 'combat', // Primeiro andar é sempre combate normal
            name: 'Confronto na Trilha',
            badge: 'COMBATE NORMAL',
            icon: '⚔️',
            x: xPositions[i],
            y: this.calculateY(f),
            next: []
          };
          nodes[id] = node;
          floorNodes.push(node);
        }
      } else if (f === this.totalFloors - 1) {
        // Andar Final: O CHEFE (Xerife Hank Mercer)
        const id = 'boss';
        const node = {
          id,
          floor: f,
          type: 'boss',
          name: 'Xerife Hank Mercer',
          badge: 'CHEFE DO ATO I',
          desc: 'O xerife corrupto de Blackwater Pass a mando de Silas Blackwood bloqueia a garganta do cânion com sua espingarda!',
          icon: '⭐',
          x: 50.0,
          y: this.calculateY(f),
          next: []
        };
        nodes[id] = node;
        floorNodes.push(node);
      } else if (f === this.totalFloors - 2) {
        // Pré-Chefe: 2 Fogueiras de descanso garantidas
        const xPositions = [35.0, 65.0];
        for (let i = 0; i < 2; i++) {
          const id = `node_${f}_${i}`;
          const node = {
            id,
            floor: f,
            type: 'rest',
            name: 'Fogueira Pré-Confronto',
            badge: 'LOCAL DE DESCANSO',
            icon: '🔥',
            x: xPositions[i],
            y: this.calculateY(f),
            next: ['boss']
          };
          nodes[id] = node;
          floorNodes.push(node);
        }
      } else if (f === 4) {
        // Andar do meio (Andar 5): Fogueiras de descanso garantidas
        const count = 3;
        const xPositions = this.distributeX(count);
        for (let i = 0; i < count; i++) {
          const id = `node_${f}_${i}`;
          const node = {
            id,
            floor: f,
            type: 'rest',
            name: 'Fogueira do Meio',
            badge: 'LOCAL DE DESCANSO',
            icon: '🔥',
            x: xPositions[i],
            y: this.calculateY(f),
            next: []
          };
          nodes[id] = node;
          floorNodes.push(node);
        }
      } else {
        // Andares intermediários: entre 3 e 4 nós de combate/elite/fogueira
        const count = 3 + (Math.random() > 0.4 ? 1 : 0);
        const xPositions = this.distributeX(count);

        for (let i = 0; i < count; i++) {
          const type = this.randomNodeType(f);
          const meta = this.getNodeMeta(type);
          const id = `node_${f}_${i}`;
          const node = {
            id,
            floor: f,
            type,
            name: meta.name,
            badge: meta.badge,
            icon: meta.icon,
            x: xPositions[i],
            y: this.calculateY(f),
            next: []
          };
          nodes[id] = node;
          floorNodes.push(node);
        }
      }

      floors.push(floorNodes);
    }

    // 2. Conecta caminhos válidos entre os andares (sem cruzar linhas)
    // Conecta todos os andares, incluindo o andar 4 (fogueiras do meio)
    for (let f = 0; f < this.totalFloors - 1; f++) {
      const current = floors[f];
      const nextFloor = floors[f + 1];

      current.forEach((nodeA, idxA) => {
        // Conecta ao nó mais próximo do andar seguinte
        let closest = nextFloor[0];
        let minDist = 999;
        nextFloor.forEach((nodeB) => {
          const dist = Math.abs(nodeA.x - nodeB.x);
          if (dist < minDist) {
            minDist = dist;
            closest = nodeB;
          }
        });
        nodeA.next.push(closest.id);

        // Possibilidade de ramificação adicional para criar múltiplos caminhos
        const branchChance = 0.45;
        if (Math.random() < branchChance) {
          const neighbor = nextFloor.find(n => n.id !== closest.id && Math.abs(nodeA.x - n.x) < 26);
          if (neighbor && !nodeA.next.includes(neighbor.id)) {
            nodeA.next.push(neighbor.id);
          }
        }
      });

      // Garante que todo nó do andar de cima tenha pelo menos 1 pai que chegue nele
      nextFloor.forEach(nodeB => {
        const hasParent = current.some(nA => nA.next.includes(nodeB.id));
        if (!hasParent) {
          // Encontra o nó do andar de baixo mais próximo e conecta
          let closest = current[0];
          let minDist = 999;
          current.forEach(nA => {
            const dist = Math.abs(nA.x - nodeB.x);
            if (dist < minDist) {
              minDist = dist;
              closest = nA;
            }
          });
          closest.next.push(nodeB.id);
        }
      });
    }

    return { nodes, floors };
  }

  calculateY(floorIndex) {
    // Andar 0 fica na base (~88%), Andar 9 (Chefe) fica no topo (~14%)
    const minY = 14;
    const maxY = 88;
    const step = (maxY - minY) / (this.totalFloors - 1);
    return maxY - (floorIndex * step);
  }

  distributeX(count) {
    const positions = [];
    const minX = 18;
    const maxX = 82;
    const step = (maxX - minX) / (count - 1 || 1);

    for (let i = 0; i < count; i++) {
      // Adiciona uma leve variação orgânica para parecer mapa desenhado à mão
      const jitter = (Math.random() - 0.5) * 4;
      const x = count === 1 ? 50 : minX + (i * step) + jitter;
      positions.push(Math.max(14, Math.min(86, Number(x.toFixed(1)))));
    }
    return positions.sort((a, b) => a - b);
  }

  randomNodeType(floor) {
    const roll = Math.random();
    if (floor <= 2) {
      if (roll < 0.60) return 'combat';
      if (roll < 0.80) return 'rest';
      return 'elite';
    } else if (floor <= 5) {
      if (roll < 0.30) return 'combat';
      if (roll < 0.55) return 'elite';
      return 'rest';
    } else {
      if (roll < 0.25) return 'combat';
      if (roll < 0.65) return 'elite';
      return 'rest';
    }
  }

  getNodeMeta(type) {
    const metas = {
      combat: { name: 'Emboscada dos Renegados', badge: 'COMBATE NORMAL', icon: '⚔️' },
      elite: { name: 'Duelo com Pistoleiro de Elite', badge: 'COMBATE DE ELITE', icon: '🤠' },
      rest: { name: 'Fogueira sob as Estrelas', badge: 'LOCAL DE DESCANSO', icon: '🔥' }
    };
    return metas[type] || metas.combat;
  }
}

// ==========================================
// 3. GERENCIADOR DO JOGO & MAPA
// ==========================================
class MapGameEngine {
  constructor() {
    this.generator = new ProceduralMapGenerator();
    this.board = document.getElementById('mapBoard');
    this.viewport = document.getElementById('mapScrollViewport');
    this.nodesLayer = document.getElementById('mapNodesLayer');
    this.svgRoutes = document.getElementById('mapRoutesSvg');

    // HUD
    this.livesVal = document.getElementById('playerLivesVal');
    this.floorVal = document.getElementById('playerFloorVal');
    this.newRunBtn = document.getElementById('newRunBtn');
    this.toggleAudioBtn = document.getElementById('toggleAudioBtn');
    this.audioIcon = document.getElementById('audioIcon');
    this.seedIndicator = document.getElementById('seedIndicator');

    // Modal de Encontro
    this.encounterOverlay = document.getElementById('encounterOverlay');
    this.encounterBadge = document.getElementById('encounterBadge');
    this.encounterTitle = document.getElementById('encounterTitle');
    this.encounterIconPreview = document.getElementById('encounterIconPreview');
    this.encounterStory = document.getElementById('encounterStory');
    this.encounterRewardBox = document.getElementById('encounterRewardBox');
    this.encounterActions = document.getElementById('encounterActions');

    // Modal de Vitória
    this.victoryModal = document.getElementById('victoryModal');
    this.victoryNewRunBtn = document.getElementById('victoryNewRunBtn');

    this.player = {
      lives: 3,
      maxLives: 3,
      floor: 1
    };

    this.mapData = null;
    this.currentNodeId = null;
    this.visitedNodes = new Set();
    this.availableNodeIds = [];
    this.traversedPaths = []; // [fromId, toId]

    // Estado do minigame em execução
    this.minigameWindow = null;
    this.pendingNodeId = null;
    this.lastMinigameWin = false;

    this.setupEvents();
    this.startNewRun();
  }

  setupEvents() {
    this.newRunBtn.addEventListener('click', () => {
      if (confirm('Deseja iniciar uma Nova Run com um mapa procedural totalmente novo?')) {
        this.startNewRun();
      }
    });

    this.victoryNewRunBtn.addEventListener('click', () => {
      this.victoryModal.close();
      this.startNewRun();
    });

    this.toggleAudioBtn.addEventListener('click', () => {
      const active = audio.toggle();
      this.audioIcon.textContent = active ? '🔊' : '🔇';
    });

    window.addEventListener('resize', () => {
      this.drawSvgRoutes();
    });

    // Ouve mensagens do minigame (quando a popup termina)
    window.addEventListener('message', (event) => {
      const data = event.data;
      if (data && data.type === 'MINIGAME_RESULT') {
        this.handleMinigameResult(data);
      }
    });

    // Ouve storage changes (caso o minigame use sessionStorage em vez de postMessage)
    window.addEventListener('storage', (event) => {
      if (event.key === 'minigameResult' && event.newValue) {
        try {
          const data = JSON.parse(event.newValue);
          this.handleMinigameResult(data);
          sessionStorage.removeItem('minigameResult');
        } catch (e) {}
      }
    });
  }

  /**
   * Escolhe um minigame aleatoriamente para o nó baseado no tipo e na dificuldade.
   * Combate Normal: Quick Draw (Fácil) ou Keyboard Showdown (Normal)
   * Elite: Keyboard Showdown (Normal) ou Deadeye Challenge (Difícil)
   * Chefe: randomiza entre os 3, sempre no nível "Chefe"
   */
  pickMinigame(nodeType) {
    const files = [
      'minigames/01_quick_draw/index.html',
      'minigames/02_keyboard_showdown/index.html',
      'minigames/03_deadeye_challenge/index.html'
    ];
    const idx = Math.floor(Math.random() * 3);

    if (nodeType === 'combat') {
      // Combate Normal: qualquer minigame, sempre nível FÁCIL
      return { file: files[idx], difficulty: 'easy' };
    } else if (nodeType === 'elite') {
      // Elite: qualquer minigame, nível NORMAL ou DIFÍCIL
      const diff = Math.random() < 0.5 ? 'normal' : 'hard';
      return { file: files[idx], difficulty: diff };
    } else if (nodeType === 'boss') {
      // Chefe: qualquer minigame, sempre nível CHEFE
      return { file: files[idx], difficulty: 'boss' };
    }
    return null;
  }

  /**
   * Processa o resultado do minigame e aplica recompensa/penalidade
   */
  handleMinigameResult(data) {
    const node = this.mapData.nodes[this.pendingNodeId];
    if (!node) return;

    const win = !!data.win;
    this.lastMinigameWin = win;

    if (win) {
      audio.playGunshot();
    } else {
      this.player.lives--;
      audio.playRicochet ? audio.playRicochet() : audio.playGunshot();
    }

    this.renderHUD();
    this.resolveEncounter(node);
}

  startNewRun() {
    // Reseta status do pistoleiro
    this.player = {
      lives: 3,
      maxLives: 3,
      floor: 1
    };

    this.currentNodeId = null;
    this.visitedNodes.clear();
    this.traversedPaths = [];

    // Gera novo mapa procedural
    this.mapData = this.generator.generate();
    this.seedIndicator.textContent = `Semente #${Math.floor(Math.random() * 89999 + 10000)} • 10 Andares`;

    // Nós de partida são todos do primeiro andar (f === 0)
    this.availableNodeIds = this.mapData.floors[0].map(n => n.id);

    this.renderHUD();
    this.renderNodes();
    this.drawSvgRoutes();

    // Rola para a base do mapa (onde o jogador começa)
    setTimeout(() => {
      this.viewport.scrollTop = this.viewport.scrollHeight;
    }, 150);

    audio.playClick();
  }

  renderHUD() {
    this.livesVal.textContent = `${'❤️'.repeat(this.player.lives)}${'🖤'.repeat(this.player.maxLives - this.player.lives)}`;
    this.floorVal.textContent = `Andar ${this.player.floor} / 10`;
  }

  renderNodes() {
    this.nodesLayer.innerHTML = '';

    Object.values(this.mapData.nodes).forEach(node => {
      const btn = document.createElement('button');
      btn.className = `map-node node-${node.type}`;
      btn.id = node.id;
      btn.style.left = `${node.x}%`;
      btn.style.top = `${node.y}%`;
      btn.title = `${node.name} (${node.badge})`;

      // Ícone perfeitamente centralizado
      const iconSpan = document.createElement('span');
      iconSpan.className = 'node-icon';
      iconSpan.textContent = node.icon;
      btn.appendChild(iconSpan);

      // Rótulo especial no chefe
      if (node.type === 'boss') {
        const bossLabel = document.createElement('span');
        bossLabel.className = 'boss-label';
        bossLabel.textContent = 'SHERIFF HANK MERCER';
        btn.appendChild(bossLabel);
      }

      const isCurrent = this.currentNodeId === node.id;
      const isVisited = this.visitedNodes.has(node.id);
      const isAvailable = this.availableNodeIds.includes(node.id);

      if (isCurrent) {
        btn.classList.add('current');
        const marker = document.createElement('div');
        marker.className = 'player-marker';
        marker.textContent = '🤠';
        btn.appendChild(marker);
      } else if (isVisited) {
        btn.classList.add('visited');
      } else if (isAvailable) {
        btn.classList.add('available');
      } else {
        btn.classList.add('locked');
      }

      btn.addEventListener('click', () => {
        if (isAvailable) {
          this.selectNode(node);
        }
      });

      this.nodesLayer.appendChild(btn);
    });
  }

  drawSvgRoutes() {
    this.svgRoutes.innerHTML = '';
    const w = this.board.offsetWidth;
    const h = this.board.offsetHeight;

    // 1. Desenha todas as linhas conectadas entre os andares
    Object.values(this.mapData.nodes).forEach(nodeA => {
      nodeA.next.forEach(targetId => {
        const nodeB = this.mapData.nodes[targetId];
        if (!nodeB) return;

        const x1 = (nodeA.x / 100) * w;
        const y1 = (nodeA.y / 100) * h;
        const x2 = (nodeB.x / 100) * w;
        const y2 = (nodeB.y / 100) * h;

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);

        // Verifica se essa rota já foi percorrida
        const isTraversed = this.traversedPaths.some(([from, to]) => from === nodeA.id && to === nodeB.id);
        const isUpcoming = this.currentNodeId === nodeA.id && this.availableNodeIds.includes(nodeB.id);

        if (isTraversed) {
          line.setAttribute('class', 'route-line visited-route');
        } else if (isUpcoming) {
          line.setAttribute('class', 'route-line available-route');
        } else {
          line.setAttribute('class', 'route-line');
        }

        this.svgRoutes.appendChild(line);
      });
    });
  }

  selectNode(node) {
    if (this.currentNodeId) {
      this.traversedPaths.push([this.currentNodeId, node.id]);
    }
    this.currentNodeId = node.id;
    this.visitedNodes.add(node.id);
    this.player.floor = node.floor + 1;

    audio.playClick();
    this.renderHUD();
    this.renderNodes();
    this.drawSvgRoutes();

    // Rola suavemente acompanhando o avanço do jogador
    const targetY = (node.y / 100) * this.board.offsetHeight - (this.viewport.offsetHeight / 2);
    this.viewport.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });

    // Dispara o encontro
    this.openEncounter(node);
  }

openEncounter(node) {
    this.encounterBadge.textContent = node.badge;
    this.encounterTitle.textContent = node.name;
    this.encounterIconPreview.textContent = node.icon;
    this.encounterActions.innerHTML = '';

    switch (node.type) {
      case 'combat':
        this.encounterStory.textContent = 'Três pistoleiros renegados da gangue de Silas Blackwood bloqueiam a passagem com revólveres em punho!';
        this.encounterRewardBox.textContent = `Vidas restantes: ${this.player.lives} de ${this.player.maxLives}`;
        this.addChoice('⚔️ DISPARAR (Minigame Aleatório)', 'Enfrente o duelo de reflexos!', this.player.lives > 0, () => {
          this.launchMinigame(node, 'combat');
        });
        break;

      case 'elite':
        this.encounterStory.textContent = 'Um duelista de elite veterano saca duas pistolas gravadas a ouro. A poeira sobe antes do primeiro disparo!';
        this.encounterRewardBox.textContent = `Vidas restantes: ${this.player.lives} de ${this.player.maxLives}`;
        this.addChoice('🤠 DISPARAR (Minigame de Elite)', 'Desafio de precisão e velocidade!', this.player.lives > 0, () => {
          this.launchMinigame(node, 'elite');
        });
        break;

      case 'boss':
        this.encounterStory.textContent = 'Xerife Hank Mercer aponta sua espingarda: "Você sobreviveu ao trem, Crowe... mas ninguém escapa de mim nestre desfiladeiro!"';
        this.encounterRewardBox.textContent = 'CONFRONTO FINAL DO ATO I';
        this.addChoice('⭐ DISPARAR O TIRO FINAL DA VINGANÇA!', 'Derrotar o Xerife e Vencer o Ato I', this.player.lives > 0, () => {
          this.launchMinigame(node, 'boss');
        });
        break;

      case 'rest':
        this.encounterStory.textContent = 'Você encontra um abrigo protegido sob as rochas do cânion. Uma fogueira afasta o frio da noite.';
        this.encounterRewardBox.textContent = 'Descanse antes do próximo desafio.';
        if (this.player.lives < this.player.maxLives) {
          this.addChoice('Descansar na Fogueira', 'Recuperar uma vida', true, () => {
            this.player.lives = Math.min(this.player.maxLives, this.player.lives + 1);
            audio.playClick();
            this.resolveEncounter(node);
          });
        }
        this.addChoice('Seguir em Frente', 'Continuar sem descansar', true, () => {
          audio.playClick();
          this.resolveEncounter(node);
        });
        break;

      default:
        this.encounterStory.textContent = 'Um local seguro é encontrado no caminho.';
        this.encounterRewardBox.textContent = 'Descanse antes do próximo desafio.';
        this.addChoice('Descansar', 'Recuperar uma vida', this.player.lives < this.player.maxLives, () => {
          this.player.lives = Math.min(this.player.maxLives, this.player.lives + 1);
          audio.playClick();
          this.resolveEncounter(node);
        });
        break;
    }

    this.encounterOverlay.classList.add('visible');
  }

  /**
   * Abre um minigame em popup para o nó atual
   */
  launchMinigame(node, nodeType) {
    const mg = this.pickMinigame(nodeType);
    if (!mg) return;

    this.pendingNodeId = node.id;
    this.encounterOverlay.classList.remove('visible');

    const url = `${mg.file}?difficulty=${mg.difficulty}&nodeType=${nodeType}`;
    this.minigameWindow = window.open(url, 'Minigame', 'width=1200,height=850,menubar=no,toolbar=no');

    if (!this.minigameWindow) {
      alert('Pop-ups desativados! Permita pop-ups para jogar os duelos.');
      this.resolveEncounter(node);
      return;
    }
  }

  addChoice(title, desc, enabled, callback) {
    const btn = document.createElement('button');
    btn.className = `encounter-choice-btn ${enabled ? '' : 'disabled'}`;
    btn.innerHTML = `<span>${title}</span> <small style="opacity:0.85">${desc}</small>`;
    if (enabled) {
      btn.addEventListener('click', callback);
    }
    this.encounterActions.appendChild(btn);
  }

  resolveEncounter(node) {
    this.encounterOverlay.classList.remove('visible');
    this.lastMinigameWin = false;

    // Verifica se o jogador perdeu todas as vidas
    if (this.player.lives <= 0) {
      this.renderHUD();
      this.renderNodes();
      this.drawSvgRoutes();
      setTimeout(() => {
        if (confirm('Você perdeu todas as vidas! Deseja iniciar uma nova run?')) {
          this.startNewRun();
        }
      }, 500);
      return;
    }

    // Se for o chefe e o jogador venceu, mostra o modal de vitória
    if (node.type === 'boss' && this.lastMinigameWin) {
      this.availableNodeIds = [...node.next];
      this.renderHUD();
      this.renderNodes();
      this.drawSvgRoutes();
      setTimeout(() => {
        this.victoryModal.showModal();
      }, 400);
      return;
    }

    // Se o jogador venceu o minigame, avança o mapa
    if (this.lastMinigameWin) {
      this.availableNodeIds = [...node.next];
      this.renderHUD();
      this.renderNodes();
      this.drawSvgRoutes();
      return;
    }

    // Para fogueiras e outros nós de descanso, avança normalmente
    this.availableNodeIds = [...node.next];
    this.renderHUD();
    this.renderNodes();
    this.drawSvgRoutes();
  }
}

// Inicia o motor do mapa assim que a página carregar
document.addEventListener('DOMContentLoaded', () => {
  new MapGameEngine();
});
