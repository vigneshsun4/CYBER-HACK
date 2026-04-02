// ============================================================
// LEVEL.JS - Level Data, Camera, Platform/Object Rendering
// Based on the provided level design map
// ============================================================

// --- Camera ---
class Camera {
    constructor(canvas) {
        this.x = 0; this.y = 0;
        this.canvas = canvas;
    }
    follow(player) {
        const targetX = player.x - this.canvas.width * CONFIG.CAM_LEAD_X;
        const targetY = player.y - this.canvas.height * CONFIG.CAM_LEAD_Y;
        this.x = lerp(this.x, targetX, CONFIG.CAM_SMOOTH);
        this.y = lerp(this.y, targetY, CONFIG.CAM_SMOOTH);
        // Clamp to level bounds
        this.x = clamp(this.x, 0, CONFIG.LEVEL_WIDTH - this.canvas.width);
        this.y = clamp(this.y, 0, CONFIG.LEVEL_HEIGHT - this.canvas.height);
    }
}

// --- Level Builder ---
function buildLevel() {
    const T = CONFIG.TILE; // 40px
    const platforms = [];
    const spikes = [];
    const chips = [];
    const grappleBlocks = [];
    const terminals = [];
    const powerupBlocks = [];
    const enemies = [];
    const spawn = { x: 120, y: 440 };

    // Helper: add platform (x in tiles, y in tiles, width in tiles, height in tiles)
    function plat(tx, ty, tw, th) {
        platforms.push({ x: tx*T, y: ty*T, w: tw*T, h: (th||1)*T });
    }
    function spike(tx, ty, tw) {
        for (let i = 0; i < (tw||1); i++)
            spikes.push({ x: (tx+i)*T, y: ty*T, w: T, h: T });
    }
    function chip(tx, ty) {
        chips.push({ x: tx*T + T/4, y: ty*T + T/4, w: T/2, h: T/2, collected: false });
    }
    function grapple(tx, ty) {
        grappleBlocks.push({ x: tx*T, y: ty*T, w: T, h: T });
    }
    function terminal(tx, ty, id) {
        terminals.push({ x: tx*T, y: ty*T, w: T, h: T*1.5, id: id, hacked: false });
    }
    function powerup(tx, ty, type) {
        powerupBlocks.push({ x: tx*T, y: ty*T, w: T, h: T, type: type, used: false });
    }
    function enemy(tx, ty, type, patrolW) {
        enemies.push({ x: tx*T, y: ty*T, type: type, patrolWidth: (patrolW||4)*T });
    }

    // ===== GROUND (continuous bottom) =====
    plat(0, 18, 200, 2); // main ground across entire level

    // ===== SECTION 1: SPAWN & TUTORIAL HACK (tiles 0-18) =====
    // Raised spawn platforms
    plat(1, 14, 3, 1);
    plat(5, 14, 3, 1);
    
    // ===== EASTER EGG ZONE =====
    // Tucked way up high in the sky! Wall jump required?
    platforms.push({ x: 6*T, y: 1*T, w: 10*T, h: T, secret: true });
    chip(11, 0); chip(12, 0); chip(13, 0);
    
    // Powerup block (Quantum Boost) available early
    powerup(6, 13, 'speed');
    chip(2, 12); chip(3, 12); chip(5, 12);

    // TUTORIAL HACKING DOOR (5 blocks from start)
    plat(10, 14, 4, 1); // Platform leading to the door
    terminal(11, 12, 0); // Terminal ID 0
    // Giant Wall blocking everything infinitely upwards
    platforms.push({ x: 14*T, y: -20*T, w: 2*T, h: 38*T, movable: true, terminalId: 0,
                     targetY: -45*T, originalY: -20*T, moving: false, speed: 2 });
                     
    // Safe landing on the other side of the door
    plat(16, 14, 3, 1);
    chip(16, 13); chip(17, 13); 

    // ===== SECTION 2: SPIKE PIT (tiles 18-35) =====
    // Gap in ground with spikes at bottom
    plat(0, 18, 18, 2);  // ground left section ends at 18
    spike(18, 17, 4);
    plat(22, 18, 178, 2); // ground continues
    // Upper path over spikes
    plat(17, 14, 4, 1);
    plat(22, 13, 4, 1);
    plat(27, 14, 3, 1);
    chip(20, 11); chip(23, 11); chip(25, 11);
    // Red enemy on ground after spike pit
    enemy(25, 17, 'patrol', 4);

    // ===== SECTION 3: VERTICAL CLIMB (tiles 28-40) =====
    // Tall walls but spaced neatly and staggered
    plat(30, 11, 1, 8);   // left wall lower
    plat(36, 6, 1, 12);   // right wall 
    // Staggered platforms like stairs
    plat(31, 16, 2, 1);
    plat(34, 14, 2, 1);
    plat(31, 12, 2, 1);
    plat(34, 10, 2, 1);
    plat(31, 8, 3, 1);
    // Chips going up
    chip(32, 15); chip(35, 13); chip(32, 11); chip(35, 9);
    chip(32, 7);
    // Removed firewall turret here to keep early game easier

    // ===== SECTION 4: SPIKE GAUNTLET (tiles 38-55) =====
    // Ground level spikes
    spike(38, 17, 12);
    // Platforms over spikes - Much Closer
    plat(38, 14, 3, 1);
    plat(43, 14, 3, 1);
    plat(48, 14, 3, 1);
    
    // First grapple block lowered to be obvious
    grapple(45, 11);
    
    // Chips on platforms
    chip(39, 13); chip(44, 13); chip(49, 13);
    // Patrol on platforms
    enemy(48, 13, 'patrol', 3);

    // ===== SECTION 5: THE LONE GRAPPLE (tiles 52-68) =====
    // ONE crucial grapple in the middle of a huge spike pit
    grapple(58, 8); // placed carefully so it's the exact middle

    // Jump-off Platform
    plat(52, 14, 3, 1);
    // Landing Platform
    plat(63, 14, 5, 1);
    
    // Spikes filling the entire gap below
    spike(55, 17, 8);
    
    // Chip path showing the required arc
    chip(55, 11); chip(58, 10); chip(61, 11);

    // ===== SECTION 6: HACKING DOOR 1 (tiles 70-80) =====
    // Terminal area right in front of a giant wall
    plat(70, 14, 12, 1);
    terminal(74, 12, 1);
    
    // Massive sliding door blocking the path (extends out of screen)
    platforms.push({ x: 77*T, y: -20*T, w: 2*T, h: 35*T, movable: true, terminalId: 1,
                     targetY: -45*T, originalY: -20*T, moving: false, speed: 2 });
                     
    // Upper chips
    chip(74, 9); chip(75, 9);
    
    // Enemies guarding the terminal to make hacking stressful
    enemy(71, 13, 'patrol', 4);

    // ===== SECTION 7: PLATFORMING CHALLENGE (tiles 82-100) =====
    // Complex platforming with enemies - INCREASED DIFFICULTY
    plat(83, 15, 2, 1);
    plat(86, 12, 1, 1); // tighter jump
    plat(89, 10, 2, 1);
    plat(93, 12, 1, 1);
    plat(96, 14, 2, 1);
    // Chips scattered
    chip(84, 14); chip(87, 11); chip(90, 8); chip(91, 10);
    chip(94, 11); chip(97, 13);
    // Enemies - Adding Turrets and Patrols
    enemy(89, 9, 'patrol', 2);
    enemy(96, 13, 'patrol', 3);
    enemy(90, 17, 'turret', 0); // shoots up from ground
    // Spikes - larger pits
    spike(83, 17, 6);
    spike(91, 17, 6);
    // Tall wall for wall-jump
    plat(99, 6, 1, 12);
    plat(100, 10, 2, 1);
    chip(101, 9); chip(102, 9);

    // ===== SECTION 8: HACKING DOOR 2 (tiles 103-118) =====
    plat(103, 14, 8, 1);
    terminal(106, 12, 2); 
    
    // Second Massive Blockade Door (extends out of screen)
    platforms.push({ x: 109*T, y: -20*T, w: 2*T, h: 35*T, movable: true, terminalId: 2,
                     targetY: -45*T, originalY: -20*T, moving: false, speed: 2 });
                     
    // Safe area after door with Powerup
    plat(112, 14, 6, 1);
    powerup(113, 13, 'shield');
    
    // Enemies guarding the terminal intensely
    enemy(103, 13, 'patrol', 4);
    enemy(106, 9, 'turret', 0); // shoots down at the terminal

    // ===== SECTION 9: FINAL GAUNTLET (tiles 120-145) =====
    // Dense spike final challenge - HIGHEST DIFFICULTY
    spike(120, 17, 18); // Massive spike pit below everything
    
    // Staggered Tiny stepping stones
    plat(120, 14, 2, 1);
    plat(125, 11, 2, 1); // high jump
    
    // ONE Critical High-Speed Grapple
    // Placed extremely high and far relative to the tiny platform
    grapple(131, 6);
    
    // Tiny landing stone 
    plat(136, 14, 2, 1);
    
    // Chips tracing the crazy arc
    chip(121, 13); chip(126, 10); 
    chip(131, 8); 
    
    // Firewall Turret directly targeting the grapple arc
    enemy(137, 13, 'turret', 0);

    // ===== SECTION 10: BOSS DOOR (tiles 145-155) =====
    plat(140, 14, 15, 1);
    // Second terminal for gate
    terminal(148, 12, 3);
    // Gate (tall platform blocking path — removed when terminal 3 is hacked)
    platforms.push({ x: 150*T, y: 5*T, w: T, h: 9*T, gate: true, terminalId: 3 });
    // Chips before boss
    chip(142, 13); chip(143, 13); chip(144, 13);
    chip(146, 13); chip(147, 13);
    // Enemy before gate
    enemy(142, 13, 'patrol', 5);
    // Boss trigger zone (after gate)
    plat(152, 14, 5, 1);

    const bossZone = { x: 152*T, y: 0, w: 5*T, h: 18*T };

    return { platforms, spikes, chips, grappleBlocks, terminals, powerupBlocks, enemies, spawn, bossZone };
}

// --- Level Rendering ---
function drawLevelBackground(ctx, cam, canvas, frames) {
    // Deep dark synthwave-style sky
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#02020a');
    grad.addColorStop(0.5, CONFIG.COLORS.DARK_BG);
    grad.addColorStop(1, '#150530');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Dynamic Parallax Grid (Floor perspective)
    ctx.save();
    const horizon = canvas.height * 0.4;
    ctx.beginPath();
    ctx.rect(0, horizon, canvas.width, canvas.height - horizon);
    ctx.clip();
    
    ctx.globalAlpha = 0.15;
    ctx.strokeStyle = CONFIG.COLORS.NEON_PURPLE;
    ctx.shadowColor = CONFIG.COLORS.NEON_PURPLE;
    ctx.shadowBlur = 5;
    
    const panOffset = -(cam.x * 0.2) % 60;
    
    // Horizontals
    for (let i = 0; i < 15; i++) {
        const y = horizon + Math.pow(i, 2) * 1.5;
        if (y < canvas.height) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
        }
    }
    // Verticals
    const vOffset = -(cam.x * 0.1) % 100;
    for (let i = -20; i <= 20; i++) {
        const sx = canvas.width/2 + (i * 80) + vOffset;
        ctx.beginPath(); ctx.moveTo(sx, horizon); ctx.lineTo(sx + (i*150), canvas.height); ctx.stroke();
    }
    ctx.restore();

    // Floor glow
    ctx.fillStyle = 'rgba(184, 41, 221, 0.08)';
    ctx.fillRect(0, horizon, canvas.width, canvas.height - horizon);

    // Animated circuit traces in sky (parallax)
    ctx.save();
    ctx.globalAlpha = 0.2;
    const circuitOff = -(cam.x * 0.1) % 400;
    for (let i = 0; i < 8; i++) {
        const cx = circuitOff + i * 400 + Math.sin(i * 1.7) * 50;
        const cy = 50 + (i % 3) * 200;
        const pulse = Math.sin(frames * 0.03 + i) * 0.5 + 0.5;
        ctx.strokeStyle = `rgba(0, 255, 136, ${0.15 + pulse * 0.2})`;
        ctx.shadowColor = CONFIG.COLORS.GREEN_CIRCUIT;
        ctx.shadowBlur = pulse * 10;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + 80, cy);
        ctx.lineTo(cx + 80, cy + 60);
        ctx.lineTo(cx + 160, cy + 60);
        ctx.stroke();
        
        // Data packet moving
        const packetT = (frames * (2 + i*0.5)) % 160;
        if (packetT < 80) {
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(cx + packetT, cy, 3, 0, Math.PI*2); ctx.fill();
        } else {
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(cx + 80 + (packetT-80), cy+60, 3, 0, Math.PI*2); ctx.fill();
        }
        
        // Node
        ctx.fillStyle = CONFIG.COLORS.GREEN_CIRCUIT;
        ctx.globalAlpha = 0.3 + pulse * 0.5;
        ctx.beginPath(); ctx.arc(cx + 160, cy + 60, 4, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
    }
    ctx.restore();
}

function drawPlatforms(ctx, cam, canvas, platforms, frames) {
    for (const p of platforms) {
        if (!isOnScreen(p.x, p.y, p.w, p.h, cam, canvas)) continue;
        if (p.gate && p.removed) continue;

        const sx = p.x - cam.x, sy = p.y - cam.y;
        
        ctx.save();
        // Base fill
        ctx.fillStyle = '#0f1228';
        ctx.fillRect(sx, sy, p.w, p.h);
        
        // Cyber Grid interior
        ctx.globalAlpha = 0.15;
        ctx.strokeStyle = CONFIG.COLORS.ELECTRIC_BLUE;
        ctx.lineWidth = 1;
        for(let x = 10; x < p.w; x+=30) {
            ctx.beginPath(); ctx.moveTo(sx+x, sy); ctx.lineTo(sx+x, sy+p.h); ctx.stroke();
        }
        for(let y = 10; y < p.h; y+=30) {
            ctx.beginPath(); ctx.moveTo(sx, sy+y); ctx.lineTo(sx+p.w, sy+y); ctx.stroke();
        }
        
        // Edge highlights
        ctx.globalAlpha = 1;
        ctx.shadowColor = CONFIG.COLORS.ELECTRIC_BLUE;
        ctx.shadowBlur = 10;
        ctx.strokeStyle = CONFIG.COLORS.ELECTRIC_BLUE;
        ctx.lineWidth = 2;
        ctx.strokeRect(sx, sy, p.w, p.h);
        
        // Top edge glow (neon bar)
        ctx.fillStyle = CONFIG.COLORS.ELECTRIC_BLUE;
        ctx.fillRect(sx, sy, p.w, 4);
        
        // Scanning laser on long platforms
        if (p.w >= 120) {
            const scanX = (frames * 2) % p.w;
            ctx.fillStyle = 'rgba(0, 255, 136, 0.4)';
            ctx.shadowColor = CONFIG.COLORS.GREEN_CIRCUIT;
            ctx.fillRect(sx + scanX, sy, 4, p.h);
        }
        
        // EASTER EGG TEXT RENDER
        if (p.secret) {
            ctx.save();
            ctx.shadowColor = '#00ffaa';
            ctx.shadowBlur = 15;
            ctx.fillStyle = '#00ffaa';
            ctx.font = 'bold 30px "Inter", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText("IEEE COMPSOC 80TH ANNIVERSARY!", sx + p.w/2, sy - 80);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 18px monospace';
            ctx.shadowBlur = 5;
            ctx.fillText("< ERROR: SECRET ZONE REACHED. YOU ARE A MASTER HACKER. />", sx + p.w/2, sy - 40);
            ctx.restore();
        }
        
        ctx.restore();
    }
}

function drawSpikes(ctx, cam, canvas, spikes, frames) {
    for (const s of spikes) {
        if (!isOnScreen(s.x, s.y, s.w, s.h, cam, canvas)) continue;
        const sx = s.x - cam.x, sy = s.y - cam.y;
        // Glow
        ctx.save();
        ctx.shadowColor = CONFIG.COLORS.SPIKE;
        ctx.shadowBlur = 8 + Math.sin(frames * 0.1) * 3;
        ctx.fillStyle = CONFIG.COLORS.SPIKE;
        // Draw triangle spike
        ctx.beginPath();
        ctx.moveTo(sx, sy + s.h);
        ctx.lineTo(sx + s.w / 2, sy + 4);
        ctx.lineTo(sx + s.w, sy + s.h);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
}

function drawGrappleBlocks(ctx, cam, canvas, blocks, frames) {
    for (const b of blocks) {
        if (!isOnScreen(b.x, b.y, b.w, b.h, cam, canvas)) continue;
        const sx = b.x - cam.x, sy = b.y - cam.y;
        ctx.save();
        ctx.shadowColor = CONFIG.COLORS.GRAPPLE_GLOW;
        ctx.shadowBlur = 12 + Math.sin(frames * 0.08) * 6;
        ctx.fillStyle = CONFIG.COLORS.GRAPPLE_BLOCK;
        ctx.fillRect(sx + 2, sy + 2, b.w - 4, b.h - 4);
        // Inner glow
        ctx.fillStyle = 'rgba(155, 89, 182, 0.3)';
        ctx.fillRect(sx + 6, sy + 6, b.w - 12, b.h - 12);
        // Pulsing ring
        ctx.strokeStyle = CONFIG.COLORS.NEON_PURPLE;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.4 + Math.sin(frames * 0.06) * 0.3;
        ctx.beginPath();
        ctx.arc(sx + b.w/2, sy + b.h/2, b.w/2 + 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}

function drawChips(ctx, cam, canvas, chips, frames) {
    for (const c of chips) {
        if (c.collected) continue;
        if (!isOnScreen(c.x, c.y, c.w, c.h, cam, canvas)) continue;
        const sx = c.x - cam.x, sy = c.y - cam.y;
        const bob = Math.sin(frames * 0.1 + c.x * 0.01) * 4;
        ctx.save();
        
        // COMPSOC CPU CHIP STYLE
        ctx.shadowColor = CONFIG.COLORS.GREEN_CIRCUIT;
        ctx.shadowBlur = 10;
        
        // Base CPU Board
        ctx.fillStyle = '#0a0a0a';
        ctx.strokeStyle = CONFIG.COLORS.GREEN_CIRCUIT;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(sx, sy + bob, c.w, c.h, 3);
        ctx.fill(); 
        ctx.stroke();
        
        // Gold Pins on edges
        ctx.fillStyle = CONFIG.COLORS.CHIP_GOLD;
        ctx.shadowBlur = 0;
        for(let i=0; i<3; i++) {
            ctx.fillRect(sx + 3 + i*6, sy + bob - 1, 3, 2); // top
            ctx.fillRect(sx + 3 + i*6, sy + bob + c.h - 1, 3, 2); // bottom
            ctx.fillRect(sx - 1, sy + bob + 3 + i*6, 2, 3); // left
            ctx.fillRect(sx + c.w - 1, sy + bob + 3 + i*6, 2, 3); // right
        }

        // Glowing "CS" Text inside
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 5;
        ctx.fillStyle = '#fff';
        ctx.font = '900 12px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('CS', sx + c.w/2, sy + bob + c.h/2);
        
        ctx.restore();
    }
}

function drawTerminals(ctx, cam, canvas, terminals, frames) {
    for (const t of terminals) {
        if (!isOnScreen(t.x, t.y, t.w, t.h, cam, canvas)) continue;
        const sx = t.x - cam.x, sy = t.y - cam.y;
        ctx.save();
        // Terminal body
        ctx.fillStyle = t.hacked ? '#114422' : '#0a1a33';
        ctx.fillRect(sx, sy, t.w, t.h);
        // Screen
        ctx.shadowColor = t.hacked ? CONFIG.COLORS.GREEN_CIRCUIT : CONFIG.COLORS.TERMINAL;
        ctx.shadowBlur = 10;
        ctx.fillStyle = t.hacked ? 'rgba(0,255,136,0.3)' : 'rgba(0,170,255,0.3)';
        ctx.fillRect(sx + 4, sy + 4, t.w - 8, t.h * 0.5);
        // Flicker effect
        if (!t.hacked && Math.random() < 0.05) {
            ctx.fillStyle = 'rgba(0,170,255,0.6)';
            ctx.fillRect(sx + 4, sy + 4, t.w - 8, t.h * 0.5);
        }
        // "H" prompt
        if (!t.hacked) {
            ctx.fillStyle = CONFIG.COLORS.TERMINAL;
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('[H]', sx + t.w/2, sy + t.h + 12);
        }
        ctx.restore();
    }
}

function drawPowerupBlocks(ctx, cam, canvas, blocks, frames) {
    for (const b of blocks) {
        if (b.used) continue;
        if (!isOnScreen(b.x, b.y, b.w, b.h, cam, canvas)) continue;
        const sx = b.x - cam.x, sy = b.y - cam.y;
        const color = b.type === 'speed' ? CONFIG.COLORS.POWERUP_SPEED : CONFIG.COLORS.POWERUP_SHIELD;
        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = 8 + Math.sin(frames * 0.08) * 4;
        ctx.fillStyle = color;
        ctx.fillRect(sx, sy, b.w, b.h);
        // ? mark
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('?', sx + b.w/2, sy + b.h/2 + 7);
        ctx.restore();
    }
}

// --- Update movable platforms ---
function updateMovablePlatforms(platforms) {
    for (const p of platforms) {
        if (!p.movable || !p.moving) continue;
        if (Math.abs(p.y - p.targetY) < p.speed) {
            p.y = p.targetY;
            p.moving = false;
        } else {
            p.y += p.y > p.targetY ? -p.speed : p.speed;
        }
    }
    // Remove gates that are opened
    // (gates stay in array but get .removed flag from hacking)
}
