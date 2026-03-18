const canvas = document.querySelector('#game-canvas');
const ctx = canvas.getContext('2d');

canvas.width = 1280;
canvas.height = 720;

const gravity = 0.7;

class Sprite {
    constructor({ position, color = 'red' }) {
        this.position = position;
        this.width = 50;
        this.height = 150;
        this.color = color;
    }
    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.position.x, this.position.y, this.width, this.height);
    }
    update() { this.draw(); }
}

class Background {
    constructor({ position, imageSrc }) {
        this.position = position;
        this.image = new Image();
        this.image.src = imageSrc;
    }
    draw() {
        if (this.image.complete) {
            ctx.drawImage(this.image, this.position.x, this.position.y, canvas.width, canvas.height);
        } else {
            ctx.fillStyle = '#0a0a0a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }
    update() { this.draw(); }
}

const background = new Background({
    position: { x: 0, y: 0 },
    imageSrc: 'assets/background.png'
});

class Fighter extends Sprite {
    constructor({
        position,
        velocity,
        color,
        name,
        keys,
        imageSrc,
        framesCols = 1,
        framesRows = 1,
        attackBox = { offset: {}, width: undefined, height: undefined },
        characterType = 'STRIKER'
    }) {
        super({ position, color });
        this.velocity = velocity;
        this.width = 60;
        this.height = 150;
        this.lastKey;
        this.attackBox = {
            position: { x: this.position.x, y: this.position.y },
            offset: attackBox.offset,
            width: attackBox.width,
            height: attackBox.height,
        };
        this.isAttacking = false;
        this.health = 100;
        this.name = name;
        this.keys = keys;
        this.characterType = characterType;
        this.isDefending = false;
        this.wins = 0;
        this.isFacingRight = true;

        this.framesCols = framesCols;
        this.framesRows = framesRows;
        this.framesCurrentCol = 0;
        this.framesCurrentRow = 0;
        this.framesElapsed = 0;
        this.framesHold = 5;

        if (imageSrc) {
            this.image = new Image();
            this.image.src = imageSrc;
        }
    }

    draw() {
        // Personagem
        if (this.image && this.image.complete) {
            const frameWidth = this.image.width / this.framesCols;
            const frameHeight = this.image.height / this.framesRows;

            const imageAspect = frameWidth / frameHeight;
            const drawHeight = this.height;
            const drawWidth = drawHeight * imageAspect;
            const offsetX = (this.width - drawWidth) / 2;

            ctx.save();
            
            // Se o personagem deve virar para a esquerda:
            if (!this.isFacingRight) {
                const centerX = this.position.x + this.width / 2;
                ctx.translate(centerX, 0);
                ctx.scale(-1, 1);
                ctx.translate(-centerX, 0);
            }

            if (this.isDefending) ctx.filter = 'brightness(50%)';
            ctx.drawImage(
                this.image,
                this.framesCurrentCol * frameWidth,
                this.framesCurrentRow * frameHeight,
                frameWidth,
                frameHeight,
                this.position.x + offsetX,
                this.position.y,
                drawWidth,
                drawHeight
            );
            ctx.restore();
        } else {
            ctx.fillStyle = this.isDefending ? '#555' : this.color;
            ctx.fillRect(this.position.x, this.position.y, this.width, this.height);
        }

        // Barra de visualização de ataque (debug/efeito)
        if (this.isAttacking) {
            ctx.fillStyle = this.characterType === 'STRIKER' ? 'rgba(0, 210, 255, 0.5)' : 'rgba(255, 51, 102, 0.5)';
            ctx.fillRect(
                this.attackBox.position.x,
                this.attackBox.position.y,
                this.attackBox.width,
                this.attackBox.height
            );
        }
    }

    update() {
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;

        // Gravidade e Chão
        if (this.position.y + this.height + this.velocity.y >= canvas.height - 100) {
            this.velocity.y = 0;
            this.position.y = canvas.height - 100 - this.height;
        } else {
            this.velocity.y += gravity;
        }

        // Atualizar a posição real da caixa de ataque ANTES de desenhar
        this.attackBox.position.x = this.position.x + this.attackBox.offset.x;
        this.attackBox.position.y = this.position.y + this.attackBox.offset.y;

        this.draw();

        // Animação do Sprite
        if (this.image && this.image.complete && (this.framesCols > 1 || this.framesRows > 1)) {
            this.framesElapsed++;
            if (this.framesElapsed % this.framesHold === 0) {
                const totalFrames = this.framesCols * this.framesRows;
                let linearFrame = this.framesCurrentRow * this.framesCols + this.framesCurrentCol;
                linearFrame++;
                if (linearFrame >= totalFrames) {
                    linearFrame = 0;
                }
                this.framesCurrentRow = Math.floor(linearFrame / this.framesCols);
                this.framesCurrentCol = linearFrame % this.framesCols;
            }
        }
    }

    attack() {
        this.isAttacking = true;
        setTimeout(() => {
            this.isAttacking = false;
        }, 100);
    }
}

const player = new Fighter({
    position: { x: 200, y: 0 },
    velocity: { x: 0, y: 0 },
    color: '#00d2ff',
    name: 'Striker',
    characterType: 'STRIKER',
    imageSrc: 'assets/striker_idle.png',
    framesCols: 4,
    framesRows: 2,
    framesHold: 15,
    attackBox: { offset: { x: 50, y: 30 }, width: 120, height: 50 }
});

const enemy = new Fighter({
    position: { x: 1000, y: 0 },
    velocity: { x: 0, y: 0 },
    color: '#ff3366',
    name: 'Titan',
    characterType: 'TITAN',
    imageSrc: 'assets/titan_idle.png',
    framesCols: 4,
    framesRows: 2,
    framesHold: 15,
    attackBox: { offset: { x: -110, y: 30 }, width: 120, height: 50 }
});

const keys = {
    a: { pressed: false },
    d: { pressed: false },
    w: { pressed: false },
    ArrowRight: { pressed: false },
    ArrowLeft: { pressed: false },
    ArrowUp: { pressed: false }
};

function rectangularCollision({ rectangle1, rectangle2 }) {
    return (
        rectangle1.attackBox.position.x + rectangle1.attackBox.width >= rectangle2.position.x &&
        rectangle1.attackBox.position.x <= rectangle2.position.x + rectangle2.width &&
        rectangle1.attackBox.position.y + rectangle1.attackBox.height >= rectangle2.position.y &&
        rectangle1.attackBox.position.y <= rectangle2.position.y + rectangle2.height
    );
}

let round = 1;
let gameActive = false;
let p1Wins = 0;
let p2Wins = 0;
let timer = 99;
let timerId;

function decreaseTimer() {
    if (timer > 0) {
        timerId = setTimeout(decreaseTimer, 1000);
        timer--;
        document.querySelector('#round-timer').innerText = timer;
    }

    if (timer === 0) {
        determineWinner({ player, enemy, timerId });
    }
}

function screenShake() {
    document.querySelector('#game-ui').classList.add('shake');
    setTimeout(() => {
        document.querySelector('#game-ui').classList.remove('shake');
    }, 200);
}

function determineWinner({ player, enemy, timerId }) {
    clearTimeout(timerId);
    gameActive = false;
    const announcer = document.querySelector('#game-announcer');
    const text = document.querySelector('#announcer-text');
    announcer.classList.remove('hidden');

    if (player.health === enemy.health) {
        text.innerText = 'TIE';
    } else if (player.health > enemy.health) {
        text.innerText = 'STRIKER WINS';
        p1Wins++;
        updateWinMarkers();
    } else {
        text.innerText = 'TITAN WINS';
        p2Wins++;
        updateWinMarkers();
    }

    if (window.gameAudio) window.gameAudio.playWin();

    if (p1Wins === 2 || p2Wins === 2) {
        text.innerText = p1Wins === 2 ? 'STRIKER IS CHAMPION!' : 'TITAN IS CHAMPION!';
        setTimeout(() => location.reload(), 3000);
    } else {
        setTimeout(nextRound, 2000);
    }
}

function updateWinMarkers() {
    const p1w = document.querySelector('#p1-wins');
    const p2w = document.querySelector('#p2-wins');
    p1w.innerHTML = ''; p2w.innerHTML = '';
    for (let i = 0; i < p1Wins; i++) p1w.innerHTML += '<div class="marker p1-win"></div>';
    for (let i = 0; i < p2Wins; i++) p2w.innerHTML += '<div class="marker p2-win"></div>';
}

function nextRound() {
    round++;
    document.querySelector('#round-text').innerText = `ROUND ${round}`;
    resetPositions();
    startCountDown();
}

function resetPositions() {
    player.health = 100;
    enemy.health = 100;
    document.querySelector('#p1-hp').style.width = '100%';
    document.querySelector('#p2-hp').style.width = '100%';
    player.position = { x: 200, y: 0 };
    enemy.position = { x: 1000, y: 0 };
    timer = 99;
    document.querySelector('#round-timer').innerText = timer;
}

function startCountDown() {
    const announcer = document.querySelector('#game-announcer');
    const text = document.querySelector('#announcer-text');
    announcer.classList.remove('hidden');
    text.innerText = 'FIGHT!';
    setTimeout(() => {
        announcer.classList.add('hidden');
        gameActive = true;
        clearTimeout(timerId); // Garante que não haverá timers rodando em dobro
        decreaseTimer();
    }, 1000);
}

function animate() {
    window.requestAnimationFrame(animate);
    background.update();

    // Desenhar Chão (Simulado para perspectiva)
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(0, canvas.height - 100, canvas.width, 100);

    // Atualizar direção dog ataques e virar o personagem com base na posição
    if (player.position.x <= enemy.position.x) {
        player.attackBox.offset.x = 50;
        enemy.attackBox.offset.x = -110;
        player.isFacingRight = true;
        enemy.isFacingRight = false;
    } else {
        player.attackBox.offset.x = -110;
        enemy.attackBox.offset.x = 50;
        player.isFacingRight = false;
        enemy.isFacingRight = true;
    }

    player.update();
    enemy.update();

    player.velocity.x = 0;
    enemy.velocity.x = 0;

    // Movimentação P1
    player.isDefending = false;
    if (keys.a.pressed && player.lastKey === 'a') {
        player.velocity.x = -5;
    } else if (keys.d.pressed && player.lastKey === 'd') {
        player.velocity.x = 5;
    }

    // Defesa P1 (Segurar para trás em relação ao inimigo)
    if (player.position.x < enemy.position.x && keys.a.pressed) player.isDefending = true;
    if (player.position.x > enemy.position.x && keys.d.pressed) player.isDefending = true;

    // Movimentação P2
    enemy.isDefending = false;
    if (keys.ArrowLeft.pressed && enemy.lastKey === 'ArrowLeft') {
        enemy.velocity.x = -5;
    } else if (keys.ArrowRight.pressed && enemy.lastKey === 'ArrowRight') {
        enemy.velocity.x = 5;
    }

    // Defesa P2 (Segurar para trás em relação ao player)
    if (enemy.position.x < player.position.x && keys.ArrowLeft.pressed) enemy.isDefending = true;
    if (enemy.position.x > player.position.x && keys.ArrowRight.pressed) enemy.isDefending = true;

    // Detecção de Hit P1 -> P2
    if (gameActive && player.isAttacking && rectangularCollision({ rectangle1: player, rectangle2: enemy })) {
        player.isAttacking = false;
        if (!enemy.isDefending) {
            enemy.health -= 5;
            document.querySelector('#p2-hp').style.width = enemy.health + '%';
            screenShake();
            if (window.gameAudio) window.gameAudio.playHit();
        }
    }

    // Detecção de Hit P2 -> P1
    if (gameActive && enemy.isAttacking && rectangularCollision({ rectangle1: enemy, rectangle2: player })) {
        enemy.isAttacking = false;
        if (!player.isDefending) {
            player.health -= 5;
            document.querySelector('#p1-hp').style.width = player.health + '%';
            screenShake();
            if (window.gameAudio) window.gameAudio.playHit();
        }
    }

    // Condição de fim de round
    if (gameActive && (enemy.health <= 0 || player.health <= 0)) {
        determineWinner({ player, enemy, timerId });
    }

    // Limites da tela simples
    if (player.position.x < 0) player.position.x = 0;
    if (player.position.x + player.width > canvas.width) player.position.x = canvas.width - player.width;
    if (enemy.position.x < 0) enemy.position.x = 0;
    if (enemy.position.x + enemy.width > canvas.width) enemy.position.x = canvas.width - enemy.width;

    // Colisão de corpo (evitar que se atravessem)
    for (let i = 0; i < 2; i++) {
        const isYColliding = player.position.y + player.height >= enemy.position.y &&
                             player.position.y <= enemy.position.y + enemy.height;
        if (isYColliding) {
            const p1Center = player.position.x + player.width / 2;
            const p2Center = enemy.position.x + enemy.width / 2;
            const distance = Math.abs(p1Center - p2Center);
            const minDistance = (player.width + enemy.width) / 2;

            if (distance < minDistance) {
                const overlap = minDistance - distance;
                let pushP1 = true;
                let pushP2 = true;
                
                if (player.position.x <= 0 || player.position.x + player.width >= canvas.width) pushP1 = false;
                if (enemy.position.x <= 0 || enemy.position.x + enemy.width >= canvas.width) pushP2 = false;

                if (p1Center < p2Center || (p1Center === p2Center && player.position.x <= enemy.position.x)) {
                    if (pushP1 && pushP2) { player.position.x -= overlap / 2; enemy.position.x += overlap / 2; }
                    else if (pushP1 && !pushP2) { player.position.x -= overlap; }
                    else if (!pushP1 && pushP2) { enemy.position.x += overlap; }
                    else { enemy.position.x += overlap; } 
                } else {
                    if (pushP1 && pushP2) { player.position.x += overlap / 2; enemy.position.x -= overlap / 2; }
                    else if (pushP1 && !pushP2) { player.position.x += overlap; }
                    else if (!pushP1 && pushP2) { enemy.position.x -= overlap; }
                    else { player.position.x += overlap; } 
                }
            }
        }
        
        // Re-aplica limites
        if (player.position.x < 0) player.position.x = 0;
        if (player.position.x + player.width > canvas.width) player.position.x = canvas.width - player.width;
        if (enemy.position.x < 0) enemy.position.x = 0;
        if (enemy.position.x + enemy.width > canvas.width) enemy.position.x = canvas.width - enemy.width;
    }
}

animate();

window.addEventListener('keydown', (event) => {
    // Ignora eventos gerados por "segurar a tecla"
    if (event.repeat) return;

    if (!gameActive && event.key !== ' ') return;

    switch (event.key) {
        // P1
        case 'd': keys.d.pressed = true; player.lastKey = 'd'; break;
        case 'a': keys.a.pressed = true; player.lastKey = 'a'; break;
        case 'w': if (player.velocity.y === 0) player.velocity.y = -20; break;
        case 'j': player.attack(); break; // Ataque P1

        // P2
        case 'ArrowRight': keys.ArrowRight.pressed = true; enemy.lastKey = 'ArrowRight'; break;
        case 'ArrowLeft': keys.ArrowLeft.pressed = true; enemy.lastKey = 'ArrowLeft'; break;
        case 'ArrowUp': if (enemy.velocity.y === 0) enemy.velocity.y = -20; break;
        case '1': enemy.attack(); break; // Ataque P2 (Numpad ou Tecla 1)
    }
});

window.addEventListener('keyup', (event) => {
    switch (event.key) {
        case 'd': keys.d.pressed = false; break;
        case 'a': keys.a.pressed = false; break;
        case 'ArrowRight': keys.ArrowRight.pressed = false; break;
        case 'ArrowLeft': keys.ArrowLeft.pressed = false; break;
    }
});

document.querySelector('#start-btn').addEventListener('click', () => {
    document.querySelector('#menu-screen').classList.add('hidden');
    document.querySelector('#hud').classList.remove('hidden');
    if (window.gameAudio) window.gameAudio.start();
    startCountDown();
});
