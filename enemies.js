// ============================================================
// ENEMIES.JS - Patrol Bots & Firewall Turrets
// ============================================================

class PatrolBot {
    constructor(x, y, patrolWidth) {
        this.x = x; this.y = y;
        this.w = 32; this.h = 32;
        this.startX = x;
        this.patrolWidth = patrolWidth;
        this.speed = CONFIG.PATROL_SPEED;
        this.dir = 1;
        this.alive = true;
        this.animFrame = 0;
    }
    update(frames) {
        if (!this.alive) return;
        this.x += this.speed * this.dir;
        if (this.x > this.startX + this.patrolWidth) this.dir = -1;
        if (this.x < this.startX) this.dir = 1;
        this.animFrame = Math.floor(frames / 10) % 4;
    }
    draw(ctx, cam, canvas, frames) {
        if (!this.alive) return;
        if (!isOnScreen(this.x, this.y, this.w, this.h, cam, canvas)) return;
        const sx = this.x - cam.x, sy = this.y - cam.y;
        ctx.save();
        // Body glow
        ctx.shadowColor = CONFIG.COLORS.ENEMY_RED;
        ctx.shadowBlur = 10 + Math.sin(frames * 0.1) * 4;
        // Main body circle
        ctx.fillStyle = CONFIG.COLORS.ENEMY_RED;
        ctx.beginPath();
        ctx.arc(sx + this.w/2, sy + this.h/2, this.w/2 - 2, 0, Math.PI * 2);
        ctx.fill();
        // Inner detail
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#aa2222';
        ctx.beginPath();
        ctx.arc(sx + this.w/2, sy + this.h/2, this.w/4, 0, Math.PI * 2);
        ctx.fill();
        // Eye
        ctx.fillStyle = '#fff';
        const eyeX = sx + this.w/2 + this.dir * 4;
        ctx.beginPath();
        ctx.arc(eyeX, sy + this.h/2 - 2, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(eyeX + this.dir * 1.5, sy + this.h/2 - 2, 2, 0, Math.PI * 2);
        ctx.fill();
        // Antenna
        ctx.strokeStyle = '#ff6666';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sx + this.w/2, sy + 2);
        ctx.lineTo(sx + this.w/2, sy - 6);
        ctx.stroke();
        ctx.fillStyle = '#ff8888';
        ctx.beginPath();
        ctx.arc(sx + this.w/2, sy - 7, 3, 0, Math.PI * 2);
        ctx.fill();
        // Legs
        const legBob = Math.sin(frames * 0.2) * 3;
        ctx.fillStyle = '#cc3333';
        ctx.fillRect(sx + 6, sy + this.h - 4, 6, 4 + legBob);
        ctx.fillRect(sx + this.w - 12, sy + this.h - 4, 6, 4 - legBob);
        ctx.restore();
    }
}

class FirewallTurret {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.w = 36; this.h = 36;
        this.fireTimer = CONFIG.TURRET_FIRE_INTERVAL;
        this.alive = true;
        this.projectiles = [];
    }
    update(playerX, playerY, frames) {
        if (!this.alive) return;
        this.fireTimer--;
        if (this.fireTimer <= 0) {
            this.fireTimer = CONFIG.TURRET_FIRE_INTERVAL;
            const dx = playerX - (this.x + this.w/2);
            const dy = playerY - (this.y + this.h/2);
            const d = Math.sqrt(dx*dx + dy*dy);
            if (d < 600 && d > 0) {
                this.projectiles.push({
                    x: this.x + this.w/2,
                    y: this.y + this.h/2,
                    vx: (dx/d) * CONFIG.PROJECTILE_SPEED,
                    vy: (dy/d) * CONFIG.PROJECTILE_SPEED,
                    w: 8, h: 8,
                    life: 180
                });
            }
        }
        // Update projectiles
        for (const p of this.projectiles) {
            p.x += p.vx; p.y += p.vy; p.life--;
        }
        this.projectiles = this.projectiles.filter(p => p.life > 0);
    }
    draw(ctx, cam, canvas, frames) {
        if (!this.alive) return;
        if (!isOnScreen(this.x, this.y, this.w, this.h, cam, canvas)) return;
        const sx = this.x - cam.x, sy = this.y - cam.y;
        ctx.save();
        // Base
        ctx.shadowColor = CONFIG.COLORS.ENEMY_BROWN;
        ctx.shadowBlur = 8;
        ctx.fillStyle = CONFIG.COLORS.ENEMY_BROWN;
        ctx.beginPath();
        ctx.arc(sx + this.w/2, sy + this.h/2, this.w/2 - 2, 0, Math.PI * 2);
        ctx.fill();
        // Barrel
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#6b4226';
        ctx.fillRect(sx + this.w/2 - 3, sy - 4, 6, this.h/2 + 4);
        // Eye ring
        ctx.strokeStyle = '#ff8844';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx + this.w/2, sy + this.h/2, 8, 0, Math.PI * 2);
        ctx.stroke();
        // Pulsing core
        const pulse = Math.sin(frames * 0.1) * 0.3 + 0.7;
        ctx.fillStyle = `rgba(255, 102, 0, ${pulse})`;
        ctx.beginPath();
        ctx.arc(sx + this.w/2, sy + this.h/2, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        // Draw projectiles
        for (const p of this.projectiles) {
            if (!isOnScreen(p.x, p.y, p.w, p.h, cam, canvas)) continue;
            const px = p.x - cam.x, py = p.y - cam.y;
            ctx.save();
            ctx.shadowColor = CONFIG.COLORS.PROJECTILE;
            ctx.shadowBlur = 10;
            ctx.fillStyle = CONFIG.COLORS.PROJECTILE;
            ctx.beginPath();
            ctx.arc(px, py, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
}

// Build enemy instances from level data
function createEnemies(enemyData) {
    const patrols = [], turrets = [];
    for (const e of enemyData) {
        if (e.type === 'patrol') {
            patrols.push(new PatrolBot(e.x, e.y, e.patrolWidth));
        } else if (e.type === 'turret') {
            turrets.push(new FirewallTurret(e.x, e.y));
        }
    }
    return { patrols, turrets };
}
