// ============================================================
// HACKING.JS - Captcha Mini-Game System for Terminals
// ============================================================

class HackingSystem {
    constructor() {
        this.active = false;
        this.terminal = null;
        this.puzzle = null;
        this.timer = 0;
        this.maxTime = 600; // 10 seconds
        this.result = null; // 'success' | 'fail' | null
        this.resultTimer = 0;
        // Puzzle state
        this.grid = [];
        this.targetPattern = [];
        this.playerPattern = [];
        this.puzzleType = 0;
        this.symbols = ['◆', '▲', '●', '■', '★', '⬡'];
        this.matchTarget = null;
        this.options = [];
        this.selectedOption = -1;
        this.correctOption = -1;
        this.stage = 0; // for multi-stage
        this.stagesNeeded = 3;
    }

    start(terminal) {
        this.active = true;
        this.terminal = terminal;
        this.timer = this.maxTime;
        this.result = null;
        this.stage = 0;
        this.stagesNeeded = 3;
        this._generatePuzzle();
    }

    _generatePuzzle() {
        // Pattern matching puzzle: find the matching symbol
        this.puzzleType = Math.floor(Math.random() * 3);
        if (this.puzzleType === 0) {
            // Match the symbol
            const idx = Math.floor(Math.random() * this.symbols.length);
            this.matchTarget = this.symbols[idx];
            this.options = [];
            this.correctOption = Math.floor(Math.random() * 4);
            for (let i = 0; i < 4; i++) {
                if (i === this.correctOption) {
                    this.options.push(this.matchTarget);
                } else {
                    let s;
                    do { s = this.symbols[Math.floor(Math.random() * this.symbols.length)]; }
                    while (s === this.matchTarget);
                    this.options.push(s);
                }
            }
        } else if (this.puzzleType === 1) {
            // Binary sequence: find the odd one out
            const base = Math.floor(Math.random() * 256).toString(2).padStart(8, '0');
            this.correctOption = Math.floor(Math.random() * 4);
            this.matchTarget = 'Find the different code:';
            this.options = [];
            for (let i = 0; i < 4; i++) {
                if (i === this.correctOption) {
                    // flip one bit intentionally to guarantee difference
                    let arr = base.split('');
                    const flipIdx = Math.floor(Math.random() * 8);
                    arr[flipIdx] = arr[flipIdx] === '0' ? '1' : '0';
                    this.options.push(arr.join(''));
                } else {
                    this.options.push(base);
                }
            }
        } else {
            // Color sequence match
            const colors = ['R', 'G', 'B', 'P'];
            const seq = [];
            for (let i = 0; i < 4; i++) seq.push(colors[Math.floor(Math.random() * colors.length)]);
            this.matchTarget = seq.join(' ');
            this.correctOption = Math.floor(Math.random() * 4);
            this.options = [];
            for (let i = 0; i < 4; i++) {
                if (i === this.correctOption) {
                    this.options.push(seq.join(' '));
                } else {
                    const wrong = [...seq];
                    const wrongIdx = Math.floor(Math.random() * 4);
                    let newColor = colors[Math.floor(Math.random() * colors.length)];
                    while(newColor === wrong[wrongIdx]) {
                        newColor = colors[Math.floor(Math.random() * colors.length)];
                    }
                    wrong[wrongIdx] = newColor;
                    
                    // Also ensure we didn't randomly generate an ALREADY EXISTING wrong option
                    // Though having duplicate wrong options is fine, having a duplicate correct is bad
                    this.options.push(wrong.join(' '));
                }
            }
        }
        this.selectedOption = -1;
    }

    selectOption(idx) {
        if (!this.active || this.result) return;
        this.selectedOption = idx;
        if (idx === this.correctOption) {
            this.stage++;
            if (this.stage >= this.stagesNeeded) {
                this.result = 'success';
                this.resultTimer = 90;
                if (this.terminal) {
                    this.terminal.hacked = true;
                }
            } else {
                this._generatePuzzle();
            }
        } else {
            this.result = 'fail';
            this.resultTimer = 90;
        }
    }

    update() {
        if (!this.active) return;
        if (this.result) {
            this.resultTimer--;
            if (this.resultTimer <= 0) {
                this.active = false;
                if (this.result === 'fail') {
                    this.terminal = null;
                }
            }
            return;
        }
        this.timer--;
        if (this.timer <= 0) {
            this.result = 'fail';
            this.resultTimer = 90;
        }
    }

    draw(ctx, canvas) {
        if (!this.active) return;

        // Overlay
        ctx.save();
        ctx.fillStyle = 'rgba(0, 5, 20, 0.85)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const cx = canvas.width / 2, cy = canvas.height / 2;
        const pw = Math.min(500, canvas.width - 40);
        const ph = 340;
        const px = cx - pw/2, py = cy - ph/2;

        // Panel border
        ctx.strokeStyle = CONFIG.COLORS.ELECTRIC_BLUE;
        ctx.lineWidth = 2;
        ctx.shadowColor = CONFIG.COLORS.ELECTRIC_BLUE;
        ctx.shadowBlur = 15;
        ctx.strokeRect(px, py, pw, ph);
        ctx.shadowBlur = 0;

        // Panel background
        ctx.fillStyle = 'rgba(10, 20, 50, 0.95)';
        ctx.fillRect(px + 1, py + 1, pw - 2, ph - 2);

        // Title
        ctx.fillStyle = CONFIG.COLORS.ELECTRIC_BLUE;
        ctx.font = 'bold 18px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('>>> SYSTEM HACK IN PROGRESS <<<', cx, py + 30);

        // Timer bar
        const barW = pw - 40;
        const barFill = (this.timer / this.maxTime) * barW;
        ctx.fillStyle = '#1a1a3a';
        ctx.fillRect(px + 20, py + 45, barW, 12);
        ctx.fillStyle = this.timer > this.maxTime*0.3 ? CONFIG.COLORS.GREEN_CIRCUIT : CONFIG.COLORS.SPIKE;
        ctx.fillRect(px + 20, py + 45, barFill, 12);

        // Stage indicator
        ctx.fillStyle = CONFIG.COLORS.HUD_TEXT;
        ctx.font = '14px monospace';
        ctx.fillText(`Stage ${this.stage + 1} / ${this.stagesNeeded}`, cx, py + 78);

        if (this.result) {
            ctx.font = 'bold 28px monospace';
            ctx.fillStyle = this.result === 'success' ? CONFIG.COLORS.GREEN_CIRCUIT : CONFIG.COLORS.SPIKE;
            ctx.fillText(this.result === 'success' ? 'ACCESS GRANTED' : 'ACCESS DENIED', cx, cy + 10);
        } else {
            // Puzzle prompt
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 16px monospace';
            const prompt = this.puzzleType === 0 ? `Match this symbol: ${this.matchTarget}` : this.matchTarget;
            ctx.fillText(prompt, cx, py + 110);

            // Options (1-4 keys)
            const optW = 100, optH = 50, gap = 15;
            const totalW = this.options.length * optW + (this.options.length-1) * gap;
            const startX = cx - totalW/2;
            for (let i = 0; i < this.options.length; i++) {
                const ox = startX + i * (optW + gap);
                const oy = py + 140;
                const hover = this.selectedOption === i;
                ctx.strokeStyle = hover ? CONFIG.COLORS.GREEN_CIRCUIT : CONFIG.COLORS.ELECTRIC_BLUE;
                ctx.lineWidth = hover ? 3 : 1;
                ctx.strokeRect(ox, oy, optW, optH);
                ctx.fillStyle = 'rgba(0,30,60,0.8)';
                ctx.fillRect(ox+1, oy+1, optW-2, optH-2);
                // Key label
                ctx.fillStyle = '#888';
                ctx.font = '12px monospace';
                ctx.fillText(`[${i+1}]`, ox + optW/2, oy + 14);
                // Option text
                ctx.fillStyle = '#fff';
                ctx.font = this.puzzleType === 1 ? '12px monospace' : 'bold 22px monospace';
                ctx.fillText(this.options[i], ox + optW/2, oy + 36);
            }

            // Instructions
            ctx.fillStyle = '#666';
            ctx.font = '12px monospace';
            ctx.fillText('Press 1-4 to select  |  ESC to cancel', cx, py + ph - 20);
        }
        ctx.restore();
    }
}
