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
    }

    draw() {
        // Personagem
        ctx.fillStyle = this.isDefending ? '#555' : this.color;
        ctx.fillRect(this.position.x, this.position.y, this.width, this.height);

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
        this.draw();
        this.attackBox.position.x = this.position.x + this.attackBox.offset.x;
        this.attackBox.position.y = this.position.y + this.attackBox.offset.y;

        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;

        // Gravidade e Chão
        if (this.position.y + this.height + this.velocity.y >= canvas.height - 100) {
            this.velocity.y = 0;
            this.position.y = canvas.height - 100 - this.height;
        } else {
            this.velocity.y += gravity;
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
    attackBox: { offset: { x: 50, y: 30 }, width: 120, height: 50 }
});

const enemy = new Fighter({
    position: { x: 1000, y: 0 },
    velocity: { x: 0, y: 0 },
    color: '#ff3366',
    name: 'Titan',
    characterType: 'TITAN',
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

function screenShake() {
    document.querySelector('#game-ui').classList.add('shake');
    setTimeout(() => {
        document.querySelector('#game-ui').classList.remove('shake');
    }, 200);
}

function determineWinner({ player, enemy, timerId }) {
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
}

function startCountDown() {
    const announcer = document.querySelector('#game-announcer');
    const text = document.querySelector('#announcer-text');
    announcer.classList.remove('hidden');
    text.innerText = 'FIGHT!';
    setTimeout(() => {
        announcer.classList.add('hidden');
        gameActive = true;
    }, 1000);
}

function animate() {
    window.requestAnimationFrame(animate);
    background.update();

    // Desenhar Chão (Simulado para perspectiva)
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(0, canvas.height - 100, canvas.width, 100);

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
            enemy.health -= 10;
            document.querySelector('#p2-hp').style.width = enemy.health + '%';
            screenShake();
            if (window.gameAudio) window.gameAudio.playHit();
        }
    }

    // Detecção de Hit P2 -> P1
    if (gameActive && enemy.isAttacking && rectangularCollision({ rectangle1: enemy, rectangle2: player })) {
        enemy.isAttacking = false;
        if (!player.isDefending) {
            player.health -= 10;
            document.querySelector('#p1-hp').style.width = player.health + '%';
            screenShake();
            if (window.gameAudio) window.gameAudio.playHit();
        }
    }

    // Condição de fim de round
    if (gameActive && (enemy.health <= 0 || player.health <= 0)) {
        determineWinner({ player, enemy });
    }
}

animate();

window.addEventListener('keydown', (event) => {
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
