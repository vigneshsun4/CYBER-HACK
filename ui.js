// ============================================================
// UI.JS - Welcome Screen, HUD, Notifications, Transitions
// ============================================================

class UI {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.notifications = [];
        // Menu circuit particles
        this.menuParticles = [];
        this.circuitNodes = [];
        // Horizon lines for 3D floor grid
        this.gridOffset = 0;
        this._generateCircuit();
        // Button rects for click detection
        this.menuButtons = [];
        this.controlsBack = null;
        this.creditsBack = null;
    }

    _generateCircuit() {
        this.circuitNodes = [];
        for (let i = 0; i < 30; i++) {
            this.circuitNodes.push({
                x: Math.random() * 2000,
                y: Math.random() * 1200,
                connections: Math.floor(Math.random() * 3) + 1,
                pulse: Math.random() * Math.PI * 2
            });
        }
    }

    notify(text, color, duration = 120) {
        this.notifications.push({ text, color, timer: duration, maxTimer: duration });
    }

    // --- WELCOME SCREEN ---
    drawMenu(frames) {
        const c = this.canvas, ctx = this.ctx;
        const cx = c.width / 2, cy = c.height / 2;

        // Calculate Mouse Parallax Offsets
        // Provide a default offset if mouse hasn't moved
        const mx = this._mouseX || cx;
        const my = this._mouseY || cy;
        const pX = (mx - cx) * 0.05;
        const pY = (my - cy) * 0.05;

        // 1. Dynamic Space/Void Background
        const grad = ctx.createRadialGradient(cx + pX*2, cy + pY*2, 0, cx, cy, c.width);
        grad.addColorStop(0, '#0f0c29');
        grad.addColorStop(0.5, '#302b63');
        grad.addColorStop(1, '#050314');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, c.width, c.height);

        // 2. Animated Starfield Parallax
        ctx.save();
        ctx.fillStyle = '#fff';
        for (let i = 0; i < 60; i++) {
            const sx = (Math.sin(i * 999) * 5000 + frames * (0.2 + i*0.01) - pX * (i%3)) % c.width;
            const sy = (Math.cos(i * 888) * 5000 - pY * (i%3)) % c.height;
            const starX = sx < 0 ? sx + c.width : sx;
            const starY = sy < 0 ? sy + c.height : sy;
            ctx.globalAlpha = Math.abs(Math.sin((frames + i*100) * 0.02)) * 0.8;
            ctx.beginPath();
            ctx.arc(starX, starY, (i%3)*0.8, 0, Math.PI*2);
            ctx.fill();
        }
        ctx.restore();

        // 3. 3D Synthwave Grid Floor
        ctx.save();
        const gridHorizon = cy + 40 + pY;
        ctx.beginPath();
        ctx.rect(0, gridHorizon, c.width, c.height);
        ctx.clip(); 
        
        ctx.strokeStyle = `rgba(0, 255, 200, ${0.3 + Math.sin(frames*0.05)*0.1})`;
        ctx.lineWidth = 2;
        ctx.shadowColor = CONFIG.COLORS.GREEN_CIRCUIT;
        ctx.shadowBlur = 12;
        
        this.gridOffset = (this.gridOffset + 2) % 60;
        
        // Horizontals (Exponential Perspective)
        for (let i = 0; i < 25; i++) {
            const hY = gridHorizon + Math.pow(i, 2.3) + this.gridOffset * (i * 0.15);
            if (hY < c.height && hY > gridHorizon) {
                ctx.beginPath();
                ctx.moveTo(0, hY);
                ctx.lineTo(c.width, hY);
                ctx.stroke();
            }
        }
        
        // Verticals (vanishing point tracks mouse)
        const vpX = cx - pX * 4;
        for (let i = -40; i <= 40; i++) {
            const startX = vpX + (i * 35);
            const slopeX = vpX + Math.sign(i) * Math.pow(Math.abs(i), 1.9) * 25;
            ctx.beginPath();
            ctx.moveTo(startX, gridHorizon);
            ctx.lineTo(slopeX, c.height);
            ctx.stroke();
        }
        
        // Sun / Horizon Glow
        const sunGrad = ctx.createLinearGradient(0, gridHorizon - 80, 0, gridHorizon + 80);
        sunGrad.addColorStop(0, 'rgba(255, 0, 128, 0)');
        sunGrad.addColorStop(0.5, 'rgba(255, 0, 128, 0.8)');
        sunGrad.addColorStop(1, 'rgba(0, 255, 200, 0)');
        ctx.fillStyle = sunGrad;
        ctx.shadowBlur = 0;
        ctx.fillRect(0, gridHorizon - 80, c.width, 160);
        ctx.restore();

        // 4. Foreground Matrix/Hex Rain
        if (frames % 4 === 0) {
            this.menuParticles.push({
                x: Math.random() * c.width,
                y: c.height + 10,
                vy: -(Math.random() * 3 + 2),
                size: Math.random() * 5 + 10,
                alpha: Math.random() * 0.8 + 0.2,
                char: ['[0]', '{1}', '⬡', '⚠', '⚡'][Math.floor(Math.random() * 5)]
            });
        }
        ctx.save();
        for (let i = this.menuParticles.length - 1; i >= 0; i--) {
            const p = this.menuParticles[i];
            p.y += p.vy;
            p.x += Math.sin(frames*0.05 + p.y*0.01) * 2; 
            p.alpha -= 0.005;
            if (p.alpha <= 0 || p.y < -20) { this.menuParticles.splice(i, 1); continue; }
            ctx.globalAlpha = p.alpha;
            ctx.font = `bold ${p.size}px monospace`;
            ctx.fillStyle = (p.char === '⚠' || p.char === '⚡') ? '#ff0055' : CONFIG.COLORS.ELECTRIC_BLUE;
            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = 10;
            ctx.fillText(p.char, p.x - pX*1.5, p.y - pY*1.5);
        }
        ctx.restore();

        // 5. Huge IEEE Logo & Anniversary Badge
        ctx.save();
        const logoY = Math.max(80, cy - 220) - pY * 0.8;
        const logoX = cx - pX * 0.8;
        ctx.shadowColor = CONFIG.COLORS.ELECTRIC_BLUE;
        ctx.shadowBlur = 20 + Math.sin(frames * 0.1) * 10;
        
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(logoX - 90, logoY - 25);
        ctx.lineTo(logoX - 100, logoY - 10);
        ctx.lineTo(logoX - 100, logoY + 10);
        ctx.lineTo(logoX - 90, logoY + 25);
        ctx.lineTo(logoX + 90, logoY + 25);
        ctx.lineTo(logoX + 100, logoY + 10);
        ctx.lineTo(logoX + 100, logoY - 10);
        ctx.lineTo(logoX + 90, logoY - 25);
        ctx.closePath();
        ctx.stroke();
        
        ctx.fillStyle = 'rgba(0, 212, 255, 0.15)';
        ctx.fill();
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 32px "Inter", "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.letterSpacing = '4px';
        ctx.fillText('IEEE CS', logoX, logoY);

        ctx.fillStyle = CONFIG.COLORS.GREEN_CIRCUIT;
        ctx.shadowColor = CONFIG.COLORS.GREEN_CIRCUIT;
        ctx.shadowBlur = 15;
        ctx.font = 'bold 16px monospace';
        ctx.letterSpacing = '6px';
        ctx.fillText('// 80 YEARS OF INNOVATION', logoX, logoY + 55);
        ctx.restore();

        // 6. MAIN TITLE (Massive Chromatic Aberration)
        let mainTitle = 'CYBER HACK';
        let tX = cx - pX * 0.5, tY = cy - 60 - pY * 0.5;
        
        ctx.save();
        ctx.font = `900 ${Math.min(70, c.width * 0.08)}px "Inter", "Segoe UI", sans-serif`;
        ctx.textAlign = 'center';
        
        // Chromatic Glitch Logic
        const glitch = Math.random() < 0.08 ? (Math.random() * 10 - 5) : 0;
        
        // RED Channel
        ctx.fillStyle = 'rgba(255, 0, 85, 0.9)';
        ctx.fillText(mainTitle, tX - 4 + glitch, tY);
        // BLUE Channel
        ctx.fillStyle = 'rgba(0, 255, 255, 0.9)';
        ctx.fillText(mainTitle, tX + 4 - glitch, tY);
        
        // Core Text Fill
        const tGrad = ctx.createLinearGradient(0, tY - 40, 0, tY + 10);
        tGrad.addColorStop(0, '#ffffff');
        tGrad.addColorStop(0.5, '#e0eaff');
        tGrad.addColorStop(1, '#88aaff');
        ctx.fillStyle = tGrad;
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 10;
        ctx.fillText(mainTitle, tX, tY);
        
        // Floor Reflection
        ctx.globalAlpha = 0.15;
        ctx.scale(1, -1);
        ctx.fillText(mainTitle, tX, -(tY + 40));
        ctx.scale(1, -1);
        ctx.globalAlpha = 1;
        ctx.restore();

        // 7. SLEEK INTERACTIVE BUTTONS
        this.menuButtons = [];
        const btnLabels = ['▶ START INFILTRATION', '⎈ SYSTEM CONTROLS', 'ⓘ CREATORS LOG'];
        const btnW = 300, btnH = 55, btnGap = 20;
        const btnStartY = cy + 40;

        for (let i = 0; i < btnLabels.length; i++) {
            const bx = cx - btnW / 2;
            const by = btnStartY + i * (btnH + btnGap);
            const hover = this._mouseInRect(bx, by, btnW, btnH);
            this.menuButtons.push({ x: bx, y: by, w: btnW, h: btnH, action: btnLabels[i] });

            ctx.save();
            // Hover scaling offset
            const hx = hover ? bx - 10 : bx;
            const hw = hover ? btnW + 20 : btnW;
            const hy = by;
            const moveX = -pX * (0.3 + i*0.1);
            const moveY = -pY * (0.3 + i*0.1);

            ctx.translate(moveX, moveY);
            
            const strokeColor = hover ? '#00ffaa' : '#0088ff';
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = hover ? 3 : 1;
            ctx.shadowColor = strokeColor;
            ctx.shadowBlur = hover ? 30 : 10;
            
            // Custom Slice Button Geometry
            ctx.beginPath();
            ctx.moveTo(hx + 15, hy);
            ctx.lineTo(hx + hw, hy);
            ctx.lineTo(hx + hw - 15, hy + btnH);
            ctx.lineTo(hx, hy + btnH);
            ctx.closePath();
            ctx.stroke();
            
            // Neon glass fill
            const bgGrad = ctx.createLinearGradient(hx, hy, hx, hy + btnH);
            bgGrad.addColorStop(0, hover ? 'rgba(0, 255, 170, 0.3)' : 'rgba(0, 136, 255, 0.1)');
            bgGrad.addColorStop(1, hover ? 'rgba(0, 255, 170, 0.1)' : 'rgba(0, 20, 50, 0.5)');
            ctx.fillStyle = bgGrad;
            ctx.fill();
            
            // Chaser light on top edge if hovering
            if (hover) {
                const chaseX = (frames * 8) % (hw + 30) - 15;
                ctx.fillStyle = '#fff';
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.arc(hx + 15 + Math.max(0, Math.min(hw-15, chaseX)), hy, 3, 0, Math.PI*2);
                ctx.fill();
            }

            ctx.shadowBlur = hover ? 15 : 0;
            ctx.fillStyle = hover ? '#ffffff' : '#d0e0ff';
            ctx.font = 'bold 16px "Inter", "Segoe UI", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.letterSpacing = hover ? '3px' : '2px';
            ctx.fillText(btnLabels[i], cx, hy + btnH / 2);
            ctx.restore();
        }

        // 8. Global CRT Scanline / Vignette Overlay
        ctx.save();
        const scanY = (frames * 2) % 4;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        for (let y = scanY; y < c.height; y += 4) {
            ctx.fillRect(0, y, c.width, 1);
        }
        
        // Scan bar
        ctx.fillStyle = 'rgba(0, 255, 170, 0.05)';
        ctx.fillRect(0, (frames * 5) % c.height, c.width, 10);
        
        // Edge Vignette
        const vig = ctx.createRadialGradient(cx, cy, c.height*0.4, cx, cy, c.width*0.7);
        vig.addColorStop(0, 'rgba(0,0,0,0)');
        vig.addColorStop(1, 'rgba(0,0,0,0.8)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, c.width, c.height);
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '10px monospace';
        ctx.textAlign = 'right';
        ctx.fillText('v2.0 // ZERO-G OVERMIND BUILD', c.width - 20, c.height - 20);
        ctx.restore();
    }

    // --- CONTROLS SCREEN ---
    drawControls(frames) {
        const c = this.canvas, ctx = this.ctx;
        const cx = c.width / 2, cy = c.height / 2;

        ctx.fillStyle = '#050818';
        ctx.fillRect(0, 0, c.width, c.height);

        ctx.save();
        ctx.fillStyle = CONFIG.COLORS.ELECTRIC_BLUE;
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'center';
        ctx.shadowColor = CONFIG.COLORS.ELECTRIC_BLUE;
        ctx.shadowBlur = 15;
        ctx.fillText('CONTROLS', cx, 60);
        ctx.restore();

        const controls = [
            ['← → / A D', 'Move Left / Right'],
            ['SPACE / W / ↑', 'Jump (hold for higher)'],
            ['G', 'Grapple to purple blocks'],
            ['H', 'Hack terminals'],
            ['1-4', 'Select hack options'],
            ['ESC', 'Pause / Cancel hack'],
        ];

        ctx.font = '14px monospace';
        ctx.textAlign = 'center';
        for (let i = 0; i < controls.length; i++) {
            const y = 120 + i * 45;
            ctx.fillStyle = CONFIG.COLORS.GREEN_CIRCUIT;
            ctx.fillText(controls[i][0], cx - 80, y);
            ctx.fillStyle = CONFIG.COLORS.HUD_TEXT;
            ctx.fillText(controls[i][1], cx + 80, y);
        }

        // Back button
        const bx = cx - 80, by = c.height - 80, bw = 160, bh = 40;
        this.controlsBack = { x: bx, y: by, w: bw, h: bh };
        ctx.save();
        ctx.strokeStyle = CONFIG.COLORS.ELECTRIC_BLUE;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(bx, by, bw, bh, 4);
        ctx.stroke();
        ctx.fillStyle = CONFIG.COLORS.HUD_TEXT;
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('BACK', cx, by + bh/2);
        ctx.restore();
    }

    // --- CREDITS SCREEN ---
    drawCredits(frames) {
        const c = this.canvas, ctx = this.ctx;
        const cx = c.width / 2;

        ctx.fillStyle = '#050818';
        ctx.fillRect(0, 0, c.width, c.height);

        ctx.save();
        ctx.fillStyle = CONFIG.COLORS.NEON_PURPLE;
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'center';
        ctx.shadowColor = CONFIG.COLORS.NEON_PURPLE;
        ctx.shadowBlur = 15;
        ctx.fillText('CREDITS', cx, 60);
        ctx.restore();

        const lines = [
            'IEEE Computer Society',
            '80th Anniversary Prompt-a-thon',
            '',
            'Game Design & Development',
            'CompSoc Defender Team',
            '',
            'Built with HTML5 Canvas',
            'Cyber Defense Theme',
            '',
            '© 2026 IEEE Computer Society'
        ];
        ctx.font = '14px monospace';
        ctx.textAlign = 'center';
        for (let i = 0; i < lines.length; i++) {
            ctx.fillStyle = i < 2 ? CONFIG.COLORS.ELECTRIC_BLUE : CONFIG.COLORS.HUD_TEXT;
            ctx.fillText(lines[i], cx, 120 + i * 35);
        }

        const bx = cx - 80, by = c.height - 80, bw = 160, bh = 40;
        this.creditsBack = { x: bx, y: by, w: bw, h: bh };
        ctx.strokeStyle = CONFIG.COLORS.ELECTRIC_BLUE;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(bx, by, bw, bh, 4);
        ctx.stroke();
        ctx.fillStyle = CONFIG.COLORS.HUD_TEXT;
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('BACK', cx, by + bh/2);
    }

    // --- HUD (SEXY REDESIGN) ---
    drawHUD(player, frames) {
        const ctx = this.ctx, c = this.canvas;
        ctx.save();
        
        // --- Dynamic Top Cyber Bar ---
        const topGrad = ctx.createLinearGradient(0, 0, 0, 60);
        topGrad.addColorStop(0, 'rgba(5, 5, 20, 0.95)');
        topGrad.addColorStop(1, 'rgba(5, 5, 20, 0.0)');
        ctx.fillStyle = topGrad;
        ctx.fillRect(0, 0, c.width, 80);

        // --- Left Panel: Health (Slanted Glass Panes) ---
        const hx = 20, hy = 20;
        
        // "HP:" Label
        ctx.shadowBlur = 10;
        ctx.shadowColor = CONFIG.COLORS.ELECTRIC_BLUE;
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px "Inter", sans-serif';
        ctx.textAlign = 'left';
        ctx.letterSpacing = '2px';
        ctx.fillText('SYS_HTH //', hx, hy + 14);

        // Drawing sleek slanted health blocks
        for (let i = 0; i < 3; i++) {
            const bx = hx + 110 + (i * 35);
            ctx.beginPath();
            ctx.moveTo(bx + 5, hy);
            ctx.lineTo(bx + 25, hy);
            ctx.lineTo(bx + 20, hy + 18);
            ctx.lineTo(bx, hy + 18);
            ctx.closePath();
            
            const filled = (i < player.health);
            
            ctx.lineWidth = 2;
            if (filled) {
                ctx.strokeStyle = CONFIG.COLORS.ELECTRIC_BLUE;
                ctx.fillStyle = 'rgba(0, 212, 255, 0.8)';
                ctx.shadowColor = CONFIG.COLORS.ELECTRIC_BLUE;
                ctx.shadowBlur = 15;
            } else {
                ctx.strokeStyle = '#333';
                ctx.fillStyle = 'rgba(255, 0, 85, 0.2)';
                ctx.shadowBlur = 0;
            }
            ctx.stroke();
            ctx.fill();
        }

        // --- Center Panel: Score (Hex Container) ---
        const scx = c.width / 2;
        ctx.shadowBlur = 0;
        
        // Hexagon background for score
        ctx.fillStyle = 'rgba(10, 254, 180, 0.1)';
        ctx.strokeStyle = CONFIG.COLORS.GREEN_CIRCUIT;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(scx - 70, 0);
        ctx.lineTo(scx + 70, 0);
        ctx.lineTo(scx + 50, 40);
        ctx.lineTo(scx - 50, 40);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.shadowColor = CONFIG.COLORS.GREEN_CIRCUIT;
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.font = 'bold 20px "Inter", sans-serif';
        // Format score to fixed 6 digits (e.g. 000450)
        ctx.fillText(`DATA. ${player.score.toString().padStart(6, '0')}`, scx, 24);

        // --- Right Panel: Chips & Powerups ---
        const rx = c.width - 20;
        ctx.textAlign = 'right';
        ctx.shadowColor = CONFIG.COLORS.CHIP_GOLD;
        ctx.shadowBlur = 15;
        ctx.fillStyle = CONFIG.COLORS.CHIP_GOLD;
        ctx.font = 'bold 18px monospace';
        ctx.fillText(`⬡ FRAGMENTS: ${player.chips}`, rx, hy + 14);

        // Powerup dynamic badges
        if (player.quantumBoost > 0) {
            ctx.shadowColor = CONFIG.COLORS.POWERUP_SPEED;
            ctx.fillStyle = 'rgba(255, 0, 128, 0.2)';
            ctx.strokeStyle = CONFIG.COLORS.POWERUP_SPEED;
            ctx.beginPath();
            ctx.roundRect(rx - 220, hy + 30, 220, 24, 4);
            ctx.fill(); ctx.stroke();
            
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 12px "Inter", sans-serif';
            const pTime = (player.quantumBoost / 300 * 100).toFixed(0);
            ctx.fillText(`[ ⚡ QUANTUM BOOST ACTIVE ${pTime}% ]`, rx - 10, hy + 46);
        }
        
        if (player.neuralShield > 0) {
            const shieldY = player.quantumBoost > 0 ? hy + 60 : hy + 30;
            ctx.shadowColor = CONFIG.COLORS.NEON_PURPLE;
            ctx.fillStyle = 'rgba(155, 89, 182, 0.2)';
            ctx.strokeStyle = CONFIG.COLORS.NEON_PURPLE;
            ctx.beginPath();
            ctx.roundRect(rx - 230, shieldY, 230, 24, 4);
            ctx.fill(); ctx.stroke();
            
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 12px "Inter", sans-serif';
            const sTime = (player.neuralShield / 600 * 100).toFixed(0);
            ctx.fillText(`[ 🛡 NEURAL SHIELD ACTIVE ${sTime}% ]`, rx - 10, shieldY + 16);
        }

        ctx.restore();
    }

    // --- NOTIFICATIONS ---
    drawNotifications(frames) {
        const ctx = this.ctx, c = this.canvas;
        for (let i = this.notifications.length - 1; i >= 0; i--) {
            const n = this.notifications[i];
            n.timer--;
            if (n.timer <= 0) { this.notifications.splice(i, 1); continue; }
            const alpha = Math.min(1, n.timer / 30);
            const yOff = (1 - n.timer / n.maxTimer) * 30;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = n.color || CONFIG.COLORS.ELECTRIC_BLUE;
            ctx.font = 'bold 20px monospace';
            ctx.textAlign = 'center';
            ctx.shadowColor = n.color || CONFIG.COLORS.ELECTRIC_BLUE;
            ctx.shadowBlur = 15;
            ctx.fillText(n.text, c.width / 2, c.height / 2 - 80 - yOff);
            ctx.restore();
        }
    }

    // --- Death Screen ---
    drawDeath() {
        const ctx = this.ctx, c = this.canvas;
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.fillStyle = CONFIG.COLORS.SPIKE;
        ctx.font = 'bold 36px monospace';
        ctx.textAlign = 'center';
        ctx.shadowColor = CONFIG.COLORS.SPIKE;
        ctx.shadowBlur = 20;
        ctx.fillText('SYSTEM FAILURE', c.width/2, c.height/2 - 20);
        ctx.fillStyle = CONFIG.COLORS.HUD_TEXT;
        ctx.font = '16px monospace';
        ctx.shadowBlur = 0;
        ctx.fillText('Press ENTER to restart', c.width/2, c.height/2 + 30);
        ctx.restore();
    }

    // Mouse tracking for hover effects
    _mouseX = 0; _mouseY = 0;
    trackMouse(x, y) { this._mouseX = x; this._mouseY = y; }
    _mouseInRect(x, y, w, h) {
        return this._mouseX >= x && this._mouseX <= x + w &&
               this._mouseY >= y && this._mouseY <= y + h;
    }

    // --- LORE INTRO SEQUENCE ---
    drawIntroStory(frames) {
        const c = this.canvas, ctx = this.ctx;
        const cx = c.width / 2, cy = c.height / 2;

        ctx.fillStyle = '#02020a';
        ctx.fillRect(0, 0, c.width, c.height);

        // Scanline bg
        ctx.fillStyle = 'rgba(0, 255, 136, 0.05)';
        ctx.fillRect(0, (frames * 4) % c.height, c.width, 10);

        const story = [
            "> SECURE UPLINK ESTABLISHED... 100%",
            "> YEAR: 2026. GLOBAL NETWORKS: OFFLINE.",
            "> CATASTROPHIC ALERT: THE AI OVERMIND HAS SEIZED THE MAINFRAME.",
            "> MAINFRAME COMPROMISED. BLAST DOORS SEALED.",
            "",
            "YOU ARE THE LAST NEURAL-AGENT STILL ONLINE.",
            "YOUR DIRECTIVE: INFILTRATE THE ZONE. HACK THE SECURITY GATES.",
            "PURGE THE AI OVERMIND BEFORE ASSIMILATION IS ABSOLUTE.",
            "",
            "THE FATE OF THE NETWORK LIES IN YOUR HANDS."
        ];

        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        
        // Typing effect math
        const charsToDraw = Math.floor(frames * 0.8);
        let charCount = 0;

        let startY = cy - (story.length * 18);
        for (let i = 0; i < story.length; i++) {
            const line = story[i];
            
            if (charCount >= charsToDraw) break;
            
            const lineLength = line.length;
            const drawLength = Math.min(lineLength, charsToDraw - charCount);
            const textToDraw = line.substring(0, drawLength);
            
            ctx.font = line.startsWith(">") ? 'bold 18px monospace' : 'bold 22px "Inter", sans-serif';
            ctx.fillStyle = line.startsWith(">") ? CONFIG.COLORS.GREEN_CIRCUIT : '#fff';
            if (i >= 5) {
                ctx.shadowColor = CONFIG.COLORS.ELECTRIC_BLUE;
                ctx.shadowBlur = 10;
            } else {
                ctx.shadowBlur = 0;
            }
            
            if (drawLength < lineLength && frames % 3 === 0 && window.sfx && line.startsWith(">")) {
                window.sfx.playHackBeep(); 
            }
            
            if (textToDraw.length > 0) {
                ctx.fillText(textToDraw, cx - 450, startY + (i * 35));
                // Cursor
                if (drawLength < lineLength && frames % 10 < 5) {
                    ctx.fillRect(cx - 440 + ctx.measureText(textToDraw).width, startY + (i*35) - 10, 10, 20);
                }
            }
            
            charCount += lineLength + 15; // pause between lines
        }

        if (frames > 400 || charCount < charsToDraw) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ff0055';
            ctx.fillStyle = (frames % 60 < 30) ? '#ff0055' : 'transparent';
            ctx.font = 'bold 18px "Inter", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText("PRESS [ENTER] TO BREACH SYSTEM", cx, c.height - 80);
        }
    }
}
