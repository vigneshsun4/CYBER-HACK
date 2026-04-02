// ============================================================
// GAME.JS - Main Game Loop, State Machine, Input Handling
// ============================================================

class Game {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.state = CONFIG.STATES.MENU;
        this.frames = 0;
        this.lastTime = performance.now();
        
        // Modules
        this.ui = new UI(canvas, ctx);
        this.camera = new Camera(canvas);
        this.hacking = new HackingSystem();
        
        // Entities
        this.player = null;
        this.level = null;
        this.enemies = { patrols: [], turrets: [] };
        this.boss = null;
        this.particles = [];
        
        this.keys = {};
        this.prevKeys = {};
        this.cheatTimer = 0;
        
        this._setupInput();
    }

    _setupInput() {
        window.addEventListener('keydown', e => {
            this.keys[e.code] = true;
            
            // Handle hacks during hacking state
            if (this.state === CONFIG.STATES.HACKING) {
                if (e.code.startsWith('Digit') || e.code.startsWith('Numpad')) {
                    if (window.sfx) window.sfx.playHackBeep();
                }
                if (e.code === 'Digit1' || e.code === 'Numpad1') this.hacking.selectOption(0);
                if (e.code === 'Digit2' || e.code === 'Numpad2') this.hacking.selectOption(1);
                if (e.code === 'Digit3' || e.code === 'Numpad3') this.hacking.selectOption(2);
                if (e.code === 'Digit4' || e.code === 'Numpad4') this.hacking.selectOption(3);
                if (e.code === 'Escape') this.resumePlaying();
            }
        });
        
        window.addEventListener('keyup', e => {
            this.keys[e.code] = false;
        });

        // Mouse for UI
        this.canvas.addEventListener('mousemove', e => {
            const rect = this.canvas.getBoundingClientRect();
            this.ui.trackMouse(e.clientX - rect.left, e.clientY - rect.top);
        });

        this.canvas.addEventListener('click', e => {
            if (this.state === CONFIG.STATES.MENU) {
                for (const btn of this.ui.menuButtons) {
                    if (this.ui._mouseInRect(btn.x, btn.y, btn.w, btn.h)) {
                        if (window.sfx) window.sfx.playUI();
                        if (btn.action === '▶ START INFILTRATION') {
                            this.state = CONFIG.STATES.INTRO;
                            this.frames = 0; // Reset for animation typing
                        }
                        else if (btn.action === '⎈ SYSTEM CONTROLS') this.state = CONFIG.STATES.CONTROLS;
                        else if (btn.action === 'ⓘ CREATORS LOG') this.state = CONFIG.STATES.CREDITS;
                    }
                }
            } else if (this.state === CONFIG.STATES.CONTROLS && this.ui.controlsBack) {
                if (this.ui._mouseInRect(this.ui.controlsBack.x, this.ui.controlsBack.y, this.ui.controlsBack.w, this.ui.controlsBack.h)) {
                    this.state = CONFIG.STATES.MENU;
                }
            } else if (this.state === CONFIG.STATES.CREDITS && this.ui.creditsBack) {
                if (this.ui._mouseInRect(this.ui.creditsBack.x, this.ui.creditsBack.y, this.ui.creditsBack.w, this.ui.creditsBack.h)) {
                    this.state = CONFIG.STATES.MENU;
                }
            }
        });
    }

    _isKeyPressed(code) {
        return this.keys[code] && !this.prevKeys[code];
    }

    startGame() {
        if (window.sfx) window.sfx.startMusic();
        this.level = buildLevel();
        this.player = new Player(this.level.spawn.x, this.level.spawn.y);
        const { patrols, turrets } = createEnemies(this.level.enemies);
        this.enemies.patrols = patrols;
        this.enemies.turrets = turrets;
        this.boss = new Boss(this.level.bossZone.x + this.level.bossZone.w/2 - 60, this.level.bossZone.y + 100);
        this.particles = [];
        this.camera.x = this.player.x - this.canvas.width/2;
        this.camera.y = this.player.y - this.canvas.height/2;
        this.frames = 0;
        this.state = CONFIG.STATES.PLAYING;
        this.ui.notifications = [];
        this.ui.notify('INFILTRATION STARTED', CONFIG.COLORS.GREEN_CIRCUIT);
    }

    resumePlaying() {
        this.state = CONFIG.STATES.PLAYING;
        this.hacking.active = false;
    }

    update() {
        this.frames++;

        if (this.state === CONFIG.STATES.MENU) {
            // DEVELOPER CHEAT: Hold '0' for 3 seconds to skip to Final Hack Terminal
            if (this.keys['Digit0'] || this.keys['Numpad0']) {
                this.cheatTimer++;
                if (this.cheatTimer >= 180) { // 3 seconds
                    this.cheatTimer = 0;
                    if (window.sfx) window.sfx.playUI();
                    
                    // Force start game
                    this.startGame();
                    
                    // Teleport right before last hack terminal (Tile ~104)
                    this.player.x = 104 * 40; 
                    this.player.y = 12 * 40;
                    this.player.quantumBoost = 600; 
                    
                    // Force camera to snap immediately rather than panning across the whole level
                    this.camera.x = this.player.x - this.canvas.width/2;
                    this.camera.y = this.player.y - this.canvas.height/2;
                    
                    this.ui.notifications = [];
                    this.ui.notify('DEV MODE: TELEPORTED TO TERMINAL 3', CONFIG.COLORS.NEON_PURPLE, 180);
                }
            } else {
                this.cheatTimer = 0;
            }
        } else if (this.state === CONFIG.STATES.PLAYING) {
            // Check Grapple
            if (this._isKeyPressed('KeyG')) {
                this.player.startGrapple(this.level.grappleBlocks);
            }

            // Check Hack
            if (this._isKeyPressed('KeyH')) {
                // Find nearby terminal
                for (const term of this.level.terminals) {
                    if (!term.hacked && dist(this.player.x, this.player.y, term.x, term.y) < 60) {
                        this.state = CONFIG.STATES.HACKING;
                        this.hacking.start(term);
                        this.keys = {}; // Clear keys
                        break;
                    }
                }
            }

            // Update Player
            this.player.update(this.keys, this.level.platforms, this.level.grappleBlocks, this.level.spikes, this.particles);
            this.camera.follow(this.player);

            // Update Level objects
            updateMovablePlatforms(this.level.platforms);

            // Check Chips
            for (const chip of this.level.chips) {
                if (!chip.collected && rectsOverlap(this.player, chip)) {
                    chip.collected = true;
                    if (window.sfx) window.sfx.playPickup();
                    this.player.chips++;
                    this.player.score += 50;
                    spawnParticles(this.particles, chip.x + chip.w/2, chip.y + chip.h/2, 5, CONFIG.COLORS.CHIP_GOLD);
                }
            }

            // Check Powerups
            for (const block of this.level.powerupBlocks) {
                // Claim powerup simply by overlapping it
                if (!block.used && rectsOverlap(this.player, block)) {
                     block.used = true;
                     if (window.sfx) window.sfx.playPowerup();
                     if (block.type === 'speed') {
                         this.player.quantumBoost = CONFIG.QUANTUM_BOOST_DURATION;
                         this.ui.notify('QUANTUM BOOST ACTIVATED', CONFIG.COLORS.POWERUP_SPEED);
                     } else if (block.type === 'shield') {
                         this.player.neuralShield = CONFIG.SHIELD_DURATION;
                         this.ui.notify('NEURAL NET SHIELD ACTIVATED', CONFIG.COLORS.POWERUP_SHIELD);
                     }
                     spawnParticles(this.particles, block.x + block.w/2, block.y + block.h/2, 15, 
                         block.type === 'speed' ? CONFIG.COLORS.POWERUP_SPEED : CONFIG.COLORS.POWERUP_SHIELD);
                }
            }

            // Enemies
            for (const e of this.enemies.patrols) {
                e.update(this.frames);
                // Simple player collision
                if (e.alive && rectsOverlap(this.player, e)) {
                    // Check stomp
                    if (this.player.vy > 0 && this.player.y + this.player.h < e.y + e.h / 2) {
                        e.alive = false;
                        this.player.vy = -6; // bounce
                        this.player.score += 100;
                        spawnParticles(this.particles, e.x + e.w/2, e.y + e.h/2, 8, CONFIG.COLORS.ENEMY_RED);
                    } else {
                        this.player.takeDamage(this.particles);
                    }
                }
            }

            for (const t of this.enemies.turrets) {
                t.update(this.player.x, this.player.y, this.frames);
                // Check projectiles against player
                for (const p of t.projectiles) {
                    if (rectsOverlap(this.player, p)) {
                        this.player.takeDamage(this.particles);
                        p.life = 0; // destroy projectile
                    }
                }
            }

            // Apply Hacks
            for (const term of this.level.terminals) {
                if (term.hacked) {
                    // Activate any movable platforms linked to this terminal
                    const targetPlat = this.level.platforms.find(p => p.terminalId === term.id && p.movable);
                    if (targetPlat && !targetPlat.moving && targetPlat.y === targetPlat.originalY) {
                        targetPlat.moving = true;
                        if (window.sfx) window.sfx.playDoorSlide();
                        this.ui.notify('BLAST DOORS OPENING...', CONFIG.COLORS.GREEN_CIRCUIT);
                    }
                    
                    // Activate any instant-remove gates linked to this terminal
                    const targetGate = this.level.platforms.find(p => p.terminalId === term.id && p.gate);
                    if (targetGate && !targetGate.removed) {
                         targetGate.removed = true;
                         targetGate.x = -1000; 
                         this.ui.notify('SECURITY GATE OPENED', CONFIG.COLORS.ELECTRIC_BLUE);
                    }
                }
            }

            // Death Check
            if (!this.player.alive) {
                this.state = CONFIG.STATES.DEATH;
                if (window.sfx) window.sfx.stopMusic();
            }

            // Boss Check
            if (this.player.x > this.level.bossZone.x && this.player.y > this.level.bossZone.y) {
                this.state = CONFIG.STATES.BOSS_TRANSITION;
                this.boss.active = true;
                if (window.sfx) window.sfx.playKlaxon();
                this.ui.notify('WARNING: AI OVERMIND DETECTED', CONFIG.COLORS.SPIKE, 180);
                this.camera.follow({x: this.boss.x, y: this.boss.y + 200}); // lock camera
            }

        } else if (this.state === CONFIG.STATES.INTRO) {
             // Intro Cutscene Input Logic
             if (this._isKeyPressed('Enter') || this._isKeyPressed('Space')) {
                 if (window.sfx) window.sfx.playUI();
                 this.startGame();
             }

        } else if (this.state === CONFIG.STATES.BOSS_TRANSITION) {
            // Cutscene mode
            // Camera pans to boss
            this.camera.x = lerp(this.camera.x, this.boss.x - this.canvas.width/2 + this.boss.w/2, 0.05);
            this.camera.y = lerp(this.camera.y, this.boss.y - this.canvas.height/2 + this.boss.h/2 + 100, 0.05);
            
            // Draw antigrav button on screen using UI or just check key
            if (this.frames % 60 === 0) {
                this.ui.notify('PRESS [ENTER] TO ACTIVATE ANTIGRAVITY', CONFIG.COLORS.ELECTRIC_BLUE, 50);
            }

            if (this._isKeyPressed('Enter')) {
                this.state = CONFIG.STATES.BOSS_FIGHT;
                this.player.antigravity = true;
                this.ui.notify('ANTIGRAVITY ENGAGED', CONFIG.COLORS.GREEN_CIRCUIT, 120);
                this.boss.startPhase1();
            }

        } else if (this.state === CONFIG.STATES.BOSS_FIGHT) {
            // Check Grapple (Grab missiles)
            if (this._isKeyPressed('KeyG')) {
                this.player.startGrapple([], this.boss.missiles);
            }

            // Update player
            this.player.update(this.keys, [], [], [], this.particles); // No platforms or spikes
            
            // Limit player inside boss area
            this.player.x = clamp(this.player.x, this.camera.x, this.camera.x + this.canvas.width - this.player.w);
            this.player.y = clamp(this.player.y, this.camera.y, this.camera.y + this.canvas.height - this.player.h);

            // Update boss
            this.boss.update(this.player, this.frames, this.camera, this.particles);

            // Check missile collision with boss (thrown or carried via ramming)
            for (let m of this.boss.missiles) {
                let hitBoss = false;
                
                if (!m.caught && m.vx !== 0 && m.vy === 0) { // Indicates thrown
                    if (rectsOverlap({x:m.x, y:m.y, w:20, h:20}, this.boss)) {
                        hitBoss = true;
                    }
                }
                
                if (m.caught && rectsOverlap(this.player, this.boss)) { // Ramming
                    hitBoss = true;
                    this.player.caughtMissile = null;
                    m.caught = false;
                }
                
                if (hitBoss) {
                    this.boss.takeDamage(this.particles);
                    m.life = 0; // destroy
                }
            }

            // Phase 4 Hacking check
            if (this.boss.phase === 4 && !this.hacking.active) {
                 if (this._isKeyPressed('KeyH')) {
                     this.state = CONFIG.STATES.HACKING;
                     this.hacking.maxTime = 480; // Faster
                     this.hacking.start(null); // No specific terminal
                     this.hacking.stagesNeeded = 5;
                     this.keys = {};
                 } else if (this.frames % 60 === 0) {
                     this.ui.notify('PRESS [H] TO HACK OVERMIND', CONFIG.COLORS.GREEN_CIRCUIT, 50);
                 }
            }

            // Death Check
            if (!this.player.alive) {
                this.state = CONFIG.STATES.DEATH;
                if (window.sfx) window.sfx.stopMusic();
            }

        } else if (this.state === CONFIG.STATES.HACKING) {
            this.hacking.update();
            if (!this.hacking.active) {
                if (this.boss.phase === 4) {
                    if (this.hacking.result === 'success') {
                        // VICTORY
                        this.boss.phase = 5; // dead
                        this.boss.active = false;
                        this.state = CONFIG.STATES.VICTORY;
                        if (window.sfx) window.sfx.stopMusic();
                        if (window.sfx) window.sfx.playHackSuccess();
                        this.ui.notify('SYSTEM PURGED. VICTORY!', CONFIG.COLORS.GREEN_CIRCUIT, 300);
                        for(let i=0; i<50; i++) spawnParticles(this.particles, this.boss.x + this.boss.w/2, this.boss.y + this.boss.h/2, 1, CONFIG.COLORS.NEON_PURPLE, {speed:10});
                    } else {
                        // Failed hack
                        this.state = CONFIG.STATES.BOSS_FIGHT;
                        if (window.sfx) window.sfx.playHackFail();
                        this.ui.notify('HACK FAILED. SECURITY INCREASED', CONFIG.COLORS.SPIKE, 120);
                        this.hacking.stagesNeeded++; // Penalty
                    }
                } else {
                    if (this.hacking.result === 'success') {
                        if (window.sfx) window.sfx.playHackSuccess();
                    } else if (this.hacking.result === 'failed') {
                        if (window.sfx) window.sfx.playHackFail();
                    }
                    this.resumePlaying();
                }
            }
        }

        // Particles
        this.particles.forEach(p => p.update());
        this.particles = this.particles.filter(p => !p.dead);

        // Handle Death reset
        if (this.state === CONFIG.STATES.DEATH && this._isKeyPressed('Enter')) {
            this.startGame();
        }

        // Capture prev keys last
        this.prevKeys = { ...this.keys };
    }

    draw() {
        if (this.state === CONFIG.STATES.MENU) {
            this.ui.drawMenu(this.frames);
        } else if (this.state === CONFIG.STATES.INTRO) {
            this.ui.drawIntroStory(this.frames);
        } else if (this.state === CONFIG.STATES.CONTROLS) {
            this.ui.drawControls(this.frames);
        } else if (this.state === CONFIG.STATES.CREDITS) {
            this.ui.drawCredits(this.frames);
        } else if (this.state === CONFIG.STATES.PLAYING || this.state === CONFIG.STATES.HACKING || this.state === CONFIG.STATES.DEATH || this.state === CONFIG.STATES.BOSS_TRANSITION || this.state === CONFIG.STATES.BOSS_FIGHT || this.state === CONFIG.STATES.VICTORY) {
            
            drawLevelBackground(this.ctx, this.camera, this.canvas, this.frames);
            
            if (this.state !== CONFIG.STATES.BOSS_FIGHT && this.state !== CONFIG.STATES.VICTORY) {
                drawPlatforms(this.ctx, this.camera, this.canvas, this.level.platforms, this.frames);
                drawSpikes(this.ctx, this.camera, this.canvas, this.level.spikes, this.frames);
                drawPowerupBlocks(this.ctx, this.camera, this.canvas, this.level.powerupBlocks, this.frames);
                drawTerminals(this.ctx, this.camera, this.canvas, this.level.terminals, this.frames);
                drawGrappleBlocks(this.ctx, this.camera, this.canvas, this.level.grappleBlocks, this.frames);
                drawChips(this.ctx, this.camera, this.canvas, this.level.chips, this.frames);
                
                for (const e of this.enemies.patrols) e.draw(this.ctx, this.camera, this.canvas, this.frames);
                for (const t of this.enemies.turrets) t.draw(this.ctx, this.camera, this.canvas, this.frames);
            }

            if (this.boss && (this.boss.active || this.boss.phase === 5)) {
                this.boss.draw(this.ctx, this.camera, this.frames);
            }
            
            this.particles.forEach(p => p.draw(this.ctx, this.camera));
            this.player.draw(this.ctx, this.camera, this.frames);
            
            this.ui.drawHUD(this.player);
            this.ui.drawNotifications(this.frames);

            if (this.state === CONFIG.STATES.HACKING) {
                this.hacking.draw(this.ctx, this.canvas);
            } else if (this.state === CONFIG.STATES.DEATH) {
                this.ui.drawDeath();
            } else if (this.state === CONFIG.STATES.VICTORY) {
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                this.ctx.fillStyle = CONFIG.COLORS.GREEN_CIRCUIT;
                this.ctx.font = 'bold 36px monospace';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('NETWORK SAVED', this.canvas.width/2, this.canvas.height/2);
            }
        }
    }

    loop() {
        requestAnimationFrame(() => this.loop());
        this.update();
        this.draw();
    }
}
