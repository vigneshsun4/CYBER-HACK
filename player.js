// ============================================================
// PLAYER.JS - Player Class with Full Movement Mechanics
// Movement, Variable Jump, Wall Slide/Jump, Grapple
// ============================================================

class Player {
    constructor(x, y) {
        this.w = 28; this.h = 38;
        this.x = x || 120; this.y = y || 500;
        this.vx = 0; this.vy = 0;
        this.speed = CONFIG.PLAYER_SPEED;
        this.facing = 1; // 1 = right, -1 = left
        // Jump
        this.grounded = false;
        this.jumpHoldTimer = 0;
        this.jumpPressed = false;
        this.coyoteTimer = 0;   // allow jump shortly after leaving edge
        this.jumpBufferTimer = 0;
        // Wall
        this.wallDir = 0;       // -1 left wall, 1 right wall, 0 none
        this.wallSliding = false;
        this.wallJumpTimer = 0; // frames of reduced control after wall jump
        // Grapple / Hacking / Boss
        this.grappling = false;
        this.grappleTarget = null;
        this.grappleHookX = 0;
        this.grappleHookY = 0;
        this.grappleLaunched = false;
        this.grappleCooldown = 0;
        this.antigravity = false;
        this.caughtMissile = null;
        // Powerups
        this.quantumBoost = 0;
        this.neuralShield = 0;
        // State
        this.alive = true;
        this.health = 3;
        this.invincibleTimer = 0;
        this.score = 0;
        this.chips = 0;
        this.animFrame = 0;
        this.animTimer = 0;
    }

    update(keys, platforms, grappleBlocks, spikes, particles) {
        if (!this.alive) return;

        // --- Antigravity Mode (Boss Fight) ---
        if (this.antigravity) {
            this._updateAntigravity(keys, particles);
            // Animation
            this.animTimer++;
            if (this.animTimer > 6) { this.animTimer = 0; this.animFrame = (this.animFrame + 1) % 4; }
            return;
        }

        // --- Timers ---
        if (this.invincibleTimer > 0) this.invincibleTimer--;
        if (this.quantumBoost > 0) this.quantumBoost--;
        if (this.neuralShield > 0) this.neuralShield--;
        if (this.wallJumpTimer > 0) this.wallJumpTimer--;
        if (this.grappleCooldown > 0) this.grappleCooldown--;
        if (this.coyoteTimer > 0) this.coyoteTimer--;
        if (this.jumpBufferTimer > 0) this.jumpBufferTimer--;

        const spd = this.quantumBoost > 0 ? CONFIG.QUANTUM_BOOST_SPEED : this.speed;

        // --- Grapple ---
        if (this.grappling && this.grappleTarget) {
            this._updateGrapple(particles);
            return; // skip normal movement while grappling
        }

        // --- Horizontal Movement (Fully Controllable Air/Ground) ---
        if (this.wallJumpTimer <= 0) {
            if (keys.ArrowLeft || keys.KeyA) {
                this.vx = -spd; this.facing = -1;
            } else if (keys.ArrowRight || keys.KeyD) {
                this.vx = spd; this.facing = 1;
            } else {
                this.vx *= this.grounded ? 0.7 : 0.9; // friction (less in air)
                if (Math.abs(this.vx) < 0.3) this.vx = 0;
            }
        } else {
            this.vx *= 0.95; // reduced control during wall jump arc
        }

        // --- Gravity ---
        this.vy += CONFIG.GRAVITY;
        if (this.vy > CONFIG.MAX_FALL_SPEED) this.vy = CONFIG.MAX_FALL_SPEED;

        // --- Fixed Jump ---
        const jumpKey = keys.Space || keys.ArrowUp || keys.KeyW;
        if (jumpKey && !this.jumpPressed) {
            this.jumpBufferTimer = 6; // buffer input
        }
        this.jumpPressed = jumpKey;

        // Execute jump (coyote + buffer)
        if (this.jumpBufferTimer > 0 && (this.grounded || this.coyoteTimer > 0)) {
            this.vy = CONFIG.JUMP_FORCE;
            this.grounded = false;
            this.coyoteTimer = 0;
            this.jumpBufferTimer = 0;
            if (window.sfx) window.sfx.playJump();
            spawnParticles(particles, this.x + this.w/2, this.y + this.h, 6,
                CONFIG.COLORS.ELECTRIC_BLUE, { speed: 2, size: 2 });
        }

        // --- Wall Slide ---
        this.wallDir = 0;
        this.wallSliding = false;
        if (!this.grounded) {
            for (const p of platforms) {
                // Check left wall
                if (this.x <= p.x + p.w && this.x + this.w > p.x + p.w &&
                    this.y + this.h > p.y + 4 && this.y < p.y + p.h - 4) {
                    if (keys.ArrowLeft || keys.KeyA) { this.wallDir = -1; break; }
                }
                // Check right wall
                if (this.x + this.w >= p.x && this.x < p.x &&
                    this.y + this.h > p.y + 4 && this.y < p.y + p.h - 4) {
                    if (keys.ArrowRight || keys.KeyD) { this.wallDir = 1; break; }
                }
            }
            if (this.wallDir !== 0 && this.vy > 0) {
                this.wallSliding = true;
                this.vy = Math.min(this.vy, CONFIG.WALL_SLIDE_SPEED);
                this.coyoteTimer = 0;
            }
        }

        // --- Wall Jump ---
        if (this.wallSliding && this.jumpBufferTimer > 0) {
            this.vx = -this.wallDir * CONFIG.WALL_JUMP_FORCE_X;
            this.vy = CONFIG.WALL_JUMP_FORCE_Y;
            this.facing = -this.wallDir;
            this.wallJumpTimer = CONFIG.WALL_JUMP_CONTROL_DELAY;
            this.wallSliding = false;
            this.jumpBufferTimer = 0;
            if (window.sfx) window.sfx.playJump();
            spawnParticles(particles, this.x + (this.wallDir < 0 ? 0 : this.w),
                this.y + this.h/2, 8, CONFIG.COLORS.NEON_PURPLE, { speed: 3 });
        }

        // --- Apply velocity ---
        this.x += this.vx;
        this.y += this.vy;

        // --- Platform Collisions ---
        this.grounded = false;
        for (const p of platforms) {
            if (!rectsOverlap({x:this.x, y:this.y, w:this.w, h:this.h},
                              {x:p.x, y:p.y, w:p.w, h:p.h})) continue;

            const overlapLeft = (this.x + this.w) - p.x;
            const overlapRight = (p.x + p.w) - this.x;
            const overlapTop = (this.y + this.h) - p.y;
            const overlapBottom = (p.y + p.h) - this.y;
            const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

            if (minOverlap === overlapTop && this.vy >= 0) {
                if (this.vy > 10 && window.sfx) window.sfx.playLand();
                this.y = p.y - this.h;
                this.vy = 0; this.grounded = true;
                this.coyoteTimer = 6;
            } else if (minOverlap === overlapBottom && this.vy < 0) {
                this.y = p.y + p.h; this.vy = 0;
                // Check if hit powerup block from below
                if (p.onBump) p.onBump();
            } else if (minOverlap === overlapLeft) {
                this.x = p.x - this.w; this.vx = 0;
            } else if (minOverlap === overlapRight) {
                this.x = p.x + p.w; this.vx = 0;
            }
        }

        // --- Spike Collision ---
        if (this.invincibleTimer <= 0 && this.neuralShield <= 0) {
            for (const s of spikes) {
                if (rectsOverlap({x:this.x+4, y:this.y+4, w:this.w-8, h:this.h-8},
                                 {x:s.x, y:s.y, w:s.w, h:s.h})) {
                    this.takeDamage(particles);
                    break;
                }
            }
        }

        // --- World boundaries ---
        if (this.x < 0) { this.x = 0; this.vx = 0; }
        if (this.x + this.w > CONFIG.LEVEL_WIDTH) { this.x = CONFIG.LEVEL_WIDTH - this.w; }
        if (this.y > CONFIG.LEVEL_HEIGHT + 200) this.die(particles);

        // Animation
        this.animTimer++;
        if (this.animTimer > 6) { this.animTimer = 0; this.animFrame = (this.animFrame + 1) % 4; }
    }

    _updateGrapple(particles) {
        const t = this.grappleTarget;
        const tx = t.x + t.w/2, ty = t.y + t.h/2;

        if (!this.grappleLaunched) {
            // Extend hook toward target
            const dx = tx - this.grappleHookX, dy = ty - this.grappleHookY;
            const d = Math.sqrt(dx*dx + dy*dy);
            if (d < CONFIG.GRAPPLE_HOOK_SPEED) {
                this.grappleHookX = tx; this.grappleHookY = ty;
                this.grappleLaunched = true;
            } else {
                this.grappleHookX += (dx/d) * CONFIG.GRAPPLE_HOOK_SPEED;
                this.grappleHookY += (dy/d) * CONFIG.GRAPPLE_HOOK_SPEED;
            }
            return;
        }

        // Pull player toward target
        const dx = tx - (this.x + this.w/2);
        const dy = ty - (this.y + this.h/2);
        const d = Math.sqrt(dx*dx + dy*dy);

        if (d < 20) {
            // Arrived — release with momentum
            this.grappling = false;
            this.grappleTarget = null;
            this.vy = -8; // upward boost
            this.vx = this.facing * 5;
            this.grappleCooldown = 15;
            spawnParticles(particles, this.x + this.w/2, this.y, 10,
                CONFIG.COLORS.NEON_PURPLE, { speed: 4 });
        } else {
            this.vx = (dx/d) * CONFIG.GRAPPLE_SPEED;
            this.vy = (dy/d) * CONFIG.GRAPPLE_SPEED;
            this.x += this.vx;
            this.y += this.vy;
        }

        // Particles along grapple line
        if (Math.random() < 0.3) {
            particles.push(new Particle(
                this.x + this.w/2 + (Math.random()-0.5)*6,
                this.y + (Math.random()-0.5)*6,
                0, 0, 2, CONFIG.COLORS.GRAPPLE_LINE, 0.6
            ));
        }
    }

    // --- Antigravity Movement & Logic ---
    _updateAntigravity(keys, particles) {
        // Free X/Y Movement (Jetpack Joyride style)
        if (keys.ArrowLeft || keys.KeyA) {
            this.vx -= CONFIG.ANTIGRAVITY_ACCEL;
            this.facing = -1;
        } else if (keys.ArrowRight || keys.KeyD) {
            this.vx += CONFIG.ANTIGRAVITY_ACCEL;
            this.facing = 1;
        }
        
        if (keys.ArrowUp || keys.KeyW || keys.Space) {
            this.vy -= CONFIG.ANTIGRAVITY_ACCEL;
            // Thruster particles
            if (Math.random() < 0.5) {
                spawnParticles(particles, this.x + this.w/2, this.y + this.h, 2, CONFIG.COLORS.ELECTRIC_BLUE, {speed: 1});
            }
        } else if (keys.ArrowDown || keys.KeyS) {
            this.vy += CONFIG.ANTIGRAVITY_ACCEL;
        }
        
        // Friction / Drag
        this.vx *= CONFIG.ANTIGRAVITY_FRICTION;
        this.vy *= CONFIG.ANTIGRAVITY_FRICTION;
        
        // Speed Limits
        this.vx = clamp(this.vx, -CONFIG.ANTIGRAVITY_SPEED, CONFIG.ANTIGRAVITY_SPEED);
        this.vy = clamp(this.vy, -CONFIG.ANTIGRAVITY_SPEED, CONFIG.ANTIGRAVITY_SPEED);
        
        this.x += this.vx;
        this.y += this.vy;

        // Caught missile logic
        if (this.caughtMissile) {
            this.caughtMissile.x = this.x + this.w/2;
            this.caughtMissile.y = this.y - 10;
        }
    }

    startGrapple(grappleBlocks, bossMissiles = []) {
        if (this.grappling || this.grappleCooldown > 0) return;
        
        // Throw caught missile if we have one
        if (this.caughtMissile) {
            this.caughtMissile.vx = this.facing * CONFIG.MISSILE_THROW_SPEED;
            this.caughtMissile.vy = 0;
            this.caughtMissile.caught = false; // Release
            this.caughtMissile = null;
            return;
        }

        // Check Boss Missiles (Phase 1)
        for (const m of bossMissiles) {
            if (m.grappleable && !m.caught && dist(this.x + this.w/2, this.y + this.h/2, m.x, m.y) < CONFIG.GRAPPLE_RANGE) {
                m.caught = true;
                this.caughtMissile = m;
                return;
            }
        }

        // Normal Grapple
        let best = null, bestDist = CONFIG.GRAPPLE_RANGE;
        const cx = this.x + this.w/2, cy = this.y + this.h/2;
        for (const b of grappleBlocks) {
            const d = dist(cx, cy, b.x + b.w/2, b.y + b.h/2);
            if (d < bestDist) { bestDist = d; best = b; }
        }
        if (best) {
            this.grappling = true;
            this.grappleTarget = best;
            this.grappleHookX = cx;
            this.grappleHookY = cy;
            this.grappleLaunched = false;
            this.vy = 0;
            if (window.sfx) window.sfx.playGrapple();
        }
    }

    takeDamage(particles) {
        if (this.invincibleTimer > 0 || this.neuralShield > 0) return;
        this.health--;
        this.invincibleTimer = 90;
        if (window.sfx) window.sfx.playHurt();
        spawnParticles(particles, this.x + this.w/2, this.y + this.h/2, 12,
            CONFIG.COLORS.SPIKE, { speed: 4 });
        if (this.health <= 0) this.die(particles);
    }

    die(particles) {
        this.alive = false;
        spawnParticles(particles, this.x + this.w/2, this.y + this.h/2, 20,
            CONFIG.COLORS.ELECTRIC_BLUE, { speed: 5, size: 4 });
    }

    draw(ctx, cam, frames) {
        if (!this.alive) return;
        // Blink when invincible
        if (this.invincibleTimer > 0 && Math.floor(this.invincibleTimer / 4) % 2) return;

        const sx = this.x - cam.x, sy = this.y - cam.y;
        ctx.save();
        ctx.translate(sx, sy);

        // Flip if facing left
        if (this.facing === -1) {
            ctx.translate(this.w, 0);
            ctx.scale(-1, 1);
        }

        const u = this.w / 14, v = this.h / 19;

        if (this.antigravity) {
            // --- Draw Spacesuit Sprite ---
            // Helmet back
            ctx.fillStyle = '#443366';
            ctx.beginPath(); ctx.arc(7*u, 5*v, 6*u, 0, Math.PI*2); ctx.fill();
            // Visor (Gold)
            ctx.fillStyle = CONFIG.COLORS.CHIP_GOLD;
            ctx.beginPath();
            ctx.ellipse(9*u, 5*v, 4*u, 5*v, Math.PI/8, 0, Math.PI*2);
            ctx.fill();
            // Suit Body
            ctx.fillStyle = '#443366';
            ctx.fillRect(3*u, 9*v, 8*u, 6*v);
            // Chestplate
            ctx.fillStyle = '#665588';
            ctx.fillRect(4*u, 10*v, 6*u, 3*v);
            // Thruster backpack
            ctx.fillStyle = '#222';
            ctx.fillRect(0, 8*v, 4*u, 6*v);
            ctx.fillStyle = CONFIG.COLORS.ELECTRIC_BLUE;
            ctx.fillRect(1*u, 12*v, 2*u, 4*v);
            // Legs (floating pose)
            ctx.fillStyle = '#443366';
            ctx.fillRect(4*u, 15*v, 3*u, 4*v);
            ctx.fillRect(8*u, 14*v, 4*u, 3*v); // kicked back
            // Boots
            ctx.fillStyle = '#221133';
            ctx.fillRect(4*u, 18*v, 4*u, 2*v);
            ctx.fillRect(10*u, 16*v, 2*u, 3*v);
            // Arms
            ctx.fillStyle = '#443366';
            ctx.fillRect(5*u, 10*v, 6*u, 2*v);
            
            // Draw caught missile above head if holding
            if (this.caughtMissile) {
                // Missile is handled in the object loop mostly, but we can draw a tether
                ctx.strokeStyle = CONFIG.COLORS.NEON_PURPLE;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(this.w/2, 0);
                ctx.lineTo(this.w/2, -10);
                ctx.stroke();
            }

        } else {
            // --- Draw Cyber Defender ---
            // Visor/helmet
            ctx.fillStyle = '#2a2050';
            ctx.fillRect(2*u, 0, 10*u, 5*v);
            // Visor glow
            ctx.fillStyle = CONFIG.COLORS.ELECTRIC_BLUE;
            ctx.fillRect(4*u, 2*v, 8*u, 2*v);
            ctx.fillStyle = 'rgba(0,212,255,0.5)';
            ctx.fillRect(3*u, 1*v, 9*u, 1*v);

            // Face
            ctx.fillStyle = '#ddb892';
            ctx.fillRect(3*u, 4*v, 8*u, 3*v);

            // Body (dark suit)
            ctx.fillStyle = '#1a1040';
            ctx.fillRect(1*u, 7*v, 12*u, 6*v);
            // Chest circuit lines
            ctx.fillStyle = CONFIG.COLORS.GREEN_CIRCUIT;
            ctx.globalAlpha = 0.6 + Math.sin(frames * 0.1) * 0.3;
            ctx.fillRect(5*u, 8*v, 1*u, 4*v);
            ctx.fillRect(8*u, 8*v, 1*u, 4*v);
            ctx.fillRect(5*u, 10*v, 4*u, 1*v);
            ctx.globalAlpha = 1;

            // Arms
            ctx.fillStyle = '#1a1040';
            ctx.fillRect(0, 8*v, 2*u, 4*v);
            ctx.fillRect(12*u, 8*v, 2*u, 4*v);
            // Gloves
            ctx.fillStyle = CONFIG.COLORS.ELECTRIC_BLUE;
            ctx.fillRect(0, 11*v, 2*u, 2*v);
            ctx.fillRect(12*u, 11*v, 2*u, 2*v);

            // Legs
            ctx.fillStyle = '#151035';
            const stride = this.grounded && Math.abs(this.vx) > 0.5
                ? Math.sin(frames * 0.25) * 2 : 0;
            ctx.fillRect((3 - stride)*u, 13*v, 4*u, 5*v);
            ctx.fillRect((7 + stride)*u, 13*v, 4*u, 5*v);
            // Boots
            ctx.fillStyle = '#0d0825';
            ctx.fillRect((2 - stride)*u, 17*v, 5*u, 2*v);
            ctx.fillRect((7 + stride)*u, 17*v, 5*u, 2*v);
        }

        // Shield effect
        if (this.neuralShield > 0) {
            ctx.strokeStyle = CONFIG.COLORS.NEON_PURPLE;
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.3 + Math.sin(frames * 0.15) * 0.2;
            ctx.beginPath();
            ctx.ellipse(this.w/2, this.h/2, this.w * 0.8, this.h * 0.7, 0, 0, Math.PI*2);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        // Speed trail
        if (this.quantumBoost > 0) {
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = CONFIG.COLORS.GREEN_CIRCUIT;
            ctx.fillRect(-5, this.h * 0.3, 5, this.h * 0.4);
            ctx.globalAlpha = 1;
        }

        ctx.restore();

        // --- Grapple Line ---
        if (this.grappling) {
            ctx.save();
            ctx.strokeStyle = CONFIG.COLORS.GRAPPLE_LINE;
            ctx.lineWidth = 2;
            ctx.shadowColor = CONFIG.COLORS.GRAPPLE_LINE;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.moveTo(sx + this.w/2, sy + this.h * 0.3);
            ctx.lineTo(this.grappleHookX - cam.x, this.grappleHookY - cam.y);
            ctx.stroke();
            // Hook dot
            ctx.fillStyle = CONFIG.COLORS.NEON_PURPLE;
            ctx.beginPath();
            ctx.arc(this.grappleHookX - cam.x, this.grappleHookY - cam.y, 4, 0, Math.PI*2);
            ctx.fill();
            ctx.restore();
        }
    }
}
