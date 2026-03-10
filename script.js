// --- CONFIGURAZIONE E VARIABILI INIZIALI ---
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyCoWoMUL4SwIoc8zvYTgt32ge01SvD14X5cHyZQsXVb48bUM5OpOaRWHQmZSe5BqJiUw/exec";

// 1. Gestione Nickname
let userNickname = localStorage.getItem('vibeSlot_nick');
if (!userNickname || userNickname === "null") {
    userNickname = prompt("Benvenuto! Inserisci il tuo Nickname:") || "Player" + Math.floor(Math.random() * 1000);
    localStorage.setItem('vibeSlot_nick', userNickname);
}

const baseSymbolData = { '💎': 1000, '🔥': 500, '⭐': 300, '⚡': 150, '🌈': 100, '🔮': 50 };
const gridSymbolData = { '💎': 2000, '🔥': 1000, '⭐': 600, '⚡': 300, '🌈': 150, '🔮': 80 };
const symbols = Object.keys(baseSymbolData);

let score = 150;
let currentMode = '1x3';
let currentMultiplier = 1;
let gridCells = [];
let history = [];

// --- FUNZIONI DI INTERFACCIA ---
function updateScoreUI() {
    const scoreEl = document.getElementById('currentScore');
    if (scoreEl) scoreEl.innerText = `$ ${score.toLocaleString('it-IT')}`;
}

function showPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    if(id === 'infoPage') updateLegend();
}

function updateLegend() {
    const cont = document.getElementById('legendContent');
    const data = currentMode === '1x3' ? baseSymbolData : gridSymbolData;
    let tableHTML = `<table style="width:100%; text-align: center;"><tr><th>TRIS</th><th>1x</th><th>2x</th><th>3x</th><th>5x</th></tr>`;
    for(let s in data) {
        tableHTML += `<tr>
            <td>${s}${s}${s}</td>
            <td>$${data[s].toLocaleString('it-IT')}</td>
            <td>$${(data[s]*2).toLocaleString('it-IT')}</td>
            <td>$${(data[s]*3).toLocaleString('it-IT')}</td>
            <td>$${(data[s]*5).toLocaleString('it-IT')}</td>
        </tr>`;
    }
    tableHTML += `</table>`;
    cont.innerHTML = tableHTML;
}

function setMultiplier(m) {
    if(document.getElementById('spinBtn').disabled) return;
    currentMultiplier = m;
    document.querySelectorAll('.bet-btn').forEach(btn => btn.classList.toggle('active', btn.innerText === m + 'x'));
    updateSpinButtonText();
}

function updateSpinButtonText() {
    const basePrice = currentMode === '3x3' ? 30 : 10;
    document.getElementById('spinBtn').innerText = `SPIN (-$${(basePrice * currentMultiplier).toLocaleString('it-IT')})`;
}

function setMode(mode) {
    if(document.getElementById('spinBtn').disabled) return;
    currentMode = mode;
    score = (mode === '1x3') ? 150 : 300;
    updateScoreUI();
    document.getElementById('btn1x3').classList.toggle('active', mode === '1x3');
    document.getElementById('btn3x3').classList.toggle('active', mode === '3x3');
    const grid = document.getElementById('slotGrid');
    grid.className = `slot-grid grid-${mode}`;
    createCells(mode === '1x3' ? 3 : 9);
    updateSpinButtonText();
}

function createCells(count) {
    const grid = document.getElementById('slotGrid');
    grid.innerHTML = ''; gridCells = [];
    for(let i=0; i<count; i++) {
        const div = document.createElement('div');
        div.className = 'reel'; div.innerText = '🔮';
        grid.appendChild(div); gridCells.push(div);
    }
}

function addHistory(amount) {
    const time = new Date().toLocaleTimeString('it-IT', {hour: '2-digit', minute:'2-digit'});
    history.unshift({ time, amount });
    if(history.length > 5) history.pop();
    document.getElementById('historyList').innerHTML = history.map(h => `
        <div class="history-item ${h.amount > 0 ? 'win' : ''}">
            <span>${h.time}</span>
            <span>${h.amount > 0 ? '+$' + h.amount.toLocaleString('it-IT') : '-'}</span>
        </div>
    `).join('');
}

// --- LOGICA DEL GIOCO ---
function spin() {
    const cost = (currentMode === '3x3' ? 30 : 10) * currentMultiplier;
    if (score < cost) return;
    
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) saveBtn.style.display = 'block';

    score -= cost;
    updateScoreUI();
    
    document.getElementById('spinBtn').disabled = true;
    document.getElementById('message').innerText = "";
    gridCells.forEach(c => { c.classList.remove('winner'); c.classList.add('spinning'); });

    let completed = 0;
    gridCells.forEach((cell, i) => {
        const duration = 600 + (i * 100);
        const startTime = performance.now();
        function anim(now) {
            if (now - startTime < duration) {
                cell.innerText = symbols[Math.floor(Math.random() * symbols.length)];
                requestAnimationFrame(anim);
            } else {
                cell.classList.remove('spinning');
                completed++;
                if (completed === gridCells.length) calculateResult();
            }
        }
        requestAnimationFrame(anim);
    });
}

function calculateResult() {
    let totalWin = 0, lines = [];
    let trisCount = 0;
    const data = currentMode === '1x3' ? baseSymbolData : gridSymbolData;
    const mainFrame = document.getElementById('mainFrame');

    if (currentMode === '1x3') {
        lines.push(gridCells);
    } else {
        lines.push([gridCells[0], gridCells[1], gridCells[2]]);
        lines.push([gridCells[3], gridCells[4], gridCells[5]]);
        lines.push([gridCells[6], gridCells[7], gridCells[8]]);
        lines.push([gridCells[0], gridCells[3], gridCells[6]]);
        lines.push([gridCells[1], gridCells[4], gridCells[7]]);
        lines.push([gridCells[2], gridCells[5], gridCells[8]]);
        lines.push([gridCells[0], gridCells[4], gridCells[8]]);
        lines.push([gridCells[2], gridCells[4], gridCells[6]]);
    }

    lines.forEach(line => {
        const vals = line.map(c => c.innerText);
        if (vals[0] === vals[1] && vals[1] === vals[2]) {
            totalWin += (data[vals[0]] * currentMultiplier);
            line.forEach(c => c.classList.add('winner'));
            trisCount++;
        } else if (currentMode === '1x3') {
            if (vals[0] === vals[1] || vals[1] === vals[2] || vals[0] === vals[2]) {
                totalWin += (20 * currentMultiplier);
                line.forEach(c => {
                    const count = vals.filter(v => v === c.innerText).length;
                    if(count >= 2) c.classList.add('winner');
                });
            }
        }
    });

    score += totalWin;
    updateScoreUI();
    addHistory(totalWin);
    
    const msg = document.getElementById('message');
    if (totalWin > 0) {
        mainFrame.classList.add('shake-anim');
        setTimeout(() => mainFrame.classList.remove('shake-anim'), 300);
        if (totalWin >= 500) createMoneyRain();
        msg.innerText = `VINTI: +$${totalWin.toLocaleString('it-IT')}!`;
    } else {
        msg.innerText = "RIPROVA";
    }
    
    if (document.getElementById('saveBtn').innerText !== "PUNTEGGIO INVIATO ✅") {
        document.getElementById('spinBtn').disabled = false;
    }
}

// --- CLASSIFICA ---
async function inviaPunteggio() {
    if(!confirm("Vuoi inviare $" + score + " in classifica?")) return;

    const payload = {
        nome: userNickname,
        punteggio: score,
        modo: currentMode
    };

    document.getElementById('saveBtn').disabled = true;
    document.getElementById('saveBtn').innerText = "INVIO...";

    try {
        await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(payload)
        });
        
        alert("Punteggio inviato!");
        document.getElementById('saveBtn').innerText = "PUNTEGGIO INVIATO ✅";
    } catch (e) {
        alert("Errore invio!");
        document.getElementById('saveBtn').disabled = false;
        document.getElementById('saveBtn').innerText = "🏆 INVIA PUNTEGGIO";
    }
}

function createMoneyRain() {
    const rainSymbols = ['💸', '💰', '💎', '💵'];
    for (let i = 0; i < 30; i++) {
        setTimeout(() => {
            const el = document.createElement('div');
            el.className = 'money-rain';
            el.innerText = rainSymbols[Math.floor(Math.random() * rainSymbols.length)];
            el.style.left = Math.random() * 100 + 'vw';
            document.body.appendChild(el);
            setTimeout(() => el.remove(), 3000);
        }, i * 100);
    }
}

// --- EVENTI ---
window.addEventListener('keydown', (e) => { 
    if(e.code === 'Space') { 
        e.preventDefault(); 
        if(!document.getElementById('spinBtn').disabled) spin(); 
    }
});

window.onload = () => { 
    createCells(3); 
    updateScoreUI(); 
    updateSpinButtonText(); 
};