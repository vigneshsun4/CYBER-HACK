// ============================================================
// BOSS.JS - AI Overmind & 4-Phase Boss Fight Logic
// ============================================================

class Boss {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.w = 120; this.h = 120;
        this.startX = x; this.startY = y;
        this.active = false;
        this.phase = 0; // 0=Intro, 1=Missiles, 2=Trojans, 3=Minefield, 4=Hacking, 5=Dead
        this.health = 4; // Needs hits in phase 1 & 2
        this.timer = 0;
        
        // Phase 1 (Missiles)
        this.missileSalvo = 0; // 0=3, 1=5, 2=7
        
        // Phase 2 (Trojans)
        this.bugs = [];
        this.eyeGreenTimer = -1;
        this.p2Hits = 0;
        
        // Phase 3 (Mines & Lasers)
        this.mines = [];
        this.lasers = [];
        this.laserState = 0;
        
        // Boss Drawing state
        this.floatY = 0;
        this.hurtTimer = 0;
        this.tentacleAngles = [0, 0, 0, 0, 0, 0];
        
        // External objects
        this.missiles = [];
        this.projectiles = [];
    }

    startPhase1() {
        this.phase = 1;
        this.timer = 120; // Entry delay
        this.missileSalvo = 3;
    }

    startPhase2() {
        this.phase = 2;
        this.timer = 60;
        this.p2Hits = 0;
        this.eyeGreenTimer = 600; // 10 seconds initially
        this._spawnBugs();
    }

    startPhase3(cam) {
        this.phase = 3;
        this.timer = 60;
        this.laserState = 0;
        this._spawnMines(cam);
    }

    startPhase4() {
        this.phase = 4;
        this.timer = 0; // The game logic will trigger hacking system
    }

    takeDamage(particles) {
        if (this.hurtTimer > 0) return;
        this.hurtTimer = 60;
        spawnParticles(particles, this.x + this.w/2, this.y + this.h/2, 30, CONFIG.COLORS.ENEMY_RED, {speed: 8});
        
        if (this.phase === 1) {
            this.health--;
            if (this.health <= 0) {
                this.health = 2; // For phase 2
                this.startPhase2();
            }
        } else if (this.phase === 2 && this.eyeGreenTimer > 0 && this.eyeGreenTimer < 180) { // Eye is green
            this.p2Hits++;
            // Explode bugs
            for (let b of this.bugs) spawnParticles(particles, b.x, b.y, 10, CONFIG.COLORS.GREEN_CIRCUIT);
            this.bugs = [];
            
            if (this.p2Hits >= 2) {
                this.startPhase3({x: this.x - 400, y: this.y - 400}); // Approximation
            } else {
                this.timer = 180; // Disoriented
                this.eyeGreenTimer = -1; // Reset
            }
        }
    }

    update(player, gameFrames, cam, particles) {
        if (!this.active) return;
        
        // Floating movement
        this.floatY = Math.sin(gameFrames * 0.05) * 20;
        if (this.hurtTimer > 0) {
            this.hurtTimer--;
            this.x = this.startX + (Math.random() - 0.5) * 10; // Shake
        } else {
            this.x = this.startX;
        }

        // --- Phase 1: Missile Assault ---
        if (this.phase === 1) {
            if (this.timer > 0) this.timer--;
            if (this.timer <= 0) {
                this._fireSalvo(player);
                if (this.missileSalvo === 3) { this.missileSalvo = 5; this.timer = 240; }
                else if (this.missileSalvo === 5) { this.missileSalvo = 7; this.timer = 240; }
                else { this.missileSalvo = 3; this.timer = 300; }
            }
            this._updateMissiles(player, particles);
        }

        // --- Phase 2: Trojan Mode ---
        else if (this.phase === 2) {
            if (this.timer > 0) {
                this.timer--; // Disoriented recovery
                if (this.timer <= 0) {
                    this._spawnBugs();
                    this.eyeGreenTimer = 600;
                }
            } else {
                this.eyeGreenTimer--;
                if (this.eyeGreenTimer === 0) {
                    this.eyeGreenTimer = 600; // Reset cycle
                }
                this._updateBugs(player, cam, particles);
            }
        }

        // --- Phase 3: Minefield & Lasers ---
        else if (this.phase === 3) {
            if (this.timer > 0) this.timer--;
            if (this.timer <= 0) {
                this._processLasers(cam, gameFrames);
            }
            // Update mines float
            for (let m of this.mines) {
                m.y += Math.sin(gameFrames * 0.1 + m.x) * 1;
                // Collision with player
                const d = dist(player.x + player.w/2, player.y + player.h/2, m.x, m.y);
                if (d < 25) {
                    player.takeDamage(particles);
                    m.dead = true;
                    spawnParticles(particles, m.x, m.y, 15, CONFIG.COLORS.ENEMY_RED);
                }
            }
            this.mines = this.mines.filter(m => !m.dead);
        }

        // --- Clean up global projectiles ---
        for (let p of this.projectiles) {
            p.x += p.vx; p.y += p.vy; p.life--;
        }
        this.projectiles = this.projectiles.filter(p => !p.dead && p.life > 0);
    }

    _fireSalvo(player) {
        const count = this.missileSalvo;
        const spacing = 180 / (count + 1);
        for (let i = 0; i < count; i++) {
            const angle = (180 + spacing * (i + 1)) * Math.PI / 180; // Arc from bottom left to bottom right (if facing down)
            const isGrappleable = (count === 7 && i === 3); // Middle missile in last salvo
            this.missiles.push({
                x: this.x + this.w/2,
                y: this.y + this.h,
                vx: Math.cos(angle) * 3,
                vy: Math.sin(angle) * 3,
                grappleable: isGrappleable,
                life: 300,
                angle: angle,
                caught: false
            });
        }
    }

    _updateMissiles(player, particles) {
        const cx = player.x + player.w/2, cy = player.y + player.h/2;
        for (let m of this.missiles) {
            if (m.caught) continue; // Managed by player grapple
            
            // Heat seeking logic with low turn radius
            const dx = cx - m.x, dy = cy - m.y;
            const targetAngle = Math.atan2(dy, dx);
            let angleDiff = targetAngle - m.angle;
            
            // Normalize
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            
            m.angle += Math.sign(angleDiff) * 0.025; // Slow turn
            const speed = m.grappleable ? 3.5 : 5;
            m.vx = Math.cos(m.angle) * speed;
            m.vy = Math.sin(m.angle) * speed;
            
            m.x += m.vx; m.y += m.vy; m.life--;
            
            // Particles
            if (Math.random() < 0.5) {
                particles.push(new Particle(m.x - m.vx*2, m.y - m.vy*2, 0, 0, 2, CONFIG.COLORS.PROJECTILE, 0.5));
            }
            
            // Collision with player
            if (dist(cx, cy, m.x, m.y) < 20) {
                player.takeDamage(particles);
                m.life = 0;
                spawnParticles(particles, m.x, m.y, 15, CONFIG.COLORS.PROJECTILE);
            }
        }
        this.missiles = this.missiles.filter(m => m.life > 0 || m.caught);
    }

    _spawnBugs() {
        this.bugs = [];
        for (let i = 0; i < 8; i++) {
            this.bugs.push({
                x: this.x + this.w/2, y: this.y + this.h/2,
                tx: this.x + (Math.random()-0.5) * 800,
                ty: this.y + (Math.random()-0.5) * 600,
                shootTimer: Math.random() * 120 + 60
            });
        }
    }

    _updateBugs(player, cam, particles) {
        for (let b of this.bugs) {
            // Drift
            if (Math.random() < 0.02) {
                b.tx = cam.x + Math.random() * 800;
                b.ty = cam.y + Math.random() * 600;
            }
            b.x = lerp(b.x, b.tx, 0.05);
            b.y = lerp(b.y, b.ty, 0.05);
            
            // Body collision
            if (dist(player.x + player.w/2, player.y + player.h/2, b.x, b.y) < 20) {
                player.takeDamage(particles);
            }
            
            // Shoot
            b.shootTimer--;
            if (b.shootTimer <= 0) {
                b.shootTimer = 180 + Math.random() * 120;
                const angle = Math.atan2((player.y+player.h/2) - b.y, (player.x+player.w/2) - b.x);
                this.projectiles.push({
                    x: b.x, y: b.y,
                    vx: Math.cos(angle) * 3, vy: Math.sin(angle) * 3,
                    w:8, h:8, life: 300
                });
            }
        }
    }

    _spawnMines(cam) {
        this.mines = [];
        for (let i = 0; i < 20; i++) {
            this.mines.push({
                x: cam.x + 100 + Math.random() * 600,
                y: cam.y + 100 + Math.random() * 400,
            });
        }
    }

    _processLasers(cam, frames) {
        // We will sequence 3 patterns
        if (this.laserState === 0) {
            // Pattern 1: top and bottom lasers, middle safe
            this.lasers = [
                { type: 'h', y: cam.y + 100, active: true },
                { type: 'h', y: cam.y + 500, active: true }
            ];
            this.laserState++; this.timer = 300;
        } else if (this.laserState === 1 && this.timer <= 0) {
            // Pattern 2: Vertical sweep
            this.lasers = [
                { type: 'v', x: cam.x + 100, sweepDir: 1, active: true }
            ];
            this.laserState++; this.timer = 400;
        } else if (this.laserState === 2 && this.timer <= 0) {
            // Pattern 3: Two vertical moving together
            this.lasers = [
                { type: 'v', x: cam.x + 200, sweepDir: 0.5, active: true },
                { type: 'v', x: cam.x + 600, sweepDir: -0.5, active: true }
            ];
            this.laserState++; this.timer = 400;
        } else if (this.laserState === 3 && this.timer <= 0) {
            // End phase
            this.lasers = [];
            this.mines = [];
            this.startPhase4();
        }
        
        // Update laser positions
        for (let L of this.lasers) {
            if (L.sweepDir) L.x += L.sweepDir;
        }
    }

    draw(ctx, cam, frames) {
        if (!this.active && this.phase === 0) return;
        
        const sx = this.x - cam.x;
        const sy = this.y + this.floatY - cam.y;

        ctx.save();
        
        // Draw Tentacles (3 left, 3 right)
        ctx.strokeStyle = '#2a1a4a';
        ctx.lineWidth = 12;
        for (let i = 0; i < 6; i++) {
            ctx.beginPath();
            const side = i < 3 ? -1 : 1;
            const rootX = sx + this.w/2 + side * 40;
            const rootY = sy + this.h/2 + (i%3)*20 - 20;
            const wave = Math.sin(frames * 0.05 + i * 1.5) * 30;
            ctx.moveTo(rootX, rootY);
            // Bezier curve
            ctx.quadraticCurveTo(rootX + side*50, rootY - 40 + wave, rootX + side*100, rootY + wave);
            ctx.stroke();
            // Draw claws
            ctx.fillStyle = '#666';
            ctx.beginPath(); ctx.arc(rootX + side*100, rootY + wave, 8, 0, Math.PI*2); ctx.fill();
        }
        
        // Main Body Glow
        ctx.shadowColor = this.hurtTimer > 0 ? CONFIG.COLORS.ENEMY_RED : CONFIG.COLORS.NEON_PURPLE;
        ctx.shadowBlur = 30 + Math.sin(frames*0.1)*10;
        
        // Body Box
        ctx.fillStyle = '#100820';
        ctx.beginPath();
        ctx.roundRect(sx, sy, this.w, this.h, 20);
        ctx.fill();
        
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#1a1030';
        ctx.beginPath();
        ctx.roundRect(sx + 10, sy + 10, this.w - 20, this.h - 20, 15);
        ctx.fill();

        // Eye Center
        const isEyeGreen = (this.phase === 2 && this.eyeGreenTimer > 0 && this.eyeGreenTimer < 180);
        const eyeColor = isEyeGreen ? CONFIG.COLORS.GREEN_CIRCUIT : CONFIG.COLORS.ENEMY_RED;
        ctx.fillStyle = eyeColor;
        ctx.shadowColor = eyeColor;
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(sx + this.w/2, sy + this.h/2, 25, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(sx + this.w/2, sy + this.h/2, 10, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(sx + this.w/2, sy + this.h/2, 5, 0, Math.PI*2);
        ctx.fill();

        // Draw HUD overlay if hacking phase
        if (this.phase === 4) {
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
            ctx.fillRect(sx-50, sy-50, this.w+100, this.h+100);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 20px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('IN VULNERABLE SECURE SHELL', sx + this.w/2, sy - 20);
        }

        ctx.restore();

        // --- Draw Items ---
        
        // Missiles (Phase 1)
        for (let m of this.missiles) {
            const mx = m.x - cam.x, my = m.y - cam.y;
            ctx.save();
            ctx.translate(mx, my);
            ctx.rotate(m.angle);
            ctx.fillStyle = '#555';
            ctx.fillRect(-12, -4, 24, 8);
            ctx.fillStyle = m.grappleable ? CONFIG.COLORS.GRAPPLE_BLOCK : CONFIG.COLORS.ENEMY_RED;
            ctx.fillRect(8, -3, 6, 6);
            if (m.grappleable) {
                ctx.strokeStyle = CONFIG.COLORS.NEON_PURPLE;
                ctx.lineWidth = 2;
                ctx.strokeRect(-14, -6, 28, 12);
            }
            // Thruster
            ctx.fillStyle = CONFIG.COLORS.PROJECTILE;
            ctx.beginPath(); ctx.arc(-14, 0, 4, 0, Math.PI*2); ctx.fill();
            ctx.restore();
        }

        // Bugs (Phase 2)
        for (let b of this.bugs) {
            const bx = b.x - cam.x, by = b.y - cam.y;
            ctx.save();
            ctx.fillStyle = '#333';
            ctx.beginPath(); ctx.arc(bx, by, 10, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = CONFIG.COLORS.CHIP_GOLD;
            ctx.beginPath(); ctx.arc(bx, by, 4, 0, Math.PI*2); ctx.fill();
            // Legs
            ctx.strokeStyle = '#555'; ctx.lineWidth = 2;
            for(let i=0; i<4; i++) {
                ctx.beginPath();
                ctx.moveTo(bx, by);
                ctx.lineTo(bx + Math.cos(i*Math.PI/2 + frames*0.2)*15, by + Math.sin(i*Math.PI/2 + frames*0.2)*15);
                ctx.stroke();
            }
            ctx.restore();
        }

        // Projectiles
        for (let p of this.projectiles) {
            ctx.fillStyle = CONFIG.COLORS.PROJECTILE;
            ctx.beginPath(); ctx.arc(p.x - cam.x, p.y - cam.y, p.w/2, 0, Math.PI*2); ctx.fill();
        }

        // Mines (Phase 3)
        for (let m of this.mines) {
            const mx = m.x - cam.x, my = m.y - cam.y;
            ctx.save();
            ctx.shadowColor = CONFIG.COLORS.SPIKE;
            ctx.shadowBlur = 10;
            ctx.fillStyle = '#222';
            ctx.beginPath(); ctx.arc(mx, my, 12, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = CONFIG.COLORS.SPIKE;
            ctx.beginPath(); ctx.arc(mx, my, 6, 0, Math.PI*2); ctx.fill();
            ctx.restore();
        }

        // Lasers (Phase 3)
        ctx.save();
        ctx.shadowColor = CONFIG.COLORS.ENEMY_RED;
        ctx.shadowBlur = 15;
        ctx.strokeStyle = `rgba(255, 50, 50, ${0.8 + Math.sin(frames*0.3)*0.2})`;
        ctx.lineWidth = 10;
        for (let L of this.lasers) {
            ctx.beginPath();
            if (L.type === 'h') {
                ctx.moveTo(0, L.y - cam.y);
                ctx.lineTo(8000, L.y - cam.y);
            } else {
                ctx.moveTo(L.x - cam.x, 0);
                ctx.lineTo(L.x - cam.x, 8000);
            }
            ctx.stroke();
            // Draw pure white core
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 4;
            ctx.stroke();
        }
        ctx.restore();
    }
}
