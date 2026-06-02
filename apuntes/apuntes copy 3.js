let game = new Chess();
let moveHistoryFEN = []; 
let lastMoveHistory = []; 
let moveImages = []; 
let selectedSquare = null;
let lastMove = { from: null, to: null };
let playerName = "";

// RESTAURADO: Tus piezas locales originales intactas, tal como te gustan
const piecesSVG = {
    'w': {
        'k': '<img src="../src/img/wK.svg" style="width:85%; height:85%; pointer-events:none;">',
        'q': '<img src="../src/img/wQ.svg" style="width:85%; height:85%; pointer-events:none;">',
        'r': '<img src="../src/img/wR.svg" style="width:85%; height:85%; pointer-events:none;">',
        'b': '<img src="../src/img/wB.svg" style="width:85%; height:85%; pointer-events:none;">',
        'n': '<img src="../src/img/wN.svg" style="width:85%; height:85%; pointer-events:none;">',
        'p': '<img src="../src/img/wP.svg" style="width:85%; height:85%; pointer-events:none;">'
    },
    'b': {
        'k': '<img src="../src/img/bK.svg" style="width:85%; height:85%; pointer-events:none;">',
        'q': '<img src="../src/img/bQ.svg" style="width:85%; height:85%; pointer-events:none;">',
        'r': '<img src="../src/img/bR.svg" style="width:85%; height:85%; pointer-events:none;">',
        'b': '<img src="../src/img/bB.svg" style="width:85%; height:85%; pointer-events:none;">',
        'n': '<img src="../src/img/bN.svg" style="width:85%; height:85%; pointer-events:none;">',
        'p': '<img src="../src/img/bP.svg" style="width:85%; height:85%; pointer-events:none;">'
    }
};

window.onload = () => {
    playerName = prompt("Tu nombre:", "Jugador");
    document.getElementById('playerNameDisplay').innerText = "Partida de: " + playerName;
    if(!localStorage.getItem('chessCounter')) localStorage.setItem('chessCounter', 1);
    renderBoard();
    
    // Guardamos la posición inicial en texto plano
    moveHistoryFEN.push(game.fen());
    lastMoveHistory.push({ from: null, to: null });
};

function renderBoard() {
    const boardElement = document.getElementById('board');
    const isBlack = document.getElementById('colorToggle').checked;
    boardElement.querySelectorAll('.square').forEach(s => s.remove());

    const rows = isBlack ? [1, 2, 3, 4, 5, 6, 7, 8] : [8, 7, 6, 5, 4, 3, 2, 1];
    const cols = isBlack ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

    rows.forEach((row) => {
        cols.forEach((col) => {
            const squareName = String.fromCharCode(97 + col) + row;
            const squareDiv = document.createElement('div');
            
            const isLightSquare = (row + col) % 2 === 0;
            squareDiv.className = `square ${isLightSquare ? 'white' : 'black'}`;
            squareDiv.dataset.square = squareName;

            if (selectedSquare === squareName) squareDiv.classList.add('selected');
            if (lastMove.from === squareName || lastMove.to === squareName) squareDiv.classList.add('last-move');

            const piece = game.get(squareName);
            if (piece) {
                squareDiv.innerHTML = piecesSVG[piece.color][piece.type];
            }

            squareDiv.onclick = () => handleSquareClick(squareName);
            boardElement.appendChild(squareDiv);
        });
    });
    updateLabels(isBlack);
    drawArrow();
}

function updateLabels(isBlack) {
    const rankValues = isBlack ? [1, 2, 3, 4, 5, 6, 7, 8] : [8, 7, 6, 5, 4, 3, 2, 1];
    const fileValues = isBlack ? ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'] : ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    document.querySelector('.ranks').innerHTML = rankValues.map(r => `<div>${r}</div>`).join('');
    document.querySelector('.files').innerHTML = fileValues.map(f => `<div>${f}</div>`).join('');
}

async function handleSquareClick(square) {
    if (selectedSquare) {
        const move = game.move({ from: selectedSquare, to: square, promotion: 'q' });
        if (move) {
            lastMove = { from: move.from, to: move.to };
            
            const notesArea = document.getElementById('notes');
            const history = game.history();
            const moveNumber = Math.ceil(history.length / 2);
            
            if (move.color === 'w') { 
                notesArea.value += (notesArea.value ? "\n" : "") + `${moveNumber}. ${move.san}`;
            } else {
                notesArea.value += ` ${move.san}`;
            }
            
            renderBoard();
            
            // Guardamos el estado del movimiento en texto
            moveHistoryFEN.push(game.fen());
            lastMoveHistory.push({ from: move.from, to: move.to });

            if (game.in_checkmate()) {
                setTimeout(() => {
                    alert("¡Jaque Mate! La partida ha terminado.");
                    finishGame();
                }, 500);
            }
        }
        selectedSquare = null;
    } else {
        const piece = game.get(square);
        if (piece && piece.color === game.turn()) {
            selectedSquare = square;
        }
    }
    renderBoard();
}

function getSquareCoords(coord) {
    const isBlack = document.getElementById('colorToggle').checked;
    const col = 'abcdefgh'.indexOf(coord[0]);
    const row = parseInt(coord[1]);
    let x, y;
    
    if (isBlack) {
        x = (7 - col) * 100 + 50;
        y = (row - 1) * 100 + 50;
    } else {
        x = col * 100 + 50;
        y = (8 - row) * 100 + 50;
    }
    return { x, y };
}

function drawArrow() {
    const line = document.getElementById('arrowLine');
    if (lastMove.from && lastMove.to) {
        const start = getSquareCoords(lastMove.from);
        const end = getSquareCoords(lastMove.to);
        line.setAttribute('x1', start.x); line.setAttribute('y1', start.y);
        line.setAttribute('x2', end.x); line.setAttribute('y2', end.y);
        line.style.display = 'block';
    } else { line.style.display = 'none'; }
}

function toggleOrientation() {
    const isBlack = document.getElementById('colorToggle').checked;
    document.getElementById('colorLabel').innerHTML = isBlack ? "Jugando con: <b>Negras</b>" : "Jugando con: <b>Blancas</b>";
    renderBoard();
}

async function undoMove() {
    const move = game.undo();
    if(move) {
        moveHistoryFEN.pop();
        lastMoveHistory.pop();
        
        const notes = document.getElementById('notes');
        const history = game.history();
        
        if (move.color === 'w') {
            const moveNumber = Math.ceil((history.length + 1) / 2);
            const regex = new RegExp(`(\\n)?${moveNumber}\\.\\s${move.san}$`, 'g');
            notes.value = notes.value.replace(regex, '').trim();
        } else {
            const regex = new RegExp(`\\s${move.san}$`, 'g');
            notes.value = notes.value.replace(regex, '');
        }

        const histVerbose = game.history({verbose: true});
        lastMove = histVerbose.length > 0 ? { from: histVerbose[histVerbose.length-1].from, to: histVerbose[histVerbose.length-1].to } : { from: null, to: null };
        renderBoard();
    }
}

// --- CAPTURA AVANZADA: Asegura la carga de tus piezas locales en el Canvas ---
async function captureBoardState() {
    const boardWrapper = document.querySelector('.board-wrapper');
    const images = boardWrapper.querySelectorAll('img');
    
    // Forzamos al navegador a resolver la carga de cada archivo SVG antes de tirar la foto
    const promises = Array.from(images).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => { img.onload = resolve; img.onerror = resolve; });
    });
    await Promise.all(promises);

    const canvas = await html2canvas(boardWrapper, {
        logging: false,
        backgroundColor: null,
        scale: 1,
        useCORS: true,     // Permite leer las imágenes locales en el lienzo
        allowTaint: true   // Evita que las imágenes locales rompan el canvas
    });
    return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

// --- FUNCIÓN DE GUARDADO COMPLETA ---
async function finishGame() {
    if (!window.showDirectoryPicker) { alert("Usa Chrome/Edge para guardar."); return; }
    
    const currentFEN = game.fen();
    const currentLastMove = { ...lastMove };
    
    try {
        const handle = await window.showDirectoryPicker();
        const counter = localStorage.getItem('chessCounter');
        const folderName = `${playerName}_${counter}`;
        const subFolder = await handle.getDirectoryHandle(folderName, { create: true });

        // 1. Guardamos el archivo de notas .txt primero de manera segura
        const txtFile = await subFolder.getFileHandle(`${folderName}.txt`, { create: true });
        const writableTxt = await txtFile.createWritable();
        await writableTxt.write(`NOTAS:\n${document.getElementById('notes').value}\n\nPGN:\n${game.pgn()}`);
        await writableTxt.close();

        // 2. Reconstruimos los tableros secuencialmente cargando tus imágenes locales
        moveImages = [];
        for (let i = 0; i < moveHistoryFEN.length; i++) {
            game.load(moveHistoryFEN[i]);
            lastMove = lastMoveHistory[i];
            renderBoard();
            
            // Pequeña espera de 120ms para que las piezas se asienten bien en pantalla antes de disparar
            await new Promise(resolve => setTimeout(resolve, 120));
            
            const imageBlob = await captureBoardState();
            moveImages.push(imageBlob);
        }

        // 3. Escribimos las imágenes en la carpeta del disco duro
        for (let i = 0; i < moveImages.length; i++) {
            if (moveImages[i]) {
                const imgFile = await subFolder.getFileHandle(`movimiento_${i}.png`, { create: true });
                const writableImg = await imgFile.createWritable();
                await writableImg.write(moveImages[i]);
                await writableImg.close();
            }
        }

        localStorage.setItem('chessCounter', parseInt(counter) + 1);
        alert("¡Guardado exitoso en la carpeta!: " + folderName);
        
    } catch (err) { 
        console.error("Error crítico durante el guardado:", err);
        alert("Ocurrió un inconveniente con el renderizado gráfico, pero tus apuntes en texto fueron salvados.");
    } finally {
        // Devolvemos el tablero al estado final donde lo dejaste jugando
        game.load(currentFEN);
        lastMove = currentLastMove;
        renderBoard();
    }
}

window.addEventListener('resize', drawArrow);