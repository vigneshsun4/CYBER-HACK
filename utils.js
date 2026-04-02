// ============================================================
// UTILS.JS - Utility Functions, Particles, Collision Detection
// ============================================================

/** Clamp a value between min and max */
function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }

/** Linear interpolation */
function lerp(a, b, t) { return a + (b - a) * t; }

/** Distance between two points */
function dist(x1, y1, x2, y2) { return Math.sqrt((x2-x1)**2 + (y2-y1)**2); }

/** AABB rect collision */
function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x &&
           a.y < b.y + b.h && a.y + a.h > b.y;
}

/** Point inside rect */
function pointInRect(px, py, r) {
    return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

/** World-to-screen coordinate transform */
function toScreen(wx, wy, cam) {
    return { x: wx - cam.x, y: wy - cam.y };
}

/** Check if a world rect is visible on screen */
function isOnScreen(wx, wy, ww, wh, cam, canvas) {
    const sx = wx - cam.x, sy = wy - cam.y;
    return sx + ww > -100 && sx < canvas.width + 100 &&
           sy + wh > -100 && sy < canvas.height + 100;
}

// --- Particle System ---
class Particle {
    constructor(x, y, vx, vy, size, color, life = 1) {
        this.x = x; this.y = y;
        this.vx = vx; this.vy = vy;
        this.size = Math.max(0.5, size);
        this.color = color;
        this.alpha = life;
        this.decay = 0.015 + Math.random() * 0.025;
        this.dead = false;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= this.decay;
        this.size *= 0.97;
        if (this.alpha <= 0 || this.size < 0.2) this.dead = true;
    }
    draw(ctx, cam) {
        if (this.dead) return;
        const sx = this.x - cam.x, sy = this.y - cam.y;
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.alpha);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(sx, sy, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

/** Spawn burst of particles at a point */
function spawnParticles(arr, x, y, count, color, opts = {}) {
    const { speed = 3, size = 3, gravity = false } = opts;
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = Math.random() * speed + 0.5;
        const p = new Particle(
            x + (Math.random() - 0.5) * 10,
            y + (Math.random() - 0.5) * 10,
            Math.cos(angle) * spd,
            Math.sin(angle) * spd - (gravity ? 1 : 0),
            Math.random() * size + 1,
            color
        );
        arr.push(p);
    }
}

// --- Drawing Helpers ---
function drawGlowRect(ctx, x, y, w, h, color, glowColor, glowSize = 8) {
    ctx.save();
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = glowSize;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
}

function drawTextWithGlow(ctx, text, x, y, font, color, glowColor, align = 'left') {
    ctx.save();
    ctx.font = font;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 12;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.shadowBlur = 0;
    ctx.restore();
}

/** Animated circuit line for backgrounds */
function drawCircuitLine(ctx, x1, y1, x2, y2, color, alpha = 0.3) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    // Create right-angle bends
    const mx = (x1 + x2) / 2;
    ctx.lineTo(mx, y1);
    ctx.lineTo(mx, y2);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    // Draw node dots at endpoints
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x1, y1, 2, 0, Math.PI * 2);
    ctx.arc(x2, y2, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}
