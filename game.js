const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const hudCoins = document.getElementById('coin-score');
const hudPoints = document.getElementById('points');
const mainMenu = document.getElementById('main-menu');
const gameOverScreen = document.getElementById('game-over');
const gameWinScreen = document.getElementById('game-win');
const finalCoins = document.getElementById('final-coins');
const finalScore = document.getElementById('final-score');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const winBtn = document.getElementById('win-btn');

// Audio Context
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    let time = audioCtx.currentTime;
    if (type === 'jump') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(300, time + 0.1);
        gain.gain.setValueAtTime(0.1, time);
        gain.gain.linearRampToValueAtTime(0, time + 0.1);
        osc.start(time);
        osc.stop(time + 0.1);
    } else if (type === 'coin') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(987.77, time); // B5
        osc.frequency.setValueAtTime(1318.51, time + 0.1); // E6
        gain.gain.setValueAtTime(0.2, time);
        gain.gain.linearRampToValueAtTime(0, time + 0.3);
        osc.start(time);
        osc.stop(time + 0.3);
    } else if (type === 'stomp') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, time);
        osc.frequency.exponentialRampToValueAtTime(50, time + 0.1);
        gain.gain.setValueAtTime(0.2, time);
        gain.gain.linearRampToValueAtTime(0, time + 0.1);
        osc.start(time);
        osc.stop(time + 0.1);
    } else if (type === 'die') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(300, time);
        osc.frequency.exponentialRampToValueAtTime(50, time + 0.5);
        gain.gain.setValueAtTime(0.3, time);
        gain.gain.linearRampToValueAtTime(0, time + 0.5);
        osc.start(time);
        osc.stop(time + 0.5);
    } else if (type === 'win') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, time);
        osc.frequency.setValueAtTime(554, time + 0.2);
        osc.frequency.setValueAtTime(659, time + 0.4);
        osc.frequency.setValueAtTime(880, time + 0.6);
        gain.gain.setValueAtTime(0.3, time);
        gain.gain.linearRampToValueAtTime(0, time + 1);
        osc.start(time);
        osc.stop(time + 1);
    }
}

// Global Variables
let gameLoop;
let isPlaying = false;
let scrollOffset = 0;
let keys = { right: false, left: false, up: false };
let gravity = 0.8;
let coinsCollected = 0;
let points = 0;
let levelComplete = 0;

// Resize
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// Input Listeners
window.addEventListener('keydown', (e) => {
    if (levelComplete > 0) return;
    if (e.code === 'KeyD' || e.code === 'ArrowRight') keys.right = true;
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') keys.left = true;
    if (e.code === 'KeyW' || e.code === 'ArrowUp' || e.code === 'Space') {
        if (!keys.up && player && player.jumps < player.maxJumps) {
            player.dy = -15;
            player.grounded = false;
            player.jumps++;
            playSound('jump');
        }
        keys.up = true;
    }
});
window.addEventListener('keyup', (e) => {
    if (levelComplete > 0) return;
    if (e.code === 'KeyD' || e.code === 'ArrowRight') keys.right = false;
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') keys.left = false;
    if (e.code === 'KeyW' || e.code === 'ArrowUp' || e.code === 'Space') keys.up = false;
});

// Classes
class Player {
    constructor() {
        this.width = 40;
        this.height = 40;
        this.x = 100;
        this.y = 100;
        this.dx = 0;
        this.dy = 0;
        this.speed = 5;
        this.grounded = false;
        this.emoji = '👨🏻‍🔧';
        this.facingRight = true;
        this.jumps = 0;
        this.maxJumps = 2;
    }
    update() {
        if (keys.right) {
            this.dx = this.speed;
            this.facingRight = true;
        } else if (keys.left) {
            this.dx = -this.speed;
            this.facingRight = false;
        } else {
            this.dx = 0;
        }
        
        this.dy += gravity;
        
        // Prevent falling through map floor if completely missed platform (safety net)
        if (this.y > canvas.height + 100) {
            die();
        }
    }
    draw() {
        ctx.save();
        ctx.font = "40px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        // Flip horizontally if facing left
        if (!this.facingRight) {
            ctx.translate(this.x + this.width/2, this.y + this.height/2);
            ctx.scale(-1, 1);
            ctx.fillText(this.emoji, 0, 0);
        } else {
            ctx.fillText(this.emoji, this.x + this.width/2, this.y + this.height/2);
        }
        ctx.restore();
    }
}

class Platform {
    constructor(x, y, width, height, type = 'ground') {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.type = type;
    }
    draw() {
        if (this.type === 'ground') {
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.fillStyle = '#228B22';
            ctx.fillRect(this.x, this.y, this.width, 15); // Grass top
        } else if (this.type === 'block') {
            ctx.fillStyle = '#CD853F'; // brick color
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.strokeStyle = '#8B4513';
            ctx.lineWidth = 2;
            ctx.strokeRect(this.x, this.y, this.width, this.height);
        } else if (this.type === 'flag') {
            ctx.fillStyle = '#BDC3C7';
            ctx.fillRect(this.x, this.y, 5, this.height); // pole
            ctx.fillStyle = '#E74C3C';
            ctx.beginPath();
            ctx.moveTo(this.x + 5, this.y);
            ctx.lineTo(this.x + 45, this.y + 15);
            ctx.lineTo(this.x + 5, this.y + 30);
            ctx.fill();
        } else if (this.type === 'castle') {
            ctx.fillStyle = '#C0392B';
            ctx.fillRect(this.x, this.y, this.width, this.height);
            // Door
            ctx.fillStyle = '#000';
            ctx.fillRect(this.x + this.width/2 - 20, this.y + this.height - 60, 40, 60);
            ctx.beginPath();
            ctx.arc(this.x + this.width/2, this.y + this.height - 60, 20, Math.PI, 0);
            ctx.fill();
            // Roof
            ctx.fillStyle = '#C0392B';
            for(let i=0; i<3; i++) {
                ctx.fillRect(this.x + i*50 + 15, this.y - 20, 20, 20);
            }
        }
    }
}

class Enemy {
    constructor(x, y) {
        this.width = 35;
        this.height = 35;
        this.x = x;
        this.y = y;
        this.dx = -1; // moves left initially
        this.dy = 0;
        this.emoji = Math.random() > 0.5 ? '🍄' : '🐢';
        this.dead = false;
    }
    update() {
        this.dy += gravity;
        this.x += this.dx;
    }
    draw() {
        if (this.dead) return;
        ctx.font = "35px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(this.emoji, this.x + this.width/2, this.y + this.height/2);
    }
}

class Coin {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.collected = false;
        this.startY = y;
        this.bounce = 0;
    }
    update() {
        this.bounce += 0.1;
        this.y = this.startY + Math.sin(this.bounce) * 5;
    }
    draw() {
        if (this.collected) return;
        ctx.font = "30px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText('🟡', this.x + this.width/2, this.y + this.height/2);
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.radius = Math.random() * 4 + 2;
        this.dx = (Math.random() - 0.5) * 10;
        this.dy = (Math.random() - 0.5) * 10;
        this.color = color;
        this.life = 1;
    }
    update() {
        this.x += this.dx;
        this.y += this.dy;
        this.life -= 0.03;
    }
    draw() {
        if (this.life <= 0) return;
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.restore();
    }
}

let player;
let platforms = [];
let enemies = [];
let coins = [];
let particles = [];
let castle;

function init() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    resize();
    player = new Player();
    scrollOffset = 0;
    coinsCollected = 0;
    points = 0;
    levelComplete = 0;
    hudCoins.innerText = coinsCollected;
    hudPoints.innerText = points;
    
    // Level Generation
    platforms = [];
    enemies = [];
    coins = [];
    particles = [];
    
    let groundY = canvas.height - 100;
    
    // Main ground patches (with smaller gaps)
    platforms.push(new Platform(-100, groundY, 800, 200, 'ground'));
    platforms.push(new Platform(800, groundY, 600, 200, 'ground')); // gap 100
    platforms.push(new Platform(1520, groundY, 1000, 200, 'ground')); // gap 120
    platforms.push(new Platform(2620, groundY, 1500, 200, 'ground')); // gap 100
    
    // Floating Blocks and items
    platforms.push(new Platform(400, groundY - 120, 50, 50, 'block'));
    platforms.push(new Platform(450, groundY - 120, 50, 50, 'block'));
    coins.push(new Coin(410, groundY - 170));
    coins.push(new Coin(460, groundY - 170));
    
    platforms.push(new Platform(1100, groundY - 150, 150, 50, 'block'));
    coins.push(new Coin(1150, groundY - 200));
    
    platforms.push(new Platform(2000, groundY - 100, 50, 50, 'block'));
    platforms.push(new Platform(2150, groundY - 200, 50, 50, 'block'));
    platforms.push(new Platform(2300, groundY - 100, 50, 50, 'block'));
    
    coins.push(new Coin(2010, groundY - 150));
    coins.push(new Coin(2160, groundY - 250));
    coins.push(new Coin(2310, groundY - 150));
    
    // More random coins and enemies
    for(let i=0; i<8; i++) {
        let ex = 600 + Math.random() * 3200;
        enemies.push(new Enemy(ex, groundY - 35)); // Spawn directly on the ground
        
        let cx = 500 + Math.random() * 3200;
        coins.push(new Coin(cx, groundY - 80 - Math.random()*150));
    }
    
    // Castle at the end
    castle = new Platform(3800, groundY - 150, 150, 150, 'castle');
    platforms.push(castle);

    isPlaying = true;
    mainMenu.classList.remove('active');
    gameOverScreen.classList.remove('active');
    gameWinScreen.classList.remove('active');
    
    animate();
}

function createExplosion(x, y, color, count=10) {
    for(let i=0; i<count; i++) {
        particles.push(new Particle(x, y, color));
    }
}

function die() {
    isPlaying = false;
    playSound('die');
    cancelAnimationFrame(gameLoop);
    finalCoins.innerText = coinsCollected;
    finalScore.innerText = points;
    gameOverScreen.classList.add('active');
}

function win() {
    isPlaying = false;
    playSound('win');
    cancelAnimationFrame(gameLoop);
    gameWinScreen.classList.add('active');
}

// AABB Collision helper
function checkAABB(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

function animate() {
    if (!isPlaying) return;
    gameLoop = requestAnimationFrame(animate);
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Calculate scroll offset based on player horizontal movement
    // To keep player roughly centered when moving right
    let targetScrollOffset = 0;
    
    player.update();
    
    // Horizontal Movement & Scrolling
    if (keys.right && player.x > 400) {
        scrollOffset -= player.speed;
        targetScrollOffset = player.speed;
        player.x = 400; // lock player visually on screen
    } else if (keys.left && player.x < 100 && scrollOffset < 0) {
        scrollOffset += player.speed;
        targetScrollOffset = -player.speed;
        player.x = 100;
    } else {
        player.x += player.dx;
    }

    // Move everything else by scrollOffset
    if (targetScrollOffset !== 0) {
        platforms.forEach(p => p.x -= targetScrollOffset);
        enemies.forEach(e => e.x -= targetScrollOffset);
        coins.forEach(c => c.x -= targetScrollOffset);
        particles.forEach(p => p.x -= targetScrollOffset);
    }
    
    // Vertical Movement & Platform Collision
    player.y += player.dy;
    player.grounded = false;
    
    platforms.forEach(p => {
        if (p.type !== 'castle' && checkAABB(player, p)) {
            // Collision logic
            if (player.dy > 0 && player.y + player.height - player.dy <= p.y + 10) {
                // Landed on top
                player.dy = 0;
                player.grounded = true;
                player.jumps = 0;
                player.y = p.y - player.height;
            } else if (player.dy < 0 && player.y - player.dy >= p.y + p.height - 10) {
                // Hit head on bottom
                player.dy = 0;
                player.y = p.y + p.height;
                // If it's a block, maybe spawn particle
                if (p.type === 'block') {
                    createExplosion(player.x + player.width/2, p.y + p.height, '#CD853F', 5);
                }
            } else {
                // Hit side
                if (player.dx > 0 || keys.right) {
                    player.x = p.x - player.width;
                    if (targetScrollOffset > 0) scrollOffset += targetScrollOffset; // cancel scroll
                } else if (player.dx < 0 || keys.left) {
                    player.x = p.x + p.width;
                    if (targetScrollOffset < 0) scrollOffset += targetScrollOffset;
                }
            }
        }
        p.draw();
    });

    // Check Win condition
    if (checkAABB(player, castle) && levelComplete === 0) {
        levelComplete = 1;
        points += 5000;
        hudPoints.innerText = points;
        player.dy = 0;
        player.grounded = true;
        keys.right = false; keys.left = false; keys.up = false;
        playSound('win');
    }
    
    if (levelComplete === 1) {
        player.dx = 2; // walk right
        player.facingRight = true;
        player.x += player.dx;
        
        // Fireworks effect
        if (Math.random() < 0.1) {
            let colors = ['#f1c40f', '#e74c3c', '#2ecc71', '#3498db'];
            let randomColor = colors[Math.floor(Math.random() * colors.length)];
            createExplosion(castle.x + 75 + (Math.random()-0.5)*200, castle.y - Math.random()*200, randomColor, 15);
            playSound('jump'); // pop sound
        }
        
        // Walk into castle center (the door)
        if (player.x > castle.x + castle.width/2 - player.width/2) {
            player.x = castle.x + castle.width/2 - player.width/2;
            player.emoji = ''; // Menghilang seolah-olah masuk ke dalam
            levelComplete = 2;
            if (!gameWinScreen.classList.contains('active')) {
                gameWinScreen.classList.add('active'); 
                setTimeout(win, 500);
            }
        }
    }
    // Enemies
    enemies.forEach((enemy, index) => {
        if (enemy.dead) return;
        enemy.update();
        
        // Enemy collision with platforms
        enemy.dy += gravity;
        platforms.forEach(p => {
            if (checkAABB(enemy, p)) {
                if (enemy.dy > 0) {
                    enemy.dy = 0;
                    enemy.y = p.y - enemy.height;
                } else if (enemy.dx > 0) {
                    enemy.x = p.x - enemy.width;
                    enemy.dx = -1; // turn around
                } else if (enemy.dx < 0) {
                    enemy.x = p.x + p.width;
                    enemy.dx = 1;
                }
            }
        });
        
        // Fall off map
        if (enemy.y > canvas.height + 100) enemy.dead = true;

        enemy.draw();
        
        // Collision with player
        if (checkAABB(player, enemy)) {
            // Stomp check
            if (player.dy > 0 && player.y + player.height - player.dy <= enemy.y + enemy.height/2) {
                // Killed enemy
                enemy.dead = true;
                player.dy = -12; // Bounce
                player.jumps = 1;
                points += 100;
                hudPoints.innerText = points;
                playSound('stomp');
                createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2, '#e74c3c');
            } else {
                // Player hit from side
                die();
            }
        }
    });
    
    // Coins
    coins.forEach((coin, index) => {
        if (coin.collected) return;
        coin.update();
        coin.draw();
        
        if (checkAABB(player, coin)) {
            coin.collected = true;
            coinsCollected++;
            points += 50;
            hudCoins.innerText = coinsCollected;
            hudPoints.innerText = points;
            playSound('coin');
            createExplosion(coin.x + coin.width/2, coin.y + coin.height/2, '#f1c40f', 8);
        }
    });
    
    // Particles
    for(let i=particles.length-1; i>=0; i--) {
        let p = particles[i];
        p.update();
        p.draw();
        if (p.life <= 0) particles.splice(i, 1);
    }
    
    player.draw();
}

startBtn.addEventListener('click', init);
restartBtn.addEventListener('click', init);
winBtn.addEventListener('click', init);
