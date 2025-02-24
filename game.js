const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const GRID_SIZE = 40;
const COLS = canvas.width / GRID_SIZE;
const ROWS = canvas.height / GRID_SIZE;

let money = 100;
let towers = [];
let enemies = [];
let path = [
    { x: 0, y: 2 },
    { x: 1, y: 2 },
    { x: 2, y: 2 },
    { x: 3, y: 2 },
    { x: 3, y: 3 },
    { x: 3, y: 4 },
    { x: 3, y: 5 },
    { x: 4, y: 5 },
    { x: 5, y: 5 },
    { x: 6, y: 5 },
    { x: 6, y: 4 },
    { x: 6, y: 3 },
    { x: 6, y: 2 },
    { x: 7, y: 2 },
    { x: 8, y: 2 },
    { x: 9, y: 2 },
    { x: 10, y: 2 },
    { x: 10, y: 3 },
    { x: 10, y: 4 },
    { x: 10, y: 5 },
    { x: 10, y: 6 },
    { x: 10, y: 7 },
    { x: 10, y: 8 },
    { x: 10, y: 9 },
    { x: 10, y: 10 },
    { x: 11, y: 10 },
    { x: 12, y: 10 },
    { x: 13, y: 10 },
    { x: 14, y: 10 },
    { x: 15, y: 10 },
    { x: 16, y: 10 },
    { x: 17, y: 10 },
    { x: 18, y: 10 },
    { x: 19, y: 10 }
];

// Ajouter une variable pour le contrôle de la vitesse
let gameSpeed = 1;

let previewTower = null; // Pour l'aperçu de la tour
let isPlacingTower = false;

// Ajouter un tableau pour stocker la séquence de touches
let cheatSequence = [];
let cheatCode = ['c', 'h', 'e', 'a', 't'];

class Projectile {
    constructor(x, y, targetEnemy, damage) {
        this.x = x;
        this.y = y;
        this.targetEnemy = targetEnemy;
        this.baseSpeed = 5;
        this.radius = 4;
        this.hasHit = false;
        this.damage = damage;
    }

    draw() {
        // Projectile avec effet de brillance
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Effet de brillance
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(this.x - 1, this.y - 1, this.radius / 2, 0, Math.PI * 2);
        ctx.fill();
    }

    move() {
        if (this.hasHit) return true;

        // Ajuster la vitesse des projectiles
        const currentSpeed = this.baseSpeed * gameSpeed;

        const dx = this.targetEnemy.x + this.targetEnemy.width / 2 - this.x;
        const dy = this.targetEnemy.y + this.targetEnemy.height / 2 - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        this.x += (dx / distance) * currentSpeed;
        this.y += (dy / distance) * currentSpeed;

        if (this.targetEnemy.isColliding(this)) {
            this.targetEnemy.health -= this.damage;
            this.hasHit = true;
            return true;
        }

        return distance > 1000;
    }
}

class Tower {
    constructor(x, y, level = 1) {
        this.x = x;
        this.y = y;
        this.range = 150;
        this.lastShot = 0;
        this.baseCooldown = 750;
        this.projectiles = [];
        this.showRange = false;
        this.level = level;
        this.damage = 100;
        this.upgradeCost = 100;
        this.showUpgrade = false;
    }

    // Obtenir la portée actuelle en fonction du niveau
    getRange() {
        // Augmente la portée aux niveaux impairs
        const rangeUpgrades = Math.floor((this.level + 1) / 2);
        return this.range + (rangeUpgrades * 50);
    }

    // Obtenir le cooldown actuel en fonction du niveau
    getCooldown() {
        // Augmente la vitesse aux niveaux pairs
        const speedUpgrades = Math.floor(this.level / 2);
        return this.baseCooldown / (1 + speedUpgrades * 0.5);
    }

    draw() {
        // Couleurs différentes selon le niveau
        let baseColor;
        switch (this.level) {
            case 1:
                baseColor = '#4A90E2'; // Bleu clair
                break;
            case 2:
                baseColor = '#2980B9'; // Bleu foncé
                break;
            case 3:
                baseColor = '#8E44AD'; // Violet
                break;
            case 4:
                baseColor = '#C0392B'; // Rouge foncé
                break;
            default:
                baseColor = '#E74C3C'; // Rouge vif pour les niveaux supérieurs
        }

        // Portée de la tour (dessinée en premier pour être sous la tour)
        if (this.showRange) {
            ctx.strokeStyle = 'rgba(74, 144, 226, 0.5)';
            ctx.fillStyle = 'rgba(74, 144, 226, 0.2)';
            ctx.beginPath();
            const centerX = this.x * GRID_SIZE + GRID_SIZE / 2;
            const centerY = this.y * GRID_SIZE + GRID_SIZE / 2;
            // Utiliser la portée calculée
            const currentRange = this.getRange();
            ctx.arc(centerX, centerY, currentRange, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }

        // Base de la tour
        ctx.fillStyle = baseColor;
        ctx.fillRect(this.x * GRID_SIZE, this.y * GRID_SIZE, GRID_SIZE, GRID_SIZE);

        // Canon de la tour
        ctx.fillStyle = '#2C3E50';
        const centerX = this.x * GRID_SIZE + GRID_SIZE / 2;
        const centerY = this.y * GRID_SIZE + GRID_SIZE / 2;

        // Trouver l'ennemi le plus proche pour orienter le canon
        const target = this.findTarget();
        if (target) {
            ctx.save();
            ctx.translate(centerX, centerY);

            const angle = Math.atan2(
                target.y + GRID_SIZE / 4 - centerY,
                target.x + GRID_SIZE / 4 - centerX
            );
            ctx.rotate(angle);

            ctx.fillRect(0, -4, GRID_SIZE / 2, 8);
            ctx.restore();
        } else {
            ctx.fillRect(centerX, centerY - 4, GRID_SIZE / 2, 8);
        }

        // Niveau de la tour
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.level, centerX, centerY + 5);

        // Cercle central de la tour
        ctx.beginPath();
        ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#34495E';
        ctx.fill();

        // Déplacé à la fin de la méthode draw pour être au premier plan
        if (this.showUpgrade) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(this.x * GRID_SIZE, this.y * GRID_SIZE - 30, GRID_SIZE, 25);
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            const nextUpgrade = this.level % 2 === 0 ? "Speed" : "Range";
            ctx.fillText(`Upgrade ${nextUpgrade}: ${this.upgradeCost}$`,
                this.x * GRID_SIZE + GRID_SIZE / 2,
                this.y * GRID_SIZE - 15);
        }
    }

    shoot() {
        const now = Date.now();
        // Ajuster le cooldown en fonction du niveau (tire plus vite avec le niveau)
        const currentCooldown = this.getCooldown();

        if (now - this.lastShot >= currentCooldown) {
            const target = this.findTarget();
            if (target) {
                const projectile = new Projectile(
                    this.x * GRID_SIZE + GRID_SIZE / 2,
                    this.y * GRID_SIZE + GRID_SIZE / 2,
                    target,
                    this.damage
                );
                this.projectiles.push(projectile);
                this.lastShot = now;
            }
        }

        this.projectiles = this.projectiles.filter(proj => {
            proj.draw();
            return !proj.move();
        });
    }

    findTarget() {
        return enemies.find(enemy => {
            const centerX = this.x * GRID_SIZE + GRID_SIZE / 2;
            const centerY = this.y * GRID_SIZE + GRID_SIZE / 2;
            const enemyCenterX = enemy.x + enemy.width / 2;
            const enemyCenterY = enemy.y + enemy.height / 2;

            const dx = enemyCenterX - centerX;
            const dy = enemyCenterY - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Utiliser la portée calculée
            return distance <= this.getRange();
        });
    }

    upgrade() {
        if (money >= this.upgradeCost) {
            money -= this.upgradeCost;
            this.level += 1;
            this.upgradeCost *= 2;
            document.getElementById('money').textContent = money;
            return true;
        }
        return false;
    }
}

class Enemy {
    constructor(wave) {
        this.pathIndex = 0;
        // Positionner l'ennemi au centre de la case
        this.x = path[0].x * GRID_SIZE + GRID_SIZE / 4;
        this.y = path[0].y * GRID_SIZE + GRID_SIZE / 4;
        this.width = GRID_SIZE / 2;
        this.height = GRID_SIZE / 2;
        this.wave = wave;
        this.maxHealth = 100 * wave;
        this.health = this.maxHealth;
        this.baseSpeed = 1;
        this.reward = wave * 2;

        const colorPhase = (wave - 1) % 5;
        this.colors = {
            0: '#FF4444',
            1: '#FF8C00',
            2: '#9932CC',
            3: '#4169E1',
            4: '#2F4F4F'
        };
        this.color = this.colors[colorPhase];
    }

    draw() {
        // Corps de l'ennemi
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Niveau de l'ennemi (affiché au-dessus de la barre de vie)
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '10px Arial';
        ctx.fillText(`Niv.${this.wave}`, this.x, this.y - 15);

        // Barre de vie avec contour
        const healthBarWidth = this.width;
        const healthBarHeight = 6;
        const currentHealth = (this.health / this.maxHealth) * healthBarWidth;

        // Contour de la barre de vie
        ctx.fillStyle = '#000000';
        ctx.fillRect(this.x - 1, this.y - 11, healthBarWidth + 2, healthBarHeight + 2);

        // Fond rouge de la barre de vie
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(this.x, this.y - 10, healthBarWidth, healthBarHeight);

        // Vie actuelle en vert
        ctx.fillStyle = '#00FF00';
        ctx.fillRect(this.x, this.y - 10, currentHealth, healthBarHeight);
    }

    move() {
        // Calculer la position centrale de la cible
        const targetX = path[this.pathIndex].x * GRID_SIZE + GRID_SIZE / 4;
        const targetY = path[this.pathIndex].y * GRID_SIZE + GRID_SIZE / 4;

        // Appliquer la vitesse du jeu au déplacement
        const currentSpeed = this.baseSpeed * gameSpeed;

        if (Math.abs(this.x - targetX) < currentSpeed && Math.abs(this.y - targetY) < currentSpeed) {
            this.x = targetX;
            this.y = targetY;
            this.pathIndex++;

            if (this.pathIndex >= path.length) {
                lives -= 2;
                document.getElementById('lives').textContent = lives;
                return true;
            }
        }

        if (this.x < targetX) this.x += currentSpeed;
        if (this.x > targetX) this.x -= currentSpeed;
        if (this.y < targetY) this.y += currentSpeed;
        if (this.y > targetY) this.y -= currentSpeed;

        if (this.health <= 0) {
            money += this.reward;
            document.getElementById('money').textContent = money;
            return true;
        }

        return false;
    }

    isColliding(projectile) {
        return projectile.x >= this.x &&
            projectile.x <= this.x + this.width &&
            projectile.y >= this.y &&
            projectile.y <= this.y + this.height;
    }
}

let lives = 20;

// Variables pour la gestion des vagues
let currentWave = 1;
let enemiesInWave = 5;
let enemiesSpawned = 0;
let waveInProgress = false;

function drawGrid() {
    // Dessiner l'herbe sur tout le terrain
    ctx.fillStyle = '#90CF50';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Dessiner la grille en plus clair
    ctx.strokeStyle = '#7FBF40';
    for (let i = 0; i < COLS; i++) {
        for (let j = 0; j < ROWS; j++) {
            ctx.strokeRect(i * GRID_SIZE, j * GRID_SIZE, GRID_SIZE, GRID_SIZE);
        }
    }
}

function drawPath() {
    // Dessiner le chemin en gris
    ctx.fillStyle = '#8B8B8B';
    for (let i = 0; i < path.length - 1; i++) {
        const current = path[i];
        const next = path[i + 1];

        // Déterminer la direction du chemin
        const startX = Math.min(current.x, next.x);
        const startY = Math.min(current.y, next.y);
        const width = Math.abs(next.x - current.x) + 1;
        const height = Math.abs(next.y - current.y) + 1;

        ctx.fillRect(
            startX * GRID_SIZE,
            startY * GRID_SIZE,
            width * GRID_SIZE,
            height * GRID_SIZE
        );
    }

    // Bordures du chemin
    ctx.strokeStyle = '#696969';
    ctx.lineWidth = 2;
    for (let i = 0; i < path.length - 1; i++) {
        const current = path[i];
        const next = path[i + 1];

        const startX = Math.min(current.x, next.x);
        const startY = Math.min(current.y, next.y);
        const width = Math.abs(next.x - current.x) + 1;
        const height = Math.abs(next.y - current.y) + 1;

        ctx.strokeRect(
            startX * GRID_SIZE,
            startY * GRID_SIZE,
            width * GRID_SIZE,
            height * GRID_SIZE
        );
    }
}

function placeTower() {
    if (isPlacingTower || money < 50) return;

    isPlacingTower = true;
    const placeTowerButton = document.querySelector('button');
    placeTowerButton.style.opacity = '0.5';

    // Créer une tour d'aperçu
    previewTower = {
        x: 0,
        y: 0,
        range: 150,
        isValid: false
    };

    canvas.addEventListener('mousemove', handleTowerPreview);
    canvas.addEventListener('click', handleTowerPlacement);
    canvas.style.cursor = 'crosshair';
}

function handleTowerPreview(e) {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / GRID_SIZE);
    const y = Math.floor((e.clientY - rect.top) / GRID_SIZE);

    if (previewTower) {
        previewTower.x = x;
        previewTower.y = y;
        // Vérifier si l'emplacement est valide
        previewTower.isValid = isValidPlacement(x, y);
    }
}

function isValidPlacement(x, y) {
    // Vérifier si l'emplacement est sur le chemin
    if (isOnPath(x, y)) return false;

    // Vérifier si une tour existe déjà
    const existingTower = towers.find(tower => tower.x === x && tower.y === y);
    if (existingTower) return false;

    return true;
}

function drawTowerPreview() {
    if (!previewTower) return;

    const x = previewTower.x * GRID_SIZE;
    const y = previewTower.y * GRID_SIZE;

    // Dessiner l'aperçu de la tour
    ctx.globalAlpha = 0.5;

    // Couleur selon la validité du placement
    if (previewTower.isValid) {
        ctx.fillStyle = 'rgba(74, 144, 226, 0.5)';
        ctx.strokeStyle = 'rgba(74, 144, 226, 0.8)';
    } else {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
    }

    // Dessiner la base
    ctx.fillRect(x, y, GRID_SIZE, GRID_SIZE);
    ctx.strokeRect(x, y, GRID_SIZE, GRID_SIZE);

    // Dessiner la portée
    ctx.beginPath();
    ctx.arc(x + GRID_SIZE / 2, y + GRID_SIZE / 2, previewTower.range, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(74, 144, 226, 0.1)';
    ctx.fill();
    ctx.stroke();

    ctx.globalAlpha = 1;
}

function handleTowerPlacement(e) {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / GRID_SIZE);
    const y = Math.floor((e.clientY - rect.top) / GRID_SIZE);

    if (isValidPlacement(x, y)) {
        towers.push(new Tower(x, y));
        money -= 50;
        document.getElementById('money').textContent = money;
    }

    // Réinitialiser l'état de placement
    isPlacingTower = false;
    previewTower = null;
    canvas.removeEventListener('mousemove', handleTowerPreview);
    canvas.removeEventListener('click', handleTowerPlacement);
    canvas.style.cursor = 'default';
    const placeTowerButton = document.querySelector('button');
    placeTowerButton.style.opacity = '1';
}

function isOnPath(x, y) {
    return path.some(point => point.x === x && point.y === y);
}

function spawnEnemy() {
    if (!waveInProgress) return;

    if (enemiesSpawned < enemiesInWave) {
        enemies.push(new Enemy(currentWave));
        enemiesSpawned++;
    } else if (enemies.length === 0) {
        waveInProgress = false;
        currentWave++;
        enemiesInWave = Math.floor(5 + (currentWave * 1.5));
        enemiesSpawned = 0;
        showWaveMessage();
        const delayBetweenWaves = 1000; // Réduit le délai
        setTimeout(startNextWave, delayBetweenWaves);
    }
}

function showWaveMessage() {
    const waveMessage = document.getElementById('waveMessage');
    if (!waveMessage) return; // Vérifiez si l'élément existe

    const waveSpan = document.getElementById('wave');
    waveSpan.textContent = currentWave;

    const waveStats = document.getElementById('waveStats');
    if (waveStats) {
        waveStats.innerHTML = `
            Ennemis: ${enemiesInWave}<br>
            PV: ${100 * currentWave}<br>
        `;
    }

    // Afficher le message de la vague
    waveMessage.textContent = `Vague ${currentWave}`;
    waveMessage.style.display = 'block';

    // Masquer le message après 2 secondes
    setTimeout(() => {
        waveMessage.style.display = 'none';
    }, 1000);
}

function addWaveDisplay() {
    const controls = document.querySelector('.controls');

    // Affichage de la vague
    const waveInfo = document.createElement('div');
    waveInfo.className = 'wave-info';
    waveInfo.innerHTML = `
        <p>Vague: <span id="wave">1</span></p>
        <div id="waveStats" class="wave-stats"></div>
    `;
    controls.appendChild(waveInfo);
}

// Modifier l'intervalle de spawn en fonction de la vague
function updateSpawnInterval() {
    const baseInterval = 2000;
    const minInterval = 500;
    const reduction = currentWave * 50;
    const newInterval = Math.max(minInterval, baseInterval - reduction);

    clearInterval(spawnInterval);
    spawnInterval = setInterval(spawnEnemy, newInterval);
}

let spawnInterval;

function startNextWave() {
    waveInProgress = true;
    updateSpawnInterval();
    showWaveMessage();
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawGrid();
    drawPath();

    // Dessiner les projectiles avant de dessiner les tours
    towers.forEach(tower => {
        tower.shoot(); // Tire les projectiles
    });

    towers.forEach(tower => {
        tower.draw(); // Dessine la tour
    });

    enemies = enemies.filter(enemy => {
        enemy.draw();
        return !enemy.move();
    });

    // Dessiner l'aperçu de la tour en dernier pour qu'il soit au-dessus
    drawTowerPreview();

    if (lives <= 0) {
        // Afficher le message de game over
        const gameOverMessage = document.getElementById('gameOverMessage');
        gameOverMessage.style.display = 'block';
        setTimeout(() => {
            location.reload();
        }, 2000); // Recharge la page après 2 secondes
    }

    requestAnimationFrame(gameLoop);
}

// Initialisation
function init() {
    addWaveDisplay();
    canvas.addEventListener('click', handleTowerClick);
    canvas.addEventListener('mousemove', handleTowerHover);
    spawnInterval = setInterval(spawnEnemy, 2000);
    startNextWave();
}

// Appeler init au démarrage
window.onload = init;

gameLoop();

// Fonction pour changer la vitesse du jeu
function toggleSpeed() {
    if (gameSpeed === 1) {
        gameSpeed = 2;
        document.getElementById('speedButton').textContent = 'Vitesse: x2';
    } else {
        gameSpeed = 1;
        document.getElementById('speedButton').textContent = 'Vitesse: x1';
    }
}

// Gestionnaire de clic pour les tours
function handleTowerClick(e) {
    const rect = canvas.getBoundingClientRect();
    const clickX = Math.floor((e.clientX - rect.left) / GRID_SIZE);
    const clickY = Math.floor((e.clientY - rect.top) / GRID_SIZE);

    towers.forEach(tower => {
        if (tower.x === clickX && tower.y === clickY) {
            tower.upgrade();
        }
    });
}

// Gestionnaire de survol pour les tours
function handleTowerHover(e) {
    const rect = canvas.getBoundingClientRect();
    const hoverX = Math.floor((e.clientX - rect.left) / GRID_SIZE);
    const hoverY = Math.floor((e.clientY - rect.top) / GRID_SIZE);

    towers.forEach(tower => {
        tower.showUpgrade = (tower.x === hoverX && tower.y === hoverY);
        tower.showRange = tower.showUpgrade;
    });
}

// Nettoyer l'aperçu si on annule le placement
document.addEventListener('keydown', (e) => {
    // Gestion de la touche Escape pour le placement de tour
    if (e.key === 'Escape' && isPlacingTower) {
        isPlacingTower = false;
        previewTower = null;
        canvas.removeEventListener('mousemove', handleTowerPreview);
        canvas.removeEventListener('click', handleTowerPlacement);
        canvas.style.cursor = 'default';
        const placeTowerButton = document.querySelector('button');
        placeTowerButton.style.opacity = '1';
        return;
    }

    // Gestion du cheat code
    cheatSequence.push(e.key.toLowerCase());

    // Garder seulement les 5 dernières touches
    if (cheatSequence.length > 5) {
        cheatSequence.shift();
    }

    // Vérifier si la séquence correspond au cheat code
    if (cheatSequence.join('') === cheatCode.join('')) {
        money += 10000;
        document.getElementById('money').textContent = money;

        // Effet visuel pour le cheat
        const moneyDisplay = document.getElementById('money');
        moneyDisplay.style.color = '#FFD700';
        setTimeout(() => {
            moneyDisplay.style.color = '';
        }, 1000);

        // Réinitialiser la séquence
        cheatSequence = [];

        // Message de confirmation
        const message = document.createElement('div');
        message.textContent = 'CHEAT ACTIVATED: +10000$';
        message.style.position = 'fixed';
        message.style.top = '50%';
        message.style.left = '50%';
        message.style.transform = 'translate(-50%, -50%)';
        message.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        message.style.color = '#FFD700';
        message.style.padding = '20px';
        message.style.borderRadius = '10px';
        message.style.fontWeight = 'bold';
        message.style.zIndex = '1000';

        document.body.appendChild(message);

        setTimeout(() => {
            document.body.removeChild(message);
        }, 2000);
    }
});