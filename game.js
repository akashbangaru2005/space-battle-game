// ===== UI =====
const instructionsScreen = document.getElementById("instructionsScreen");
const startGameBtn = document.getElementById("startGameBtn");

const winRestartBtn = document.getElementById("winRestartBtn");
const skillUnlock = document.getElementById("skillUnlock");
let verticalMoveUnlocked = false;
const winScreen = document.getElementById("winScreen");
const menuScreen = document.getElementById("menuScreen");
const gameOverScreen = document.getElementById("gameOverScreen");
const scoreUI = document.getElementById("scoreUI");
const healthUI = document.getElementById("healthUI");
const weaponUI = document.getElementById("weaponUI");
const finalScore = document.getElementById("finalScore");
const startBtn = document.getElementById("startBtn");
const shootBtn = document.getElementById("shootBtn");
const canvas = document.getElementById("gameCanvas");
const bgMusic = new Audio("assets/bg-music.mp3");
bgMusic.loop = true;
bgMusic.volume = 0.5;

const shootSound = new Audio("assets/shoot.wav");
const boomSound = new Audio("assets/explosion.wav");
const hitSound = new Audio("assets/hit.wav");
const healSound = new Audio("assets/heal.wav");

// 🔊 MASTER SOUND LIST
const allSounds = [bgMusic, shootSound, boomSound, hitSound, healSound];

const ctx = canvas.getContext("2d");


// ===== CANVAS RESIZE =====
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

// ===== GAME STATE =====
let gameStarted = false;
    let gameOver = false;
    let score = 0;
    let levelPhase = "enemies"; // enemies → boss → complete (controls stage flow)
    let enemiesKilled = 0;      // how many enemies player destroyed this level
    const maxLevels = 10;        // total levels to win
    const enemiesToClear = 15;  // enemies needed before boss appears
    let level = 1;
    let lastTime = 0; // For delta time calculation


    

// ===== SCREEN SHAKE =====
    let shakeTime = 0;
    let shakeStrength = 0;

function startShake(strength, duration) {
    shakeStrength = strength;
    shakeTime = duration;
    }
// ===== BACKGROUND MUSIC =====
    bgMusic.loop = true;
    bgMusic.volume = 0.5;
    startGameBtn.addEventListener("click", () => {
    instructionsScreen.classList.add("hidden");
    gameStarted = true;
    document.getElementById("hud").style.display = "flex";

    bgMusic.play();   // 🔊 start music here
});

// ===== SOUND SYSTEM =====
const enemyImg1 = new Image();
enemyImg1.src = "assets/enemy1.png";

const enemyImg2 = new Image();
enemyImg2.src = "assets/enemy2.png";

const enemyImg3 = new Image();
enemyImg3.src = "assets/enemy3.png";

const playerImg = new Image();
playerImg.src = "assets/player.png";

const muteBtn = document.getElementById("muteBtn");
let muted = false;

if (muteBtn) {
    muteBtn.addEventListener("click", () => {
        muted = !muted;

        allSounds.forEach(sound => sound.muted = muted);

        muteBtn.textContent = muted ? "🔇" : "🔊";
    });
}


// Central sound play function
function play(sound) {
    if (!muted) {
        sound.currentTime = 0;
        sound.play().catch(() => {});
    }
}

// ===== STAR PARTICLES =====
const starDots = Array.from({ length: 150 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: Math.random() * 2.5 + 0.5,
    speed: 0.2 + Math.random() * 0.5,
    alpha: Math.random()
    }));

function updateStarDots(deltaTime) {
    starDots.forEach(dot => {
        dot.y += dot.speed * deltaTime * 60; // Frame-independent
        if (dot.y > canvas.height) {
            dot.y = 0;
            dot.x = Math.random() * canvas.width;
        }
        dot.alpha += (Math.random() - 0.5) * 0.15;
        dot.alpha = Math.max(0.3, Math.min(1, dot.alpha));
    });
    }

function drawStarDots() {
    starDots.forEach(dot => {
        ctx.globalAlpha = dot.alpha;
        ctx.fillStyle = "white";
        ctx.shadowBlur = 12;
        ctx.shadowColor = "white";
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.size + 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    });
    }

// ===== CLASSES =====
class Player {
    constructor(){
        this.width = 90;      // 🔥 bigger ship
        this.height = 90;

        this.x = canvas.width / 2 - this.width/2;
        this.y = canvas.height - this.height - 30;

        this.speed = 6;
        this.health = 100;
        this.maxHealth = 150;
        this.health = this.maxHealth;
        this.healthRegen = 0.02;   // regen speed
        this.lowHealthWarning = false;
        this.shield = 60;
        this.maxShield = 60;
        this.laser = false;
        this.damageBoost = 1;
        this.speedBoost = 1;
        this.boostTimer = 0;
    }

    update(deltaTime) {
        // Health regeneration
        if(this.health < this.maxHealth){
        this.health += this.healthRegen * deltaTime * 60;
            }
        this.health = Math.min(this.maxHealth, this.health);

        // ⭐ BOOST TIMER SYSTEM
        if(this.boostTimer > 0){
            this.boostTimer -= deltaTime * 60;

            if(this.boostTimer <= 0){
                this.damageBoost = 1;
                this.speedBoost = 1;
            }
        }

        // ⭐ LEFT / RIGHT MOVEMENT
        if (keys["ArrowLeft"] && this.x > 0)
            this.x -= this.speed * this.speedBoost * deltaTime * 60;

        if (keys["ArrowRight"] && this.x < canvas.width - this.width)
            this.x += this.speed * this.speedBoost * deltaTime * 60;

        // ⭐ UP / DOWN MOVEMENT (UNLOCKS AFTER LEVEL 3)
        if (verticalMoveUnlocked) {

            if (keys["ArrowUp"] && this.y > 50)
                this.y -= this.speed * this.speedBoost * deltaTime * 60;

            if (keys["ArrowDown"] && this.y < canvas.height - this.height)
                this.y += this.speed * this.speedBoost * deltaTime * 60;
        }

        // ⭐ SHIELD REGEN
        this.shield = Math.min(this.maxShield, this.shield + 0.02 * deltaTime * 60);
    }

draw() {
   createTrail(this.x + this.width/2, this.y + this.height);
    // Shield glow  

    if (this.shield > 0) {
        ctx.strokeStyle = "rgba(0,255,255,0.5)";
        ctx.lineWidth = 3;
        ctx.beginPath();
       ctx.arc(this.x + this.width/2, this.y + this.height/2, this.width/2 + 10, 0, Math.PI * 2);

        ctx.stroke();
    }

    ctx.drawImage(playerImg, this.x, this.y, this.width, this.height);
}

}

class Bullet {
    constructor(x, y, width, height, speed, color, dx = 0, dy = 0) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.speed = speed;
        this.color = color;
        this.dx = dx; // Direction x
        this.dy = dy; // Direction y
    }

    update(deltaTime) {
        this.x += this.dx * this.speed * deltaTime * 60;
        this.y += this.dy * this.speed * deltaTime * 60;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
    }

class Enemy {
    constructor(x, y, width, height, speed) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.speed = speed;
        this.shootTimer = 0;
        const types = [enemyImg1, enemyImg2, enemyImg3];
        this.sprite = types[Math.floor(Math.random() * types.length)];
        
        this.floatOffset = Math.random() * 100;
    }

    update(deltaTime) {
        this.y += this.speed * deltaTime * 60;
        this.x += Math.sin((Date.now() + this.floatOffset) * 0.002) * 1.5;

        this.shootTimer += deltaTime * 60;
        if (this.shootTimer > 60) {
                const dx = player.x + player.width / 2 - (this.x + this.width / 2);
                const dy = player.y + player.height / 2 - (this.y + this.height / 2);
                const dist = Math.sqrt(dx * dx + dy * dy);
                enemyBullets.push(new Bullet(
                this.x + this.width / 2 - 4,
                this.y + this.height,
                8, 15, 5, "red",
                dx / dist, dy / dist
                ));
            this.shootTimer = 0;
        }
    }


    draw() {
        // Glow effect
        ctx.shadowBlur = 15;
        ctx.shadowColor = "cyan";

        // Draw ship image
        ctx.drawImage(this.sprite, this.x, this.y, this.width, this.height);

        ctx.shadowBlur = 0;
    }
    }


class Boss {
    constructor() {
        this.x = canvas.width / 2 - 120;
        this.y = 60;
        this.width = 240;
        this.height = 100;
        this.health = 200 + level * 100;
        this.speed = 1 + level * 0.2;
        this.shootTimer = 0;
        this.hitCooldown = 0;

    }

    update(deltaTime) {
        this.x += Math.sin(Date.now() * 0.002) * this.speed * deltaTime * 60;
        this.shootTimer += deltaTime * 60;
        if (this.hitCooldown > 0) this.hitCooldown -= deltaTime * 60;

        if (this.shootTimer > 60) {
            // Calculate direction towards player
            const dx = player.x + player.width / 2 - (this.x + this.width / 2);
            const dy = player.y + player.height / 2 - (this.y + this.height);
            const dist = Math.sqrt(dx * dx + dy * dy);
            const normalizedDx = dx / dist;
            const normalizedDy = dy / dist;
            enemyBullets.push(new Bullet(this.x + this.width / 2 - 5, this.y + this.height, 10, 20, 5, "red", normalizedDx, normalizedDy));
            this.shootTimer = 0;
        }
    }

 draw() {

    // Choose emoji based on level
    let emoji = "🐙";
    if(level === 3) emoji = "🦈";
    if(level === 4) emoji = "🦁";
    if(level === 5) emoji = "🐉";
    if(level === 6) emoji = "🦅";
    if(level === 7) emoji = "👹";
    if(level === 8) emoji = "🐻";
    if(level === 9) emoji = "🦖";
    if(level >= 10) emoji = "💀";

    // Glow
    ctx.shadowBlur = 40;
    ctx.shadowColor = "red";

    // Big emoji boss
    ctx.font = "120px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(emoji, this.x + this.width/2, this.y + this.height/2);

    ctx.shadowBlur = 0;

    // Boss HP bar
    ctx.fillStyle = "red";
    ctx.fillRect(canvas.width/2 - 150, 20, 300, 15);

    ctx.fillStyle = "lime";
    ctx.fillRect(canvas.width/2 - 150, 20, 300 * (this.health / (200 + level*100)), 15);

    ctx.fillStyle = "white";
    ctx.font = "16px Arial";
    ctx.fillText("BOSS HP", canvas.width/2, 15);
}

    }

class Particle {
    
    constructor(x, y, dx, dy, size, life, color) {
        this.x = x;
        this.y = y;
        this.dx = dx;
        this.dy = dy;
        this.size = size;
        this.life = life;
        this.color = color;
    }

        update(deltaTime) {
        this.x += this.dx * deltaTime * 60;
        this.y += this.dy * deltaTime * 60;
        this.life -= deltaTime * 60;
            }

    draw() {
        if (this.life > 0) {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.size, this.size);
        }
    }
    }

// ===== INSTANCES =====
    const powerUps = [];
    const player = new Player();
    const bullets = [];
    const enemies = [];
    const enemyBullets = [];
    let boss = null;
    const particles = [];
    const trailParticles = [];



//trail particles
function createTrail(x, y){
    trailParticles.push({
        x: x,
        y: y,
        size: Math.random()*4 + 2,
        life: 20
    });
    }
function spawnPowerUp(x,y){
    const types = ["health","shield","damage","speed"];
    const type = types[Math.floor(Math.random()*types.length)];

    powerUps.push({ x, y, size:22, type });
}


// ===== INPUT =====
const keys = {};

// Keyboard
document.addEventListener("keydown", e => keys[e.key] = true);
document.addEventListener("keyup", e => keys[e.key] = false);

// 🔥 TOUCH TO SHOOT ANYWHERE
canvas.addEventListener("touchstart", () => {
    keys[" "] = true;
});

canvas.addEventListener("touchend", () => {
    keys[" "] = false;
});

// 📱 TOUCH MOVE (drag to move ship)
canvas.addEventListener("touchmove", e => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    player.x = e.touches[0].clientX - rect.left - player.width / 2;
});

// ===== FUNCTIONS =====
function createExplosion(x, y, color = "orange") {
    for (let i = 0; i < 15; i++) {
        particles.push(new Particle(
            x, y,
            (Math.random() - 0.5) * 6,
            (Math.random() - 0.5) * 6,
            2 + Math.random() * 3,
            30,
            color
        ));
    }
    }
function spawnEnemy(){
    if(levelPhase === "enemies"){
        enemies.push(new Enemy(
            Math.random()*(canvas.width-80),
            -80,
            80,80,
            2 + level*0.7
        ));
    }
}





function spawnBoss() {
    boss = new Boss();
    }

function shoot() {
    if (keys[" "] && !gameOver) {
        if (player.laser) {
// Laser beam handled in collisions
        } else {
            bullets.push(new Bullet(player.x + 21, player.y - 15, 8, 15, 8, "yellow", 0, -1));
            play(shootSound);
        }
         }
            }

function drawLaser() {
    if (keys[" "] && player.laser && !gameOver) {
        ctx.strokeStyle = "lime";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(player.x + player.width / 2, player.y);
        ctx.lineTo(player.x + player.width / 2, 0);
        ctx.stroke();
        }
        }

function isColliding(a, b) {
         return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
        }

function handleCollisions() {

    // ===============================
    // 🔹 BULLETS vs ENEMIES
    // ===============================
    for (let bi = bullets.length - 1; bi >= 0; bi--) {
        const b = bullets[bi];

        for (let ei = enemies.length - 1; ei >= 0; ei--) {
            const e = enemies[ei];

            if (isColliding(b, e)) {
                bullets.splice(bi, 1);
                enemies.splice(ei, 1);

                createExplosion(e.x + e.width/2, e.y + e.height/2, "orange");
                startShake(6, 10);
                play(boomSound);

                score++;
                enemiesKilled++;   // ⭐ ONLY COUNT ONCE

                if (level >= 3 && Math.random() < 0.6) {
                    spawnPowerUp(e.x, e.y);
                }

                break;
            }
        }
    }

    // ===============================
    // 🔹 LASER vs ENEMIES
    // ===============================
    if (keys[" "] && player.laser) {
        const laserX = player.x + player.width / 2;

        for (let ei = enemies.length - 1; ei >= 0; ei--) {
            const e = enemies[ei];

            if (laserX > e.x && laserX < e.x + e.width) {
                enemies.splice(ei, 1);

                createExplosion(e.x + e.width/2, e.y + e.height/2, "orange");
                startShake(5, 8);
                play(boomSound);

                score++;
                enemiesKilled++;

                if (level >= 3 && Math.random() < 0.6) {
                    spawnPowerUp(e.x, e.y);
                }
            }
        }
    }

    // ===============================
    // 🔹 SPAWN BOSS AFTER ENEMY PHASE
    // ===============================
    if (levelPhase === "enemies" && enemiesKilled >= enemiesToClear) {
        levelPhase = "boss";
        spawnBoss();
        enemies.length = 0;
    }

    // ===============================
    // 🔹 BULLETS vs BOSS
    // ===============================
    if (boss) {
        for (let i = bullets.length - 1; i >= 0; i--) {
            const b = bullets[i];

            if (isColliding(b, boss)) {
                bullets.splice(i, 1);

                boss.health -= 10 * player.damageBoost;

                createExplosion(boss.x + boss.width/2, boss.y + boss.height/2, "purple");
                startShake(5, 8);
                play(hitSound);
            }
        }
    }

    // ===============================
    // 🔹 LASER vs BOSS (SLOW DAMAGE)
    // ===============================
    if (boss && keys[" "] && player.laser) {
        const laserX = player.x + player.width / 2;

        if (laserX > boss.x && laserX < boss.x + boss.width) {

            if (boss.hitCooldown <= 0) {
                boss.health -= 6 * player.damageBoost;
                boss.hitCooldown = 10;

                createExplosion(boss.x + boss.width/2, boss.y + boss.height/2, "red");
                startShake(4, 6);
                play(hitSound);
            }
        }
    }

    // ===============================
    // 🔹 BOSS DEATH
    // ===============================
    if (boss && boss.health <= 0) {

        createExplosion(boss.x + boss.width/2, boss.y + boss.height/2, "red");
        startShake(15, 25);
        play(boomSound);

        score += 100;
        player.shield = player.maxShield;

        boss = null;
        enemies.length = 0;

        levelPhase = "complete";   // ⭐ level finished
    }

    // ===============================
    // 🔹 NEXT LEVEL SYSTEM
    // ===============================
    if (levelPhase === "complete") {

        if (level >= maxLevels) {
            gameOver = true;
            showWinScreen();
            return;
        }

        level++;
        player.maxHealth += 20;
        player.health = player.maxHealth;

        if (level === 3 && !verticalMoveUnlocked) {
            verticalMoveUnlocked = true;
            skillUnlock.classList.remove("hidden");
            setTimeout(() => skillUnlock.classList.add("hidden"), 2500);
        }

        levelPhase = "enemies";
        enemiesKilled = 0;
    }

    // ===============================
    // 🔹 ENEMY BULLETS vs PLAYER
    // ===============================
    enemyBullets.forEach((b, bi) => {
        if (isColliding(b, player)) {
            enemyBullets.splice(bi, 1);

            if (player.shield > 0) player.shield -= 10;
            else player.health -= 10;

            play(hitSound);

            if (player.health <= 0) {
                gameOver = true;
                showGameOver();
            }
        }
    });

    // ===============================
    // 🔹 POWERUPS
    // ===============================
    powerUps.forEach((p, i) => {
        if (isColliding({x:p.x,y:p.y,width:20,height:20}, player)) {

            if(p.type === "health"){
                player.health = Math.min(player.maxHealth, player.health + 40);
                play(healSound);
            }
            if (p.type === "shield") player.shield = player.maxShield;
            if (p.type === "damage") { player.damageBoost = 2; player.boostTimer = 600; }
            if (p.type === "speed") { player.speedBoost = 1.8; player.boostTimer = 600; }

            powerUps.splice(i, 1);
        }
    });

    // Unlock laser
    if (score >= 10) player.laser = true;
}
function advanceLevel() {
    level++;
    player.maxHealth += 20;
    player.health = player.maxHealth;
    // Level completed → move to next
    if (level > maxLevels) {
        alert("🏆 YOU WIN THE GAME!");
        location.reload();
    }

    enemiesKilled = 0;
    levelPhase = "enemies";
    
}


// (duplicated collision/power-up/level-progression block removed to fix mismatched braces)

function drawUI() {
    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.fillText("Score: " + score, 10, 20);
    ctx.fillText("HP: " + player.health, 10, 40);
    // HP BAR
    ctx.fillStyle = "darkred";
    ctx.fillRect(10,55,200,12);

    ctx.fillStyle = "lime";
    ctx.fillRect(10,55,200*(player.health/player.maxHealth),12);
    // SHIELD BAR   

    ctx.fillStyle = "red";
    ctx.fillRect(10, 50, 200, 10);
    ctx.fillStyle = "lime";
    ctx.fillRect(10, 50, 200 * (player.health / player.maxHealth), 10);
    ctx.fillText("Shield: " + Math.floor(player.shield), 10, 60);
    ctx.fillText("Level: " + level, 10, 80);
    }

function showGameOver() {
    finalScore.textContent = score;
    gameOverScreen.classList.remove("hidden");
    }

function drawGameOver() {
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.font = "40px Arial";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2);
    ctx.textAlign = "left";
    }

// ===== GAME LOOP =====
function gameLoop(currentTime) {
    const deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    updateStarDots(deltaTime);
    drawStarDots();

    if (!gameStarted) {
        requestAnimationFrame(gameLoop);
        return;
    }

    if (!gameOver) {
        powerUps.forEach((p,i)=>{
    p.y += 2;
    if(p.y > canvas.height) powerUps.splice(i,1);
    });
    player.update(deltaTime);
    bullets.forEach(b => b.update(deltaTime));
    enemies.forEach(e => e.update(deltaTime));
    enemyBullets.forEach(b => b.update(deltaTime));
    trailParticles.forEach((p,i)=>{
    p.y += 2;
    p.life--;
    if(p.life <= 0) trailParticles.splice(i,1);
    });

    if (boss) boss.update(deltaTime);
    particles.forEach(p => p.update(deltaTime));

    shoot();
    handleCollisions();


// Remove off-screen objects
    bullets.splice(0, bullets.length, ...bullets.filter(b => b.y > -b.height));
    enemies.splice(0, enemies.length, ...enemies.filter(e => e.y < canvas.height + e.height));
    enemyBullets.splice(0, enemyBullets.length, ...enemyBullets.filter(b => b.y < canvas.height + b.height && b.y > -b.height && b.x > -b.width && b.x < canvas.width + b.width));
    particles.splice(0, particles.length, ...particles.filter(p => p.life > 0));
    }
    
    player.draw();
    bullets.forEach(b => b.draw());
    enemies.forEach(e => e.draw());
    powerUps.forEach(p=>{
    ctx.font = "22px Arial";
    let emoji = "💎";
    if(p.type === "shield") emoji = "🛡";
    if(p.type === "damage") emoji = "🔥";
    if(p.type === "speed")  emoji = "⚡";

    ctx.fillText(emoji, p.x, p.y);
    });

    enemyBullets.forEach(b => b.draw());
    if (boss) boss.draw();
    particles.forEach(p => p.draw());
    drawLaser();
    
    trailParticles.forEach(p=>{
    ctx.fillStyle = "orange";
    ctx.globalAlpha = p.life/20;
    ctx.fillRect(p.x, p.y, p.size, p.size);
    ctx.globalAlpha = 1;
    });

    drawUI();

    scoreUI.textContent = score;
    healthUI.textContent = player.health;
    weaponUI.textContent = player.laser ? "Laser ⚡" : "Normal";
    if(verticalMoveUnlocked){
    ctx.fillStyle = "lime";
    ctx.font = "18px Arial";
    ctx.fillText("Skill Unlocked: Vertical Flight", canvas.width/2 - 120, canvas.height - 20);
    }
    if(player.health < player.maxHealth * 0.3){
    ctx.fillStyle = "rgba(255,0,0,0.08)";
    ctx.fillRect(0,0,canvas.width,canvas.height);
    }


// Screen shake
    if (shakeTime > 0) {
        ctx.save();
        ctx.translate((Math.random() - 0.5) * shakeStrength, (Math.random() - 0.5) * shakeStrength);
        shakeTime--;
        }

    if (gameOver) drawGameOver();

      ctx.restore();
      requestAnimationFrame(gameLoop);
        }
function showWinScreen(){
    winScreen.classList.remove("hidden");

    setTimeout(()=>{
        location.reload();   // restart game after 4 seconds
    }, 40000);
}


// ===== START FLOW =====

// Show instructions first
startBtn.addEventListener("click", () => {
    menuScreen.classList.add("hidden");
    instructionsScreen.classList.remove("hidden");
});

// Start game after OK
startGameBtn.addEventListener("click", () => {
    instructionsScreen.classList.add("hidden");
    gameStarted = true;
    document.getElementById("hud").style.display = "flex";
    bgMusic.play().catch(()=>{});
});


winRestartBtn.addEventListener("click", () => {
    winScreen.classList.add("hidden");
    location.reload();
});

// ===== INTERVALS =====
    setInterval(spawnEnemy, 1000);

// ===== INIT =====
    requestAnimationFrame(gameLoop);
    