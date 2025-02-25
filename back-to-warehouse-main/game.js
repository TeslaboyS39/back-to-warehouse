const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Variabel game
let human = {
    x: 50,
    y: 300,
    width: 40,
    height: 60,
    dy: 0,
    gravity: 0.5,
    jumpPower: -15,
    isJumping: false,
    isCrouching: false,
    runFrame: 0,
    frameSpeed: 0.2,
    ammo: 10,
    maxAmmo: 15,
    recoil: 0,
    weapon: "pistol"
};

let zombies = [];
let bullets = [];
let bossAttacks = [];
let birds = [];
let ammoPickups = [];
let weaponPickups = [];
let score = 0;
let highScore = localStorage.getItem("highScore") ? parseInt(localStorage.getItem("highScore")) : 0;
let gameOver = false;
let gameStarted = false;
let isPaused = false;
let difficulty = "medium";
let bossActive = false;
let dayNightCycle = "day";
let lastShotTime = 0;
let bossSpawnedAt = null;
let shakeTimer = 0;

// Variabel background
let bgX = 0;
let mountainX = 0;
let cloudX = 0;
let cityX = 0;
let bgSpeed = 2;
let mountainSpeed = 0.5;
let cloudSpeed = 0.2;
let citySpeed = 1;

// Partikel
let dustParticles = [];
let explosionParticles = [];
let smokeParticles = [];

// Elemen DOM
const splashScreen = document.getElementById("splashScreen");
const mainMenu = document.getElementById("mainMenu");
const gameOverMenu = document.getElementById("gameOverMenu");
const pauseMenu = document.getElementById("pauseMenu");
const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");
const mainMenuButton = document.getElementById("mainMenuButton");
const resumeButton = document.getElementById("resumeButton");
const pauseToMainMenuButton = document.getElementById("pauseToMainMenuButton");
const finalScoreDisplay = document.getElementById("finalScore");
const highScoreDisplay = document.getElementById("highScore");

// Splash screen fade out
setTimeout(() => {
    splashScreen.classList.add("fade-out");
    setTimeout(() => {
        splashScreen.style.display = "none";
        mainMenu.style.display = "block";
    }, 1000); // Tunggu fade selesai (1 detik)
}, 1000); // Tampil 1 detik sebelum fade

// Kontrol
document.addEventListener("keydown", (e) => {
    if (e.code === "Space" && !human.isJumping && gameStarted && !gameOver && !human.isCrouching && !isPaused) {
        human.dy = human.jumpPower;
        human.isJumping = true;
    }
    if (e.code === "KeyF" && human.ammo > 0 && gameStarted && !gameOver && !isPaused) {
        let now = Date.now();
        let fireRate = human.weapon === "minigun" ? 50 : 200;
        if (now - lastShotTime > fireRate) {
            shootBullet();
            human.ammo--;
            if (human.ammo <= 0 && human.weapon !== "pistol") {
                human.weapon = "pistol";
                human.maxAmmo = 15;
                human.ammo = 10;
            }
            human.recoil = human.weapon === "rpg" ? 10 : 5;
            lastShotTime = now;
        }
    }
    if (e.code === "KeyS" && !human.isJumping && gameStarted && !gameOver && !isPaused) {
        human.isCrouching = true;
        human.height = 40;
        human.y = 320;
    }
    if (e.code === "KeyP" && gameStarted && !gameOver) {
        isPaused = !isPaused;
        pauseMenu.style.display = isPaused ? "block" : "none";
    }
});

document.addEventListener("keyup", (e) => {
    if (e.code === "KeyS" && gameStarted && !gameOver) {
        human.isCrouching = false;
        human.height = 60;
        human.y = 300;
    }
});

// Tombol Start dan Difficulty
startButton.addEventListener("click", () => {
    difficulty = document.getElementById("difficultySelect").value;
    resetGame();
    gameStarted = true;
    gameOver = false;
    mainMenu.style.display = "none";
});

// Tombol Restart
restartButton.addEventListener("click", () => {
    resetGame();
    gameOver = false;
    gameOverMenu.style.display = "none";
});

// Tombol Main Menu
mainMenuButton.addEventListener("click", () => {
    resetGame();
    gameOver = false;
    gameOverMenu.style.display = "none";
    mainMenu.style.display = "block";
    gameStarted = false;
});

// Tombol Resume dari Pause
resumeButton.addEventListener("click", () => {
    isPaused = false;
    pauseMenu.style.display = "none";
});

// Tombol Main Menu dari Pause
pauseToMainMenuButton.addEventListener("click", () => {
    resetGame();
    isPaused = false;
    pauseMenu.style.display = "none";
    mainMenu.style.display = "block";
    gameStarted = false;
});

// Spawn zombie
function spawnZombie() {
    if (score >= 700 && score % 700 === 0 && !bossActive && bossSpawnedAt !== score) {
        let boss = {
            x: canvas.width - 150,
            y: 230,
            width: 150,
            height: 170,
            speed: 0,
            health: 50,
            maxHealth: 50,
            type: "boss",
            lastAttack: 0,
            attackPattern: 0
        };
        zombies.push(boss);
        bossActive = true;
        bossSpawnedAt = score;
        shakeTimer = 20;
    } else if (!bossActive) {
        let typeChance = Math.random();
        if (typeChance < 0.05) {
            // Zombie runner
            let zombie = {
                x: canvas.width,
                y: 330, // Di atas tanah
                width: 40,
                height: 30,
                speed: 5 + Math.random() * 2,
                health: 1,
                maxHealth: 1,
                type: "runner"
            };
            zombies.push(zombie);
        } else if (typeChance < 0.10) {
            // Tank
            let zombie = {
                x: canvas.width,
                y: 280,
                width: 60,
                height: 100,
                speed: 2 + Math.random(),
                health: 10,
                maxHealth: 10,
                type: "tank"
            };
            zombies.push(zombie);
        } else {
            // Normal
            let zombie = {
                x: canvas.width,
                y: 320,
                width: 40,
                height: 60,
                speed: 3 + Math.random() * 2,
                health: 2,
                maxHealth: 2,
                type: "normal"
            };
            zombies.push(zombie);
        }
    }
}

// Spawn serangan boss
function spawnBossAttack(boss) {
    let now = Date.now();
    if (now - boss.lastAttack < 1500) return;
    boss.lastAttack = now;

    if (boss.attackPattern === 3) {
        for (let i = 0; i < 3; i++) {
            let attack = { x: boss.x, y: boss.y + 80, width: 20, height: 20, speed: -8 };
            setTimeout(() => bossAttacks.push(attack), i * 200);
        }
    } else {
        let attack;
        if (boss.attackPattern === 0) {
            attack = { x: boss.x, y: boss.y + 20, width: 20, height: 20, speed: -5 };
        } else if (boss.attackPattern === 1) {
            attack = { x: boss.x, y: boss.y + 80, width: 20, height: 20, speed: -5 };
        } else {
            attack = { x: boss.x, y: 340, width: 20, height: 20, speed: -5 };
        }
        bossAttacks.push(attack);
    }

    boss.attackPattern = (boss.attackPattern + 1) % 4;
}

// Spawn burung
function spawnBirds() {
    if (Math.random() < 0.01) {
        let bird = {
            x: canvas.width,
            y: 50 + Math.random() * 50,
            width: 10,
            height: 5,
            speed: -3
        };
        birds.push(bird);
    }
}

// Spawn ammo pickup
function spawnAmmoPickup() {
    let ammo = {
        x: canvas.width,
        y: 320,
        width: 20,
        height: 20,
        speed: bgSpeed
    };
    ammoPickups.push(ammo);
}

// Spawn weapon pickup
function spawnWeaponPickup() {
    let type = Math.random() < 0.5 ? "minigun" : "rpg";
    let weapon = {
        x: canvas.width,
        y: 320,
        width: 25,
        height: 25,
        speed: bgSpeed,
        type: type
    };
    weaponPickups.push(weapon);
}

// Spawn peluru
function shootBullet() {
    let damage = human.weapon === "rpg" ? 15 : 1;
    let bullet = {
        x: human.x + human.width,
        y: human.isCrouching ? human.y + 30 : human.y + 20, // Peluru lebih rendah saat crouch
        width: human.weapon === "rpg" ? 15 : 10,
        height: human.weapon === "rpg" ? 10 : 5,
        speed: 10,
        damage: damage,
        fromCrouch: human.isCrouching
    };
    bullets.push(bullet);
}

// Spawn partikel debu
function spawnDust(x, y) {
    let dust = {
        x: x + 20,
        y: y + 60,
        size: Math.random() * 5 + 2,
        dx: -bgSpeed * 0.5,
        life: 20
    };
    dustParticles.push(dust);
}

// Spawn partikel ledakan
function spawnExplosion(x, y) {
    for (let i = 0; i < 5; i++) {
        let explosion = {
            x: x,
            y: y,
            size: Math.random() * 5 + 2,
            dx: (Math.random() - 0.5) * 5,
            dy: (Math.random() - 0.5) * 5,
            life: 20
        };
        explosionParticles.push(explosion);
    }
}

// Spawn partikel asap kota
function spawnSmoke() {
    let smoke = {
        x: Math.random() * canvas.width,
        y: 360,
        width: Math.random() * 40 + 20,
        height: Math.random() * 40 + 20,
        dy: -0.3,
        opacity: 0.5,
        life: 150
    };
    smokeParticles.push(smoke);
}

// Reset game
function resetGame() {
    human.y = 300;
    human.dy = 0;
    human.isJumping = false;
    human.isCrouching = false;
    human.height = 60;
    human.runFrame = 0;
    human.ammo = 10;
    human.maxAmmo = 15;
    human.recoil = 0;
    human.weapon = "pistol";
    zombies = [];
    bullets = [];
    bossAttacks = [];
    birds = [];
    ammoPickups = [];
    weaponPickups = [];
    dustParticles = [];
    explosionParticles = [];
    smokeParticles = [];
    score = 0;
    bgX = 0;
    mountainX = 0;
    cloudX = 0;
    cityX = 0;
    bossActive = false;
    bossSpawnedAt = null;
    dayNightCycle = "day";
    shakeTimer = 0;
    gameOver = false;
    gameStarted = true;
    isPaused = false;
}

// Update game
function update() {
    if (!gameStarted || isPaused) return;

    if (gameOver) {
        finalScoreDisplay.textContent = score;
        highScoreDisplay.textContent = highScore;
        gameOverMenu.style.display = "block";
        return;
    }

    human.dy += human.gravity;
    human.y += human.dy;

    if (human.y > 300) {
        human.y = 300;
        human.dy = 0;
        human.isJumping = false;
    }

    if (!human.isJumping && !human.isCrouching) {
        human.runFrame += human.frameSpeed;
        if (human.runFrame > 2) human.runFrame = 0;
        if (Math.random() < 0.2) spawnDust(human.x, human.y);
    }

    if (human.recoil > 0) human.recoil--;

    if (!bossActive) {
        bgX -= bgSpeed;
        if (bgX <= -canvas.width) bgX = 0;
        mountainX -= mountainSpeed;
        if (mountainX <= -canvas.width) mountainX = 0;
        cloudX -= cloudSpeed;
        if (cloudX <= -canvas.width) cloudX = 0;
        cityX -= citySpeed;
        if (cityX <= -canvas.width) cityX = 0;
    }

    birds.forEach((bird, index) => {
        bird.x += bird.speed;
        if (bird.x < -bird.width) birds.splice(index, 1);
    });
    spawnBirds();

    dustParticles.forEach((dust, index) => {
        dust.x += dust.dx;
        dust.life--;
        if (dust.life <= 0) dustParticles.splice(index, 1);
    });
    explosionParticles.forEach((exp, index) => {
        exp.x += exp.dx;
        exp.y += exp.dy;
        exp.life--;
        if (exp.life <= 0) explosionParticles.splice(index, 1);
    });
    smokeParticles.forEach((smoke, index) => {
        smoke.y += smoke.dy;
        smoke.opacity -= 0.003;
        if (smoke.opacity <= 0) smokeParticles.splice(index, 1);
    });
    if (Math.random() < 0.05) spawnSmoke();

    bullets.forEach((bullet, bIndex) => {
        bullet.x += bullet.speed;
        if (bullet.x > canvas.width) bullets.splice(bIndex, 1);

        zombies.forEach((zombie, zIndex) => {
            if (
                bullet.x < zombie.x + zombie.width &&
                bullet.x + bullet.width > zombie.x &&
                bullet.y < zombie.y + zombie.height &&
                bullet.y + bullet.height > zombie.y
            ) {
                if (zombie.type === "runner" && !bullet.fromCrouch) return; // Runner hanya kena kalau crouch
                bullets.splice(bIndex, 1);
                zombie.health -= bullet.damage;
                spawnExplosion(zombie.x + zombie.width / 2, zombie.y + zombie.height / 2);
                if (zombie.health <= 0) {
                    zombies.splice(zIndex, 1);
                    score += zombie.type === "boss" ? 500 : zombie.type === "tank" ? 50 : 10;
                    if (zombie.type === "boss") bossActive = false;
                }
            }
        });
    });

    zombies.forEach((zombie, index) => {
        if (!bossActive || zombie.type === "boss") zombie.x -= zombie.speed;
        if (zombie.type === "boss") spawnBossAttack(zombie);
        if (
            human.x < zombie.x + zombie.width &&
            human.x + human.width > zombie.x &&
            human.y < zombie.y + zombie.height &&
            human.y + human.height > zombie.y
        ) {
            gameOver = true;
            if (score > highScore) {
                highScore = score;
                localStorage.setItem("highScore", highScore);
            }
        }
        if (zombie.x < -zombie.width && zombie.type !== "boss") {
            zombies.splice(index, 1);
            score += zombie.type === "tank" ? 50 : 10;
        }
    });

    bossAttacks.forEach((attack, index) => {
        attack.x += attack.speed;
        if (
            human.x < attack.x + attack.width &&
            human.x + human.width > attack.x &&
            human.y < attack.y + attack.height &&
            human.y + human.height > attack.y
        ) {
            gameOver = true;
            if (score > highScore) {
                highScore = score;
                localStorage.setItem("highScore", highScore);
            }
        }
        if (attack.x < -attack.width) bossAttacks.splice(index, 1);
    });

    ammoPickups.forEach((ammo, index) => {
        if (!bossActive) ammo.x -= ammo.speed;
        if (
            human.x < ammo.x + ammo.width &&
            human.x + human.width > ammo.x &&
            human.y < ammo.y + ammo.height &&
            human.y + human.height > ammo.y
        ) {
            human.ammo = Math.min(human.maxAmmo, human.ammo + 5);
            ammoPickups.splice(index, 1);
        }
        if (ammo.x < -ammo.width) ammoPickups.splice(index, 1);
    });

    weaponPickups.forEach((weapon, index) => {
        if (!bossActive) weapon.x -= weapon.speed;
        if (
            human.x < weapon.x + weapon.width &&
            human.x + human.width > weapon.x &&
            human.y < weapon.y + weapon.height &&
            human.y + human.height > weapon.y
        ) {
            human.weapon = weapon.type;
            human.maxAmmo = weapon.type === "minigun" ? 75 : weapon.type === "rpg" ? 3 : 15;
            human.ammo = human.maxAmmo;
            weaponPickups.splice(index, 1);
        }
        if (weapon.x < -weapon.width) weaponPickups.splice(index, 1);
    });

    if (!bossActive) {
        let zombieSpawnRate = difficulty === "easy" ? 0.01 : difficulty === "medium" ? 0.02 : 0.03;
        let ammoSpawnRate = difficulty === "easy" ? 0.008 : difficulty === "medium" ? 0.005 : 0.002;
        let weaponSpawnRate = difficulty === "easy" ? 0.003 : difficulty === "medium" ? 0.002 : 0.001;
        if (Math.random() < zombieSpawnRate) spawnZombie();
        if (Math.random() < ammoSpawnRate) spawnAmmoPickup();
        if (Math.random() < weaponSpawnRate) spawnWeaponPickup();
    }

    let cycle = Math.floor(score / 700) % 2;
    dayNightCycle = cycle === 0 ? "day" : "night";
}

// Gambar background
function drawBackground() {
    let shakeX = shakeTimer > 0 ? (Math.random() - 0.5) * 10 : 0;
    let shakeY = shakeTimer > 0 ? (Math.random() - 0.5) * 10 : 0;
    if (shakeTimer > 0) shakeTimer--;

    ctx.save();
    ctx.translate(shakeX, shakeY);

    ctx.fillStyle = dayNightCycle === "day" ? "#87CEEB" : "#1C2526";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (dayNightCycle === "day") {
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(cloudX + 100, 100, 30, 0, Math.PI * 2);
        ctx.arc(cloudX + 140, 90, 40, 0, Math.PI * 2);
        ctx.arc(cloudX + 180, 110, 30, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cloudX + canvas.width + 100, 100, 30, 0, Math.PI * 2);
        ctx.arc(cloudX + canvas.width + 140, 90, 40, 0, Math.PI * 2);
        ctx.arc(cloudX + canvas.width + 180, 110, 30, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.fillStyle = "#808080";
    ctx.beginPath();
    ctx.moveTo(mountainX + 200, 360);
    ctx.lineTo(mountainX + 400, 200);
    ctx.lineTo(mountainX + 600, 360);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(mountainX + canvas.width + 200, 360);
    ctx.lineTo(mountainX + canvas.width + 400, 200);
    ctx.lineTo(mountainX + canvas.width + 600, 360);
    ctx.fill();

    ctx.fillStyle = "#4B4B4B";
    ctx.fillRect(cityX, 300, 70, 60);
    ctx.fillRect(cityX + 80, 280, 60, 80);
    ctx.fillRect(cityX + 150, 290, 50, 70);
    ctx.fillRect(cityX + 210, 310, 60, 50);
    ctx.fillRect(cityX + 280, 270, 80, 90);
    ctx.fillRect(cityX + 370, 300, 70, 60);
    ctx.fillRect(cityX + 450, 290, 60, 70);
    ctx.fillRect(cityX + canvas.width, 300, 70, 60);
    ctx.fillRect(cityX + canvas.width + 80, 280, 60, 80);
    ctx.fillRect(cityX + canvas.width + 150, 290, 50, 70);
    ctx.fillRect(cityX + canvas.width + 210, 310, 60, 50);
    ctx.fillRect(cityX + canvas.width + 280, 270, 80, 90);
    ctx.fillRect(cityX + canvas.width + 370, 300, 70, 60);
    ctx.fillRect(cityX + canvas.width + 450, 290, 60, 70);

    ctx.fillStyle = "#8B4513";
    ctx.fillRect(bgX, 360, canvas.width, 40);
    ctx.fillRect(bgX + canvas.width, 360, canvas.width, 40);

    smokeParticles.forEach(smoke => {
        ctx.fillStyle = `rgba(100, 100, 100, ${smoke.opacity})`;
        ctx.fillRect(smoke.x, smoke.y, smoke.width, smoke.height);
    });

    ctx.restore();
}

// Gambar burung (siluet sederhana)
function drawBirds() {
    ctx.fillStyle = "black";
    birds.forEach(bird => {
        ctx.beginPath();
        ctx.moveTo(bird.x, bird.y);
        ctx.lineTo(bird.x + 5, bird.y - 5); // Sayap kiri
        ctx.lineTo(bird.x + 10, bird.y);
        ctx.lineTo(bird.x + 5, bird.y + 5); // Sayap kanan
        ctx.closePath();
        ctx.fill();
    });
}

// Gambar stickman
function drawStickman(x, y, frame) {
    ctx.fillStyle = "blue";
    ctx.strokeStyle = "blue";
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.arc(x + 20, human.isCrouching ? y + 20 : y + 10, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(x + 17, human.isCrouching ? y + 18 : y + 8, 2, 0, Math.PI * 2);
    ctx.arc(x + 23, human.isCrouching ? y + 18 : y + 8, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "blue";
    ctx.beginPath();
    ctx.moveTo(x + 20, human.isCrouching ? y + 30 : y + 20);
    ctx.lineTo(x + 20, human.isCrouching ? y + 50 : y + 40);
    ctx.stroke();

    let armOffset = human.isJumping || human.isCrouching ? 0 : Math.sin(frame * Math.PI) * 5;
    let recoilOffset = human.recoil > 0 ? -human.recoil : 0;
    ctx.beginPath();
    ctx.moveTo(x + 20, human.isCrouching ? y + 35 : y + 25);
    ctx.lineTo(x + 10 - armOffset, human.isCrouching ? y + 45 : y + 35);
    ctx.moveTo(x + 20, human.isCrouching ? y + 35 : y + 25);
    ctx.lineTo(x + 30 + armOffset + recoilOffset, human.isCrouching ? y + 45 - recoilOffset : y + 35 - recoilOffset);
    ctx.stroke();

    ctx.fillStyle = human.weapon === "minigun" ? "gray" : human.weapon === "rpg" ? "darkolivegreen" : "black";
    if (human.weapon === "minigun") {
        ctx.fillRect(x + 30 + armOffset + recoilOffset, human.isCrouching ? y + 40 - recoilOffset : y + 30 - recoilOffset, 15, 8);
    } else if (human.weapon === "rpg") {
        ctx.fillRect(x + 30 + armOffset + recoilOffset, human.isCrouching ? y + 40 - recoilOffset : y + 30 - recoilOffset, 20, 10);
    } else {
        ctx.fillRect(x + 30 + armOffset + recoilOffset, human.isCrouching ? y + 43 - recoilOffset : y + 33 - recoilOffset, 8, 4);
    }

    if (!human.isJumping && !human.isCrouching) {
        let legOffset = Math.sin(frame * Math.PI) * 10;
        ctx.beginPath();
        ctx.moveTo(x + 20, y + 40);
        ctx.lineTo(x + 20 + legOffset, y + 60);
        ctx.moveTo(x + 20, y + 40);
        ctx.lineTo(x + 20 - legOffset, y + 60);
        ctx.stroke();
    } else if (human.isJumping) {
        ctx.beginPath();
        ctx.moveTo(x + 20, y + 40);
        ctx.lineTo(x + 15, y + 60);
        ctx.moveTo(x + 20, y + 40);
        ctx.lineTo(x + 25, y + 60);
        ctx.stroke();
    } else if (human.isCrouching) {
        ctx.beginPath();
        ctx.moveTo(x + 20, y + 50);
        ctx.lineTo(x + 15, y + 60);
        ctx.moveTo(x + 20, y + 50);
        ctx.lineTo(x + 25, y + 60);
        ctx.stroke();
    }
}

// Gambar zombie
function drawZombie(zombie) {
    ctx.fillStyle = zombie.type === "tank" ? "darkgreen" : zombie.type === "boss" ? "purple" : zombie.type === "runner" ? "brown" : "green";
    ctx.strokeStyle = zombie.type === "tank" ? "darkgreen" : zombie.type === "boss" ? "purple" : zombie.type === "runner" ? "brown" : "green";
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.arc(zombie.x + zombie.width / 2, zombie.y + (zombie.type === "boss" ? 20 : zombie.type === "runner" ? 5 : 10), zombie.type === "boss" ? 25 : zombie.type === "tank" ? 15 : zombie.type === "runner" ? 8 : 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = zombie.type === "boss" ? "yellow" : "red";
    ctx.beginPath();
    ctx.arc(zombie.x + zombie.width / 2 + (zombie.type === "boss" ? 10 : zombie.type === "tank" ? 5 : zombie.type === "runner" ? 3 : 3), zombie.y + (zombie.type === "boss" ? 25 : zombie.type === "runner" ? 7 : 12), zombie.type === "boss" ? 5 : zombie.type === "tank" ? 3 : zombie.type === "runner" ? 2 : 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = zombie.type === "tank" ? "darkgreen" : zombie.type === "boss" ? "purple" : zombie.type === "runner" ? "brown" : "green";
    ctx.beginPath();
    ctx.moveTo(zombie.x + zombie.width / 2, zombie.y + (zombie.type === "boss" ? 45 : zombie.type === "tank" ? 25 : zombie.type === "runner" ? 13 : 20));
    ctx.lineTo(zombie.x + zombie.width / 2, zombie.y + (zombie.type === "boss" ? 110 : zombie.type === "tank" ? 60 : zombie.type === "runner" ? 20 : 40));
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(zombie.x + zombie.width / 2, zombie.y + (zombie.type === "boss" ? 70 : zombie.type === "tank" ? 40 : zombie.type === "runner" ? 15 : 25));
    ctx.lineTo(zombie.x + (zombie.type === "boss" ? 30 : zombie.type === "tank" ? 10 : zombie.type === "runner" ? 8 : 10), zombie.y + (zombie.type === "boss" ? 40 : zombie.type === "tank" ? 20 : zombie.type === "runner" ? 10 : 15));
    ctx.moveTo(zombie.x + zombie.width / 2, zombie.y + (zombie.type === "boss" ? 70 : zombie.type === "tank" ? 40 : zombie.type === "runner" ? 15 : 25));
    ctx.lineTo(zombie.x + zombie.width - (zombie.type === "boss" ? 30 : zombie.type === "tank" ? 10 : zombie.type === "runner" ? 8 : 10), zombie.y + (zombie.type === "boss" ? 40 : zombie.type === "tank" ? 20 : zombie.type === "runner" ? 10 : 15));
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(zombie.x + zombie.width / 2, zombie.y + (zombie.type === "boss" ? 110 : zombie.type === "tank" ? 60 : zombie.type === "runner" ? 20 : 40));
    ctx.lineTo(zombie.x + (zombie.type === "boss" ? 40 : zombie.type === "tank" ? 15 : zombie.type === "runner" ? 10 : 15), zombie.y + zombie.height);
    ctx.moveTo(zombie.x + zombie.width / 2, zombie.y + (zombie.type === "boss" ? 110 : zombie.type === "tank" ? 60 : zombie.type === "runner" ? 20 : 40));
    ctx.lineTo(zombie.x + zombie.width - (zombie.type === "boss" ? 40 : zombie.type === "tank" ? 15 : zombie.type === "runner" ? 10 : 15), zombie.y + zombie.height);
    ctx.stroke();

    ctx.fillStyle = "red";
    ctx.fillRect(zombie.x, zombie.y - 15, zombie.width, 5);
    ctx.fillStyle = "green";
    ctx.fillRect(zombie.x, zombie.y - 15, zombie.width * (zombie.health / zombie.maxHealth), 5);
}

// Gambar serangan boss
function drawBossAttacks() {
    bossAttacks.forEach(attack => {
        ctx.fillStyle = "brown";
        ctx.fillRect(attack.x, attack.y, attack.width, attack.height);
    });
}

// Gambar peluru
function drawBullets() {
    bullets.forEach(bullet => {
        ctx.fillStyle = human.weapon === "rpg" ? "red" : "yellow";
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });
}

// Gambar ammo pickup
function drawAmmoPickups() {
    ctx.fillStyle = "orange";
    ammoPickups.forEach(ammo => {
        ctx.fillRect(ammo.x, ammo.y, ammo.width, ammo.height);
    });
}

// Gambar weapon pickup
function drawWeaponPickups() {
    weaponPickups.forEach(weapon => {
        ctx.fillStyle = weapon.type === "minigun" ? "gray" : "darkolivegreen";
        ctx.fillRect(weapon.x, weapon.y, weapon.width, weapon.height);
    });
}

// Gambar partikel debu
function drawDust() {
    ctx.fillStyle = "rgba(139, 69, 19, 0.5)";
    dustParticles.forEach(dust => {
        ctx.beginPath();
        ctx.arc(dust.x, dust.y, dust.size, 0, Math.PI * 2);
        ctx.fill();
    });
}

// Gambar partikel ledakan
function drawExplosion() {
    ctx.fillStyle = "orange";
    explosionParticles.forEach(exp => {
        ctx.beginPath();
        ctx.arc(exp.x, exp.y, exp.size, 0, Math.PI * 2);
        ctx.fill();
    });
}

// Gambar HUD
function drawHUD() {
    ctx.fillStyle = "black";
    ctx.font = "20px Arial";
    ctx.fillText(`Weapon: ${human.weapon}`, canvas.width - 150, 20);
    ctx.fillText(`Ammo: ${human.ammo}/${human.maxAmmo}`, canvas.width - 150, 40);
    ctx.fillText(`Score: ${score}`, 10, 30);
}

// Gambar ke canvas
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawBackground();
    drawBirds();
    drawDust();
    drawExplosion();
    drawAmmoPickups();
    drawWeaponPickups();
    drawStickman(human.x, human.y, human.runFrame);
    zombies.forEach(zombie => drawZombie(zombie));
    drawBossAttacks();
    drawBullets();
    if (gameStarted && !gameOver) drawHUD();

    if (gameOver) {
        finalScoreDisplay.textContent = score;
        highScoreDisplay.textContent = highScore;
        gameOverMenu.style.display = "block";
    }
}

// Loop utama
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

gameLoop();