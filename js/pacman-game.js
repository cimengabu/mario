// Pacman Game - Improved Version dengan Sound & Collision Fix

class PacmanScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PacmanScene' });
        this.TILE_SIZE = 30;
        this.COLS = 25;
        this.ROWS = 21;
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.pelletsRemaining = 0;
        
        // Movement speed (slower like classic pacman)
        this.PACMAN_MOVE_DELAY = 6; // Game ticks per move
        this.GHOST_BASE_DELAY = 10; // Ghost slower too
        this.pacmanMoveCounter = 0;
    }

    preload() {}

    create() {
        this.cameras.main.setBackgroundColor('#0a0e27');

        // Create maze
        this.createMaze();
        
        // Create pacman
        this.createPacman();

        // Create ghosts
        this.createGhosts();

        // Create pellets
        this.createPellets();

        // Create power-ups
        this.createPowerUps();

        // Sound setup
        this.createSounds();

        // Input
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keys = this.input.keyboard.addKeys('W,A,S,D');
        this.nextDirection = null;
        this.currentDirection = 0;

        // UI
        this.updateUI();

        // Ghost movement timer
        this.ghostMoveCounter = 0;
        this.ghostMoveDelay = this.GHOST_BASE_DELAY - this.level;
        if (this.ghostMoveDelay < 5) this.ghostMoveDelay = 5;

        // Pacman animation
        this.pacmanMouthOpen = true;
        this.mouthAnimCounter = 0;

        // Game state
        this.gameOverFlag = false;
    }

    createSounds() {
        // Pacman wake sound generator
        this.soundWake = null;
        this.soundDeath = null;
        this.soundEat = null;
        this.soundPowerup = null;
        
        // Create basic sounds using Phaser
        const config = this.sound.config;
    }

    playWakeSound() {
        if (!this.sound.isLocked) {
            // Waka waka sound (high freq pulse)
            const now = this.time.now;
            if (!this.lastWakeSound || now - this.lastWakeSound > 200) {
                this.makeBeep(800, 100, 0.1);
                this.lastWakeSound = now;
            }
        }
    }

    playEatSound() {
        if (!this.sound.isLocked) {
            const now = this.time.now;
            if (!this.lastEatSound || now - this.lastEatSound > 150) {
                this.makeBeep(400, 50, 0.15);
                this.lastEatSound = now;
            }
        }
    }

    playPowerupSound() {
        this.makeBeep(1000, 200, 0.2);
    }

    playDeathSound() {
        // Descending tones for death
        this.makeBeep(800, 100, 0.2);
        this.time.delayedCall(100, () => {
            this.makeBeep(600, 100, 0.2);
            this.time.delayedCall(100, () => {
                this.makeBeep(400, 200, 0.2);
            });
        });
    }

    makeBeep(frequency, duration, volume) {
        try {
            if (this.sound.context) {
                const osc = this.sound.context.createOscillator();
                const gain = this.sound.context.createGain();
                
                osc.connect(gain);
                gain.connect(this.sound.context.destination);
                
                osc.frequency.value = frequency;
                gain.gain.setValueAtTime(volume, this.sound.context.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, this.sound.context.currentTime + duration / 1000);
                
                osc.start(this.sound.context.currentTime);
                osc.stop(this.sound.context.currentTime + duration / 1000);
            }
        } catch (e) {
            // Sound tidak tersedia, lanjut tanpa error
        }
    }

    createMaze() {
        this.maze = [];
        this.wallsGroup = this.add.group();

        const mazePattern = [
            '█████████████████████████',
            '█ ░░░░░░░░░░░░░░░░░░░░░░█',
            '█ █ █ █ █ █ █ █ █ █ █ █ █',
            '█ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ █',
            '█ █ █ █ █ █ █ █ █ █ █ █ █',
            '█ ░░░░░░░░░░░░░░░░░░░░░░█',
            '█ █ █ █ █████████████ █ █ █',
            '█ ░ ░ ░ ░     ░░░     ░ ░ █',
            '█ █ █ █ █████ ███ █████ █ █',
            '█ ░░░░░░░░░░░░░░░░░░░░░░█',
            '███████ █ █████ █████ █████',
            '█ ░░░░░ ░ ░ ░░░░░░░ ░ ░░░░█',
            '█ █████ █ █ █████████ █ ███',
            '█ ░ ░ ░ ░ ░ ░░░░░░░░░ ░ ░░█',
            '█ █ █ █ █ █ █████████ █ ███',
            '█ ░░░░░░░░░░░░░░░░░░░░░░░░█',
            '█ █ █ █ █ █ █ █ █ █ █ █ █ █',
            '█ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ ░ █',
            '█ █ █ █ █ █ █ █ █ █ █ █ █ █',
            '█ ░░░░░░░░░░░░░░░░░░░░░░░░█',
            '█████████████████████████'
        ];

        for (let row = 0; row < mazePattern.length; row++) {
            this.maze[row] = [];
            for (let col = 0; col < mazePattern[row].length; col++) {
                const char = mazePattern[row][col];
                const x = col * this.TILE_SIZE + this.TILE_SIZE / 2;
                const y = row * this.TILE_SIZE + this.TILE_SIZE / 2;

                if (char === '█') {
                    this.maze[row][col] = 'wall';
                    const wall = this.add.rectangle(x, y, this.TILE_SIZE, this.TILE_SIZE, 0x0066FF);
                    wall.setStrokeStyle(1, 0x00FFFF);
                } else {
                    this.maze[row][col] = 'empty';
                }
            }
        }

        this.WORLD_WIDTH = this.COLS * this.TILE_SIZE;
        this.WORLD_HEIGHT = this.ROWS * this.TILE_SIZE;
    }

    createPacman() {
        this.pacman = {
            col: 12,
            row: 15,
            direction: 0, // 0=right, 1=left, 2=up, 3=down
            nextDirection: 0,
            sprite: this.add.graphics()
        };
        this.drawPacman();
    }

    drawPacman() {
        const x = this.pacman.col * this.TILE_SIZE + this.TILE_SIZE / 2;
        const y = this.pacman.row * this.TILE_SIZE + this.TILE_SIZE / 2;

        this.pacman.sprite.clear();
        this.pacman.sprite.fillStyle(0xFFD700, 1);
        
        let startAngle, endAngle;
        const radius = 12;
        
        if (this.pacmanMouthOpen) {
            startAngle = this.pacman.direction * Math.PI / 2;
            endAngle = startAngle + Math.PI * 1.5;
        } else {
            startAngle = 0;
            endAngle = Math.PI * 2;
        }

        // Draw pacman circle with mouth
        this.pacman.sprite.beginPath();
        this.pacman.sprite.arc(x, y, radius, startAngle, endAngle, false);
        this.pacman.sprite.lineTo(x, y);
        this.pacman.sprite.closePath();
        this.pacman.sprite.fillPath();

        // Eye
        this.pacman.sprite.fillStyle(0x000000, 1);
        const eyeDistance = 6;
        const eyeX = x + Math.cos(this.pacman.direction * Math.PI / 2) * eyeDistance;
        const eyeY = y + Math.sin(this.pacman.direction * Math.PI / 2) * eyeDistance;
        this.pacman.sprite.fillCircle(eyeX, eyeY, 2);
    }

    createGhosts() {
        this.ghosts = [];
        const ghostColors = [0xFF0000, 0xFFB8FF, 0x00FFFF, 0xFFBA55];
        const ghostStartPos = [
            { col: 11, row: 9 },
            { col: 12, row: 9 },
            { col: 11, row: 10 },
            { col: 12, row: 10 }
        ];

        for (let i = 0; i < Math.min(2 + this.level, 4); i++) {
            const pos = ghostStartPos[i] || { col: 12, row: 9 };
            this.ghosts.push({
                col: pos.col,
                row: pos.row,
                color: ghostColors[i],
                direction: Math.floor(Math.random() * 4),
                sprite: this.add.graphics(),
                moveCounter: 0,
                isBlue: false
            });
        }
        this.drawGhosts();
    }

    drawGhosts() {
        this.ghosts.forEach(ghost => {
            const x = ghost.col * this.TILE_SIZE + this.TILE_SIZE / 2;
            const y = ghost.row * this.TILE_SIZE + this.TILE_SIZE / 2;

            ghost.sprite.clear();
            const color = ghost.isBlue ? 0x0066FF : ghost.color;
            ghost.sprite.fillStyle(color, 1);

            // Body
            ghost.sprite.fillRect(x - 12, y - 10, 24, 16);
            ghost.sprite.fillCircle(x, y - 10, 12);

            // Eyes
            ghost.sprite.fillStyle(0xFFFFFF, 1);
            ghost.sprite.fillCircle(x - 5, y - 10, 3);
            ghost.sprite.fillCircle(x + 5, y - 10, 3);
            ghost.sprite.fillStyle(0x000000, 1);
            ghost.sprite.fillCircle(x - 5, y - 10, 1.5);
            ghost.sprite.fillCircle(x + 5, y - 10, 1.5);

            // Mouth
            ghost.sprite.lineStyle(2, color, 1);
            ghost.sprite.beginPath();
            ghost.sprite.moveTo(x - 8, y + 2);
            ghost.sprite.lineTo(x - 4, y + 4);
            ghost.sprite.lineTo(x, y + 2);
            ghost.sprite.lineTo(x + 4, y + 4);
            ghost.sprite.lineTo(x + 8, y + 2);
            ghost.sprite.stroke();
        });
    }

    createPellets() {
        this.pellets = [];
        this.pelletsGroup = this.add.group();
        
        for (let row = 1; row < this.ROWS - 1; row++) {
            for (let col = 1; col < this.COLS - 1; col++) {
                if (this.maze[row][col] !== 'wall') {
                    // Jangan buat pellet di starting area
                    if (!((row >= 8 && row <= 11) && (col >= 10 && col <= 14))) {
                        this.pellets.push({ col, row, type: 'normal' });
                        const x = col * this.TILE_SIZE + this.TILE_SIZE / 2;
                        const y = row * this.TILE_SIZE + this.TILE_SIZE / 2;
                        const pellet = this.add.circle(x, y, 2, 0xFFFF99);
                        this.pelletsGroup.add(pellet);
                    }
                }
            }
        }
        this.pelletsRemaining = this.pellets.length;

        // Power-ups di sudut
        const powerupPositions = [
            { col: 1, row: 1 },
            { col: this.COLS - 2, row: 1 },
            { col: 1, row: this.ROWS - 2 },
            { col: this.COLS - 2, row: this.ROWS - 2 }
        ];

        this.powerups = [];
        powerupPositions.forEach(pos => {
            this.powerups.push({ col: pos.col, row: pos.row, type: 'power', active: true });
        });
    }

    createPowerUps() {
        this.powerupGroup = this.add.group();
        this.powerups.forEach(powerup => {
            if (powerup.active) {
                const x = powerup.col * this.TILE_SIZE + this.TILE_SIZE / 2;
                const y = powerup.row * this.TILE_SIZE + this.TILE_SIZE / 2;
                const circle = this.add.circle(x, y, 5, 0xFF00FF);
                this.powerupGroup.add(circle);
            }
        });
    }

    updateUI() {
        if (this.uiText) this.uiText.destroy();
        if (this.livesText) this.livesText.destroy();
        if (this.levelText) this.levelText.destroy();
        if (this.pelletsText) this.pelletsText.destroy();

        this.uiText = this.add.text(10, 10, `Skor: ${this.score}`, {
            fontSize: '18px',
            fill: '#FFD700',
            fontStyle: 'bold',
            shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 3, fill: true }
        });

        this.livesText = this.add.text(10, 35, `❤️ ${this.lives}`, {
            fontSize: '18px',
            fill: '#FF0000',
            fontStyle: 'bold',
            shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 3, fill: true }
        });

        this.levelText = this.add.text(10, 60, `Level: ${this.level}`, {
            fontSize: '16px',
            fill: '#00FF00',
            fontStyle: 'bold',
            shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 3, fill: true }
        });

        this.pelletsText = this.add.text(this.WORLD_WIDTH - 150, 10, `Pellets: ${this.pelletsRemaining}`, {
            fontSize: '16px',
            fill: '#FFFF99',
            shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 3, fill: true }
        });

        this.uiText.setScrollFactor(0);
        this.livesText.setScrollFactor(0);
        this.levelText.setScrollFactor(0);
        this.pelletsText.setScrollFactor(0);
    }

    canMoveTo(col, row) {
        // STRICT collision check - TIDAK BOLEH TEMBUS WALL
        if (row < 0 || row >= this.maze.length) return false;
        if (col < 0 || col >= this.maze[0].length) return false;
        if (this.maze[row][col] === 'wall') return false;
        return true;
    }

    movePacman() {
        // Get input
        if (this.cursors.right.isDown || this.keys.D.isDown) {
            this.nextDirection = 0;
        } else if (this.cursors.left.isDown || this.keys.A.isDown) {
            this.nextDirection = 1;
        } else if (this.cursors.up.isDown || this.keys.W.isDown) {
            this.nextDirection = 2;
        } else if (this.cursors.down.isDown || this.keys.S.isDown) {
            this.nextDirection = 3;
        }

        // Calculate move
        let dx = 0, dy = 0;

        // Try next direction first
        if (this.nextDirection === 0) dx = 1;           // right
        else if (this.nextDirection === 1) dx = -1;     // left
        else if (this.nextDirection === 2) dy = -1;     // up
        else if (this.nextDirection === 3) dy = 1;      // down

        // Check if can move in next direction
        const nextCol = this.pacman.col + dx;
        const nextRow = this.pacman.row + dy;

        if (this.canMoveTo(nextCol, nextRow)) {
            // Can move in next direction
            this.pacman.col = nextCol;
            this.pacman.row = nextRow;
            this.pacman.direction = this.nextDirection;
            this.currentDirection = this.nextDirection;
            this.playWakeSound();
        } else {
            // Try to continue current direction
            dx = 0;
            dy = 0;

            if (this.currentDirection === 0) dx = 1;
            else if (this.currentDirection === 1) dx = -1;
            else if (this.currentDirection === 2) dy = -1;
            else if (this.currentDirection === 3) dy = 1;

            const currentNextCol = this.pacman.col + dx;
            const currentNextRow = this.pacman.row + dy;

            if (this.canMoveTo(currentNextCol, currentNextRow)) {
                this.pacman.col = currentNextCol;
                this.pacman.row = currentNextRow;
                this.playWakeSound();
            }
        }

        // Check pellet
        this.checkPelletCollision();

        // Check powerup
        this.checkPowerupCollision();
    }

    checkPelletCollision() {
        for (let i = 0; i < this.pellets.length; i++) {
            if (this.pellets[i].col === this.pacman.col && this.pellets[i].row === this.pacman.row) {
                this.score += 10;
                this.pelletsRemaining--;
                this.pellets.splice(i, 1);
                this.pelletsGroup.children.entries[i]?.destroy();
                this.playEatSound();

                if (this.pelletsRemaining === 0) {
                    this.levelUp();
                }
                break;
            }
        }
    }

    checkPowerupCollision() {
        this.powerups.forEach((powerup, idx) => {
            if (powerup.active && powerup.col === this.pacman.col && powerup.row === this.pacman.row) {
                this.score += 50;
                powerup.active = false;
                this.powerupGroup.children.entries[idx]?.destroy();
                this.playPowerupSound();

                // Blue ghosts
                this.ghosts.forEach(ghost => {
                    ghost.isBlue = true;
                });

                // Unblue after 7 seconds
                this.time.delayedCall(7000, () => {
                    this.ghosts.forEach(ghost => {
                        ghost.isBlue = false;
                    });
                });
            }
        });
    }

    moveGhosts() {
        this.ghosts.forEach(ghost => {
            ghost.moveCounter++;
            if (ghost.moveCounter < this.ghostMoveDelay) return;
            ghost.moveCounter = 0;

            if (ghost.isBlue) {
                // Run away from pacman
                this.runAway(ghost);
            } else {
                // Chase pacman
                this.chaseTarget(ghost, this.pacman.col, this.pacman.row);
            }
        });
    }

    chaseTarget(ghost, targetCol, targetRow) {
        const directions = [
            { dir: 0, dx: 1, dy: 0 },    // right
            { dir: 1, dx: -1, dy: 0 },   // left
            { dir: 2, dx: 0, dy: -1 },   // up
            { dir: 3, dx: 0, dy: 1 }     // down
        ];
        
        let bestDir = ghost.direction;
        let bestDistance = Math.abs(ghost.col - targetCol) + Math.abs(ghost.row - targetRow);

        directions.forEach(d => {
            const newCol = ghost.col + d.dx;
            const newRow = ghost.row + d.dy;

            if (this.canMoveTo(newCol, newRow)) {
                const distance = Math.abs(newCol - targetCol) + Math.abs(newRow - targetRow);
                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestDir = d.dir;
                }
            }
        });

        let dx = 0, dy = 0;
        if (bestDir === 0) dx = 1;
        else if (bestDir === 1) dx = -1;
        else if (bestDir === 2) dy = -1;
        else if (bestDir === 3) dy = 1;

        ghost.col += dx;
        ghost.row += dy;
        ghost.direction = bestDir;
    }

    runAway(ghost) {
        const directions = [
            { dir: 0, dx: 1, dy: 0 },    // right
            { dir: 1, dx: -1, dy: 0 },   // left
            { dir: 2, dx: 0, dy: -1 },   // up
            { dir: 3, dx: 0, dy: 1 }     // down
        ];
        
        let bestDir = ghost.direction;
        let maxDistance = 0;

        directions.forEach(d => {
            const newCol = ghost.col + d.dx;
            const newRow = ghost.row + d.dy;

            if (this.canMoveTo(newCol, newRow)) {
                const distance = Math.abs(newCol - this.pacman.col) + Math.abs(newRow - this.pacman.row);
                if (distance > maxDistance) {
                    maxDistance = distance;
                    bestDir = d.dir;
                }
            }
        });

        let dx = 0, dy = 0;
        if (bestDir === 0) dx = 1;
        else if (bestDir === 1) dx = -1;
        else if (bestDir === 2) dy = -1;
        else if (bestDir === 3) dy = 1;

        ghost.col += dx;
        ghost.row += dy;
        ghost.direction = bestDir;
    }

    checkGhostCollision() {
        this.ghosts.forEach(ghost => {
            if (ghost.col === this.pacman.col && ghost.row === this.pacman.row) {
                if (ghost.isBlue) {
                    this.score += 200;
                    ghost.col = 12;
                    ghost.row = 9;
                } else {
                    this.loseLife();
                }
            }
        });
    }

    loseLife() {
        this.lives--;
        this.updateUI();
        this.playDeathSound();

        if (this.lives <= 0) {
            this.gameOver();
        } else {
            // Reset positions
            this.pacman.col = 12;
            this.pacman.row = 15;
            this.ghosts.forEach(ghost => {
                ghost.col = 12;
                ghost.row = 9;
            });
        }
    }

    levelUp() {
        this.level++;
        this.ghostMoveDelay = this.GHOST_BASE_DELAY - this.level;
        if (this.ghostMoveDelay < 5) this.ghostMoveDelay = 5;

        // Reset game
        this.pacman.col = 12;
        this.pacman.row = 15;
        this.createGhosts();
        this.createPellets();
        this.createPowerUps();
        this.updateUI();

        // Show level up message
        const levelText = this.add.text(this.WORLD_WIDTH / 2, this.WORLD_HEIGHT / 2, `LEVEL ${this.level}!`, {
            fontSize: '40px',
            fill: '#FFD700',
            fontStyle: 'bold',
            align: 'center'
        });
        levelText.setOrigin(0.5);

        this.time.delayedCall(1500, () => {
            levelText.destroy();
        });
    }

    gameOver() {
        this.gameOverFlag = true;

        const gameOverText = this.add.text(this.WORLD_WIDTH / 2, this.WORLD_HEIGHT / 2 - 40, 'GAME OVER!', {
            fontSize: '50px',
            fill: '#FF0000',
            fontStyle: 'bold',
            align: 'center',
            shadow: { offsetX: 3, offsetY: 3, color: '#000', blur: 5, fill: true }
        });
        gameOverText.setOrigin(0.5);

        const finalScoreText = this.add.text(this.WORLD_WIDTH / 2, this.WORLD_HEIGHT / 2 + 30, `Skor Akhir: ${this.score}`, {
            fontSize: '28px',
            fill: '#FFD700',
            align: 'center'
        });
        finalScoreText.setOrigin(0.5);

        const restartText = this.add.text(this.WORLD_WIDTH / 2, this.WORLD_HEIGHT / 2 + 80, 'Tekan R untuk Restart', {
            fontSize: '20px',
            fill: '#00FF00',
            align: 'center'
        });
        restartText.setOrigin(0.5);

        this.input.keyboard.on('keydown-R', () => {
            this.scene.restart();
        });
    }

    update() {
        if (this.gameOverFlag) return;

        // Pacman mouth animation
        this.mouthAnimCounter++;
        if (this.mouthAnimCounter > 25) {
            this.pacmanMouthOpen = !this.pacmanMouthOpen;
            this.mouthAnimCounter = 0;
        }

        // Pacman movement dengan speed control
        this.pacmanMoveCounter++;
        if (this.pacmanMoveCounter >= this.PACMAN_MOVE_DELAY) {
            this.pacmanMoveCounter = 0;
            this.movePacman();
        }

        // Move ghosts
        this.moveGhosts();

        // Check collisions
        this.checkGhostCollision();

        // Draw
        this.drawPacman();
        this.drawGhosts();

        // Update UI
        this.pelletsText?.setText(`Pellets: ${this.pelletsRemaining}`);
    }
}

// Phaser Game Configuration
const config = {
    type: Phaser.AUTO,
    width: 750,
    height: 630,
    parent: 'game',
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    },
    scene: [PacmanScene],
    render: {
        pixelArt: false,
        antialias: true
    },
    audio: {
        disableWebAudio: false
    }
};

const game = new Phaser.Game(config);
