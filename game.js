/**
 * ============================================================================
 * MATH CHAIN QUEST — DOUBLING & MULTIPLICATION ARCADE
 * Pure Vanilla JavaScript Game Engine & Web Audio Procedural Synthesizer
 * ============================================================================
 */

(function () {
  'use strict';

  const STORAGE_KEY_BEST = 'gamility_math_chain_best';
  const MAX_LIVES = 3;

  // --- AUDIO SYNTHESIZER (Web Audio API) ---
  class SoundController {
    constructor() {
      this.ctx = null;
      this.soundEnabled = true;
    }

    init() {
      if (this.ctx) return;
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }

    resume() {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    toggle() {
      this.soundEnabled = !this.soundEnabled;
      return this.soundEnabled;
    }

    // Clean tactile zap / card tap
    playZapTap() {
      if (!this.soundEnabled || !this.ctx) return;
      try {
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(480, t);
        osc.frequency.exponentialRampToValueAtTime(220, t + 0.05);

        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.05);
      } catch (e) {}
    }

    // Pitch-ascending synth chord on climbing each link!
    playLinkPowerUp(stepIndex = 0) {
      if (!this.soundEnabled || !this.ctx) return;
      try {
        const t = this.ctx.currentTime;
        // Ascending harmonic ladder based on climbed step
        const baseFreqs = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 659.25]; // C4, D4, E4, G4, A4, C5, E5
        const root = baseFreqs[Math.min(stepIndex, baseFreqs.length - 1)];

        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'triangle';
        osc1.frequency.setValueAtTime(root, t);
        osc2.frequency.setValueAtTime(root * 1.5, t); // Perfect fifth harmony

        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start(t);
        osc2.start(t);
        osc1.stop(t + 0.28);
        osc2.stop(t + 0.28);
      } catch (e) {}
    }

    // Friendly descending "uh-oh" wobble
    playWobble() {
      if (!this.soundEnabled || !this.ctx) return;
      try {
        const t = this.ctx.currentTime;
        const freqs = [350, 240];
        freqs.forEach((f, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, t + idx * 0.1);
          gain.gain.setValueAtTime(0.2, t + idx * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.1 + 0.15);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(t + idx * 0.1);
          osc.stop(t + idx * 0.1 + 0.16);
        });
      } catch (e) {}
    }

    // Gentle answer reveal bell chime
    playReveal() {
      if (!this.soundEnabled || !this.ctx) return;
      try {
        const t = this.ctx.currentTime;
        const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
        notes.forEach((f, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f, t + idx * 0.08);
          gain.gain.setValueAtTime(0.22, t + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.08 + 0.35);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(t + idx * 0.08);
          osc.stop(t + idx * 0.08 + 0.36);
        });
      } catch (e) {}
    }

    // Grand summit victory fanfare
    playSummitVictory() {
      if (!this.soundEnabled || !this.ctx) return;
      try {
        const t = this.ctx.currentTime;
        const notes = [
          { f: 523.25, time: 0, dur: 0.15 },    // C5
          { f: 659.25, time: 0.12, dur: 0.15 },  // E5
          { f: 783.99, time: 0.24, dur: 0.18 },  // G5
          { f: 1046.5, time: 0.42, dur: 0.6 }    // C6
        ];
        notes.forEach(n => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(n.f, t + n.time);
          gain.gain.setValueAtTime(0.3, t + n.time);
          gain.gain.exponentialRampToValueAtTime(0.001, t + n.time + n.dur);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(t + n.time);
          osc.stop(t + n.time + n.dur + 0.02);
        });
      } catch (e) {}
    }
  }

  // --- GAME ENGINE ---
  class MathChainGame {
    constructor() {
      // DOM Elements
      this.btnModeDouble = document.getElementById('btnModeDouble');
      this.btnModeMulti = document.getElementById('btnModeMulti');
      this.btnModeHalf = document.getElementById('btnModeHalf');

      this.btnTier1 = document.getElementById('btnTier1');
      this.btnTier2 = document.getElementById('btnTier2');
      this.btnTier3 = document.getElementById('btnTier3');

      this.btnToggleAudio = document.getElementById('btnToggleAudio');
      this.audioIcon = document.getElementById('audioIcon');

      this.currentLinkText = document.getElementById('currentLinkText');
      this.totalLinksText = document.getElementById('totalLinksText');
      this.hearts = [
        document.getElementById('heart1'),
        document.getElementById('heart2'),
        document.getElementById('heart3')
      ];

      this.hudScore = document.getElementById('hudScore');
      this.hudStreakBadge = document.getElementById('hudStreakBadge');
      this.hudBestScore = document.getElementById('hudBestScore');

      this.chainLadderTrack = document.getElementById('chainLadderTrack');
      this.modeBadgeIcon = document.getElementById('modeBadgeIcon');
      this.equationSubtext = document.getElementById('equationSubtext');
      this.eqTerm1 = document.getElementById('eqTerm1');
      this.eqOp = document.getElementById('eqOp');
      this.eqTerm2 = document.getElementById('eqTerm2');
      this.eqTarget = document.getElementById('eqTarget');
      this.equationHint = document.getElementById('equationHint');
      this.feedbackText = document.getElementById('feedbackText');

      this.choiceCards = [
        document.getElementById('choiceCard0'),
        document.getElementById('choiceCard1'),
        document.getElementById('choiceCard2'),
        document.getElementById('choiceCard3')
      ];
      this.choiceNums = [
        document.getElementById('choiceNum0'),
        document.getElementById('choiceNum1'),
        document.getElementById('choiceNum2'),
        document.getElementById('choiceNum3')
      ];

      this.fxOverlay = document.getElementById('fxOverlay');

      // Modals
      this.startOverlay = document.getElementById('startOverlay');
      this.victoryOverlay = document.getElementById('victoryOverlay');
      this.btnStartGame = document.getElementById('btnStartGame');
      this.btnNextChain = document.getElementById('btnNextChain');
      this.modalSelectDouble = document.getElementById('modalSelectDouble');
      this.modalSelectMulti = document.getElementById('modalSelectMulti');
      this.modalSelectHalf = document.getElementById('modalSelectHalf');

      this.victoryScore = document.getElementById('victoryScore');
      this.victoryBestScore = document.getElementById('victoryBestScore');
      this.victoryLinksClimbed = document.getElementById('victoryLinksClimbed');
      this.victoryMaxStreak = document.getElementById('victoryMaxStreak');
      this.victoryLivesLeft = document.getElementById('victoryLivesLeft');

      // Audio Controller
      this.audio = new SoundController();

      // State
      this.currentMode = 'double'; // 'double' | 'multi' | 'half'
      this.currentTier = 1; // 1: Easy, 2: Medium, 3: Hard
      this.score = 0;
      this.bestScore = 0;
      this.streak = 0;
      this.maxStreak = 0;
      this.livesLeft = MAX_LIVES;
      this.isLocked = false;

      // Active Chain Data
      this.chainNodes = []; // Array of { value, opSymbol, formulaText, hintText }
      this.currentLinkIdx = 0;
      this.totalLinks = 4;
      this.activeOptions = [];

      // Pending timers
      this.nextStepTimeout = null;
      this.mistakeTimeout = null;

      this.loadBestScore();
      this.bindEvents();
    }

    loadBestScore() {
      try {
        const val = localStorage.getItem(STORAGE_KEY_BEST);
        this.bestScore = val ? parseInt(val, 10) || 0 : 0;
        this.hudBestScore.textContent = this.bestScore.toLocaleString();
      } catch (e) {
        this.bestScore = 0;
      }
    }

    saveBestScore() {
      if (this.score > this.bestScore) {
        this.bestScore = this.score;
        try {
          localStorage.setItem(STORAGE_KEY_BEST, this.bestScore.toString());
        } catch (e) {}
        this.hudBestScore.textContent = this.bestScore.toLocaleString();
      }
      return this.bestScore;
    }

    bindEvents() {
      // Audio toggle
      this.btnToggleAudio.addEventListener('click', (e) => {
        e.stopPropagation();
        this.audio.init();
        const enabled = this.audio.toggle();
        this.audioIcon.textContent = enabled ? '🔊' : '🔇';
      });

      // Start Modal mode options
      this.modalSelectDouble.addEventListener('click', () => {
        this.setMode('double');
      });
      this.modalSelectMulti.addEventListener('click', () => {
        this.setMode('multi');
      });
      this.modalSelectHalf.addEventListener('click', () => {
        this.setMode('half');
      });

      this.btnStartGame.addEventListener('click', () => {
        this.audio.init();
        this.audio.resume();
        this.startOverlay.style.display = 'none';
        this.startNewChain();
      });

      this.btnNextChain.addEventListener('click', () => {
        this.victoryOverlay.style.display = 'none';
        this.startNewChain();
      });

      // Mode Switchers in Top Bar
      this.btnModeDouble.addEventListener('click', () => {
        this.audio.playZapTap();
        this.setMode('double');
        this.startNewChain();
      });

      this.btnModeMulti.addEventListener('click', () => {
        this.audio.playZapTap();
        this.setMode('multi');
        this.startNewChain();
      });

      this.btnModeHalf.addEventListener('click', () => {
        this.audio.playZapTap();
        this.setMode('half');
        this.startNewChain();
      });

      // Tier Switchers: 1, 2, 3
      [this.btnTier1, this.btnTier2, this.btnTier3].forEach(btn => {
        btn.addEventListener('click', () => {
          this.audio.playZapTap();
          const tier = parseInt(btn.dataset.tier, 10);
          if (this.currentTier === tier && !this.isLocked) return;
          this.currentTier = tier;
          this.updateTierUI();
          this.startNewChain();
        });
      });

      // 4 Choice Cards Clicks
      this.choiceCards.forEach((btn, idx) => {
        btn.addEventListener('click', () => {
          this.handleChoiceSelect(idx);
        });
      });

      // Keyboard Shortcuts (1, 2, 3, 4)
      window.addEventListener('keydown', (e) => {
        if (e.key === '1') this.handleChoiceSelect(0);
        else if (e.key === '2') this.handleChoiceSelect(1);
        else if (e.key === '3') this.handleChoiceSelect(2);
        else if (e.key === '4') this.handleChoiceSelect(3);
      });
    }

    setMode(mode) {
      this.currentMode = mode;
      this.updateModeUI();
    }

    updateModeUI() {
      [this.btnModeDouble, this.btnModeMulti, this.btnModeHalf].forEach(btn => btn.classList.remove('active'));
      [this.modalSelectDouble, this.modalSelectMulti, this.modalSelectHalf].forEach(btn => btn.classList.remove('active'));

      if (this.currentMode === 'double') {
        this.btnModeDouble.classList.add('active');
        this.modalSelectDouble.classList.add('active');
        this.modeBadgeIcon.textContent = '⚡';
      } else if (this.currentMode === 'multi') {
        this.btnModeMulti.classList.add('active');
        this.modalSelectMulti.classList.add('active');
        this.modeBadgeIcon.textContent = '✖️';
      } else {
        this.btnModeHalf.classList.add('active');
        this.modalSelectHalf.classList.add('active');
        this.modeBadgeIcon.textContent = '➗';
      }
    }

    updateTierUI() {
      [this.btnTier1, this.btnTier2, this.btnTier3].forEach(btn => {
        if (parseInt(btn.dataset.tier, 10) === this.currentTier) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    }

    updateHeartsUI() {
      this.hearts.forEach((h, idx) => {
        if (idx < this.livesLeft) {
          h.classList.add('active');
          h.classList.remove('lost');
        } else {
          h.classList.remove('active');
          h.classList.add('lost');
        }
      });
    }

    // --- ROBUST DISTRACTOR GENERATOR (Fail-Proof O(1) Execution) ---
    generateDistractors(targetNum, count = 3, step = 2) {
      const optionSet = new Set([targetNum]);

      // Step 1: Plausible calculation slips (+/- 2, 4, 6, 8, etc.)
      const offsets = [
        step, -step,
        step * 2, -step * 2,
        4, -4,
        10, -10,
        2, -2
      ];

      for (const off of offsets) {
        const candidate = targetNum + off;
        if (candidate > 0 && candidate !== targetNum && !optionSet.has(candidate)) {
          optionSet.add(candidate);
          if (optionSet.size >= count + 1) break;
        }
      }

      // Step 2: Random nearby fallbacks
      let attempts = 0;
      while (optionSet.size < count + 1 && attempts < 50) {
        attempts++;
        const delta = (Math.floor(Math.random() * 9) - 4) * (step || 2);
        const candidate = targetNum + (delta === 0 ? step * 3 : delta);
        if (candidate > 0 && !optionSet.has(candidate)) {
          optionSet.add(candidate);
        }
      }

      // Step 3: Absolute emergency expansion
      let emergencyVal = Math.max(...optionSet) + 1;
      while (optionSet.size < count + 1) {
        optionSet.add(emergencyVal++);
      }

      const arr = Array.from(optionSet);
      arr.sort(() => Math.random() - 0.5);
      return arr;
    }

    // --- CHAIN GENERATION ENGINE ---
    startNewChain() {
      // Clear timers immediately
      if (this.nextStepTimeout) {
        clearTimeout(this.nextStepTimeout);
        this.nextStepTimeout = null;
      }
      if (this.mistakeTimeout) {
        clearTimeout(this.mistakeTimeout);
        this.mistakeTimeout = null;
      }

      this.isLocked = false;
      this.livesLeft = MAX_LIVES;
      this.updateHeartsUI();
      this.updateModeUI();
      this.updateTierUI();

      this.buildChainSequence();
      this.currentLinkIdx = 0;
      this.renderChainLadder();
      this.loadStepQuestion();
    }

    buildChainSequence() {
      // Determine number of links based on tier
      // Tier 1: 4 links | Tier 2: 5 links | Tier 3: 6 links
      this.totalLinks = this.currentTier === 1 ? 4 : (this.currentTier === 2 ? 5 : 6);
      this.totalLinksText.textContent = this.totalLinks.toString();

      let seed = 2;
      let multiplier = 2;
      let isHalving = (this.currentMode === 'half');

      if (this.currentMode === 'double') {
        multiplier = 2;
        if (this.currentTier === 1) {
          const seeds = [2, 3, 4, 5];
          seed = seeds[Math.floor(Math.random() * seeds.length)];
        } else if (this.currentTier === 2) {
          const seeds = [6, 7, 8, 9, 12, 14, 15];
          seed = seeds[Math.floor(Math.random() * seeds.length)];
        } else {
          const seeds = [16, 18, 20, 24, 25, 30, 45, 50];
          seed = seeds[Math.floor(Math.random() * seeds.length)];
        }
      } else if (this.currentMode === 'multi') {
        if (this.currentTier === 1) {
          multiplier = 3;
          const seeds = [2, 3, 4];
          seed = seeds[Math.floor(Math.random() * seeds.length)];
        } else if (this.currentTier === 2) {
          multiplier = 5;
          const seeds = [2, 3, 4, 5];
          seed = seeds[Math.floor(Math.random() * seeds.length)];
        } else {
          multiplier = 10;
          const seeds = [3, 7, 12, 15, 25];
          seed = seeds[Math.floor(Math.random() * seeds.length)];
        }
      } else {
        // Halving Mode (÷2)
        multiplier = 0.5;
        if (this.currentTier === 1) {
          const seeds = [16, 24, 32, 48];
          seed = seeds[Math.floor(Math.random() * seeds.length)];
        } else if (this.currentTier === 2) {
          const seeds = [64, 96, 128, 160];
          seed = seeds[Math.floor(Math.random() * seeds.length)];
        } else {
          const seeds = [256, 384, 512, 640];
          seed = seeds[Math.floor(Math.random() * seeds.length)];
        }
      }

      // Generate sequence nodes
      const nodes = [];
      let currentVal = seed;
      nodes.push({ value: currentVal, isStart: true });

      for (let i = 0; i < this.totalLinks; i++) {
        let prevVal = currentVal;
        let nextVal = isHalving ? Math.floor(prevVal / 2) : Math.floor(prevVal * multiplier);
        currentVal = nextVal;

        let opText = isHalving ? '÷ 2' : (multiplier === 2 ? '× 2' : `× ${multiplier}`);
        let eqText = isHalving
          ? `${prevVal.toLocaleString()} ÷ 2 = ?`
          : (multiplier === 2 ? `${prevVal.toLocaleString()} + ${prevVal.toLocaleString()} = ?` : `${prevVal.toLocaleString()} × ${multiplier} = ?`);
        let hintText = multiplier === 2
          ? `Or: ${prevVal.toLocaleString()} × 2`
          : (isHalving ? `Half of ${prevVal.toLocaleString()}` : `Progressive table of ${multiplier}`);

        nodes.push({
          prevVal: prevVal,
          value: nextVal,
          multiplier: multiplier,
          isHalving: isHalving,
          opText: opText,
          eqText: eqText,
          hintText: hintText
        });
      }

      this.chainNodes = nodes;
    }

    renderChainLadder() {
      this.chainLadderTrack.innerHTML = '';

      // Starting seed node
      const seedNode = document.createElement('div');
      seedNode.className = 'chain-node solved';
      seedNode.innerHTML = `
        <span class="node-step-badge">★</span>
        <span>${this.chainNodes[0].value.toLocaleString()}</span>
      `;
      this.chainLadderTrack.appendChild(seedNode);

      // Links
      for (let i = 1; i < this.chainNodes.length; i++) {
        const arrow = document.createElement('span');
        arrow.className = 'chain-arrow';
        arrow.textContent = '➔';
        this.chainLadderTrack.appendChild(arrow);

        const node = document.createElement('div');
        node.className = 'chain-node upcoming';
        node.id = `chainNode_${i}`;
        node.innerHTML = `
          <span class="node-step-badge">${i}</span>
          <span class="node-val">?</span>
        `;
        this.chainLadderTrack.appendChild(node);
      }
    }

    loadStepQuestion() {
      this.currentLinkText.textContent = (this.currentLinkIdx + 1).toString();
      const stepData = this.chainNodes[this.currentLinkIdx + 1];

      // Update chain nodes visually
      for (let i = 1; i < this.chainNodes.length; i++) {
        const nodeEl = document.getElementById(`chainNode_${i}`);
        if (!nodeEl) continue;
        if (i <= this.currentLinkIdx) {
          nodeEl.className = 'chain-node solved';
          nodeEl.querySelector('.node-val').textContent = this.chainNodes[i].value.toLocaleString();
        } else if (i === this.currentLinkIdx + 1) {
          nodeEl.className = 'chain-node active';
          nodeEl.querySelector('.node-val').textContent = '?';
        } else {
          nodeEl.className = 'chain-node upcoming';
          nodeEl.querySelector('.node-val').textContent = '?';
        }
      }

      // Update Equation Card
      if (stepData.isHalving) {
        this.equationSubtext.textContent = 'HALF THIS NUMBER:';
        this.eqTerm1.textContent = stepData.prevVal.toLocaleString();
        this.eqOp.textContent = '÷';
        this.eqTerm2.textContent = '2';
        this.equationHint.textContent = `What is half of ${stepData.prevVal.toLocaleString()}?`;
      } else if (stepData.multiplier === 2) {
        this.equationSubtext.textContent = 'DOUBLE THIS NUMBER:';
        this.eqTerm1.textContent = stepData.prevVal.toLocaleString();
        this.eqOp.textContent = '+';
        this.eqTerm2.textContent = stepData.prevVal.toLocaleString();
        this.equationHint.textContent = `Or: ${stepData.prevVal.toLocaleString()} × 2 = ?`;
      } else {
        this.equationSubtext.textContent = `MULTIPLY BY ${stepData.multiplier}:`;
        this.eqTerm1.textContent = stepData.prevVal.toLocaleString();
        this.eqOp.textContent = '×';
        this.eqTerm2.textContent = stepData.multiplier.toString();
        this.equationHint.textContent = `Multiplication table of ${stepData.multiplier}`;
      }

      this.eqTarget.textContent = '?';
      this.feedbackText.textContent = 'Choose the matching output below!';

      // Generate Options
      const stepVal = stepData.multiplier === 2 ? 2 : (stepData.isHalving ? 2 : stepData.multiplier);
      const options = this.generateDistractors(stepData.value, 3, stepVal);
      this.activeOptions = options;

      this.choiceCards.forEach((card, idx) => {
        card.classList.remove('correct', 'wrong');
        card.disabled = false;
        this.choiceNums[idx].textContent = options[idx].toLocaleString();
      });

      this.isLocked = false;
    }

    // --- SELECTION & VALIDATION ---
    handleChoiceSelect(choiceIdx) {
      if (this.isLocked) return;
      const stepData = this.chainNodes[this.currentLinkIdx + 1];
      if (!stepData) return;

      const selectedVal = this.activeOptions[choiceIdx];
      const isCorrect = (selectedVal === stepData.value);
      const cardEl = this.choiceCards[choiceIdx];

      if (isCorrect) {
        this.handleStepSuccess(cardEl, stepData.value);
      } else {
        this.handleStepMistake(cardEl, selectedVal, stepData.value);
      }
    }

    handleStepSuccess(cardEl, targetVal) {
      this.isLocked = true;
      cardEl.classList.add('correct');
      this.eqTarget.textContent = targetVal.toLocaleString();
      this.eqTarget.style.borderColor = '#10b981';
      this.eqTarget.style.color = '#059669';

      this.currentLinkIdx++;
      this.audio.playLinkPowerUp(this.currentLinkIdx);
      this.spawnSparks(cardEl);

      this.streak++;
      if (this.streak > this.maxStreak) this.maxStreak = this.streak;

      // Base points based on tier and link climbed
      const basePts = this.currentTier === 1 ? 50 : (this.currentTier === 2 ? 100 : 200);
      const earnedPts = basePts * this.currentLinkIdx + (this.streak > 1 ? this.streak * 10 : 0);
      this.score += earnedPts;
      this.saveBestScore();

      this.hudScore.textContent = this.score.toLocaleString();
      if (this.streak > 1) {
        this.hudStreakBadge.textContent = `${this.streak}🔥`;
        this.hudStreakBadge.style.display = 'inline-block';
      }

      this.feedbackText.textContent = `⚡ Powered Up! +${earnedPts} pts! ⚡`;

      if (this.currentLinkIdx >= this.totalLinks) {
        // Summit Reached!
        if (this.nextStepTimeout) clearTimeout(this.nextStepTimeout);
        this.nextStepTimeout = setTimeout(() => {
          this.handleSummitVictory();
        }, 800);
      } else {
        if (this.nextStepTimeout) clearTimeout(this.nextStepTimeout);
        this.nextStepTimeout = setTimeout(() => {
          this.loadStepQuestion();
        }, 900);
      }
    }

    handleStepMistake(cardEl, wrongVal, targetVal) {
      this.isLocked = true;
      cardEl.classList.add('wrong');
      this.audio.playWobble();
      this.livesLeft--;
      this.streak = 0;
      this.hudStreakBadge.style.display = 'none';
      this.updateHeartsUI();

      if (this.livesLeft > 0) {
        this.feedbackText.textContent = `Oops! Not ${wrongVal.toLocaleString()}. Try again! (${this.livesLeft} ❤️ left)`;

        if (this.mistakeTimeout) clearTimeout(this.mistakeTimeout);
        this.mistakeTimeout = setTimeout(() => {
          cardEl.classList.remove('wrong');
          this.isLocked = false;
        }, 700);
      } else {
        // Out of lives: gently reveal correct answer
        this.audio.playReveal();
        this.feedbackText.textContent = `💡 The answer is ${targetVal.toLocaleString()}! Great effort! ✨`;
        this.eqTarget.textContent = targetVal.toLocaleString();
        this.eqTarget.style.borderColor = '#f59e0b';
        this.eqTarget.style.color = '#d97706';

        if (this.nextStepTimeout) clearTimeout(this.nextStepTimeout);
        this.nextStepTimeout = setTimeout(() => {
          this.startNewChain();
        }, 2200);
      }
    }

    handleSummitVictory() {
      this.audio.playSummitVictory();
      this.spawnConfetti();

      const best = this.saveBestScore();

      this.victoryScore.textContent = this.score.toLocaleString();
      this.victoryBestScore.textContent = best.toLocaleString();
      this.victoryLinksClimbed.textContent = `${this.totalLinks}/${this.totalLinks}`;
      this.victoryMaxStreak.textContent = this.maxStreak.toString();
      this.victoryLivesLeft.textContent = `${this.livesLeft}/${MAX_LIVES}`;

      this.victoryOverlay.style.display = 'flex';
    }

    // --- PARTICLE FX (Sparks & Confetti) ---
    spawnSparks(cardEl) {
      const rect = cardEl.getBoundingClientRect();
      const parentRect = this.fxOverlay.getBoundingClientRect();

      const cx = rect.left - parentRect.left + rect.width / 2;
      const cy = rect.top - parentRect.top + rect.height / 2;

      const colors = ['#06b6d4', '#38bdf8', '#f59e0b', '#10b981'];
      for (let i = 0; i < 10; i++) {
        const p = document.createElement('div');
        p.className = 'confetti-piece';
        p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        p.style.left = `${cx}px`;
        p.style.top = `${cy}px`;
        p.style.width = '6px';
        p.style.height = '6px';
        p.style.borderRadius = '50%';

        const angle = Math.random() * Math.PI * 2;
        const dist = 25 + Math.random() * 35;
        p.style.setProperty('--tx', `${Math.cos(angle) * dist}px`);
        p.style.setProperty('--ty', `${Math.sin(angle) * dist - 15}px`);

        this.fxOverlay.appendChild(p);
        setTimeout(() => p.remove(), 750);
      }
    }

    spawnConfetti() {
      const colors = ['#06b6d4', '#3b82f6', '#f59e0b', '#10b981', '#ec4899', '#fde047'];
      for (let i = 0; i < 36; i++) {
        const piece = document.createElement('div');
        piece.className = 'confetti-piece';
        piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        piece.style.left = `${10 + Math.random() * 80}%`;
        piece.style.top = `${25 + Math.random() * 35}%`;

        const angle = Math.random() * Math.PI * 2;
        const dist = 60 + Math.random() * 110;
        piece.style.setProperty('--tx', `${Math.cos(angle) * dist}px`);
        piece.style.setProperty('--ty', `${Math.sin(angle) * dist - 40}px`);

        this.fxOverlay.appendChild(piece);
        setTimeout(() => piece.remove(), 1200);
      }
    }
  }

  // Boot on DOM ready
  window.addEventListener('DOMContentLoaded', () => {
    window.gamilityMathChain = new MathChainGame();
  });

})();
