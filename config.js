// ============================================================
// CONFIG.JS - Game Constants & Configuration
// CompSoc Defender: 80 Years of Innovation
// ============================================================

const CONFIG = {
    // --- Canvas & World ---
    TILE: 40,
    LEVEL_WIDTH: 8000,
    LEVEL_HEIGHT: 800,

    // --- Physics (Snappier, improved feel) ---
    GRAVITY: 0.65,
    JUMP_FORCE: -13.5,
    JUMP_HOLD_FORCE: -0.6,    // extra upward force while holding jump (snappier curve)
    MAX_JUMP_HOLD: 14,         // frames you can hold jump
    PLAYER_SPEED: 4.8,
    MAX_FALL_SPEED: 14,

    // --- Wall Mechanics ---
    WALL_SLIDE_SPEED: 1.8,
    WALL_JUMP_FORCE_X: 7,
    WALL_JUMP_FORCE_Y: -11,
    WALL_JUMP_CONTROL_DELAY: 8, // frames before player regains full control

    // --- Grapple / Throw ---
    GRAPPLE_SPEED: 10,
    GRAPPLE_RANGE: 280,
    GRAPPLE_HOOK_SPEED: 16,
    MISSILE_THROW_SPEED: 12,

    // --- Antigravity ---
    ANTIGRAVITY_SPEED: 6,
    ANTIGRAVITY_ACCEL: 0.5,
    ANTIGRAVITY_FRICTION: 0.9,

    // --- Powerups ---
    QUANTUM_BOOST_DURATION: 300,
    QUANTUM_BOOST_SPEED: 7.5,
    SHIELD_DURATION: 300,

    // --- Enemies ---
    PATROL_SPEED: 1.5,
    TURRET_FIRE_INTERVAL: 120,  // frames between shots
    PROJECTILE_SPEED: 4,

    // --- Camera ---
    CAM_LEAD_X: 0.35,
    CAM_LEAD_Y: 0.4,
    CAM_SMOOTH: 0.08,

    // --- Colors ---
    COLORS: {
        NEON_PURPLE: '#b829dd',
        ELECTRIC_BLUE: '#00d4ff',
        GREEN_CIRCUIT: '#00ff88',
        DARK_BG: '#0a0e27',
        DARK_BG2: '#0d1233',
        PLATFORM: '#1a1e3a',
        PLATFORM_TOP: '#2a3060',
        PLATFORM_GLOW: 'rgba(0, 212, 255, 0.15)',
        GRAPPLE_BLOCK: '#9b59b6',
        GRAPPLE_GLOW: 'rgba(155, 89, 182, 0.4)',
        SPIKE: '#ff3355',
        SPIKE_GLOW: 'rgba(255, 51, 85, 0.3)',
        CHIP_GOLD: '#ffd700',
        CHIP_GLOW: 'rgba(255, 215, 0, 0.35)',
        TERMINAL: '#00aaff',
        TERMINAL_GLOW: 'rgba(0, 170, 255, 0.3)',
        POWERUP_SPEED: '#55ff88',
        POWERUP_SHIELD: '#338855',
        ENEMY_RED: '#ff4444',
        ENEMY_BROWN: '#8B5E3C',
        PROJECTILE: '#ff6600',
        HUD_BG: 'rgba(10, 14, 39, 0.7)',
        HUD_TEXT: '#e0e0ff',
        GRAPPLE_LINE: '#b829dd',
    },

    // --- Game States ---
    STATES: {
        MENU: 'menu',
        INTRO: 'intro',
        CONTROLS: 'controls',
        CREDITS: 'credits',
        PLAYING: 'playing',
        HACKING: 'hacking',
        PAUSED: 'paused',
        BOSS_TRANSITION: 'boss_transition',
        BOSS_FIGHT: 'boss_fight',
        DEATH: 'death',
        VICTORY: 'victory',
    }
};
