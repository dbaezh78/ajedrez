let game = new Chess();
let moveImages = []; // Array para guardar los Blobs de las imágenes
let lastMove = { from: null, to: null };
let selectedSquare = null;
let playerName = "";

// Reemplaza SOLO este bloque al principio de tu apuntes.js
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

window.onload = async () => {
    playerName = prompt("Tu nombre:", "Jugador");
    document.getElementById('playerNameDisplay').innerText = "Partida de: " + playerName;
    if(!localStorage.getItem('chessCounter')) localStorage.setItem('chessCounter', 1);
    renderBoard();
    // Capturar estado inicial
    moveImages.push(await captureBoardState());
};

// --- FUNCIÓN DE CAPTURA MEJORADA PARA RENDERIZAR IMÁGENES SVG ---
async function captureBoardState() {
    // 1. Forzamos una pequeña espera para garantizar que el navegador dibuje las imágenes en el DOM
    await new Promise(resolve => setTimeout(resolve, 100));

    // 2. Buscamos todas las imágenes de las fichas dentro del contenedor
    const images = document.querySelectorAll('.board-wrapper img');
    
    // 3. Mapeamos las promesas de carga de cada pieza para asegurar que estén completamente decodificadas
    const loadPromises = Array.from(images).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve; // Previene bloqueos si una ruta falla
        });
    });
    
    await Promise.all(loadPromises);

    // 4. Ejecutamos html2canvas con los parámetros avanzados de renderizado de imágenes
    const canvas = await html2canvas(document.querySelector('.board-wrapper'), {
        useCORS: true,           // Permite procesar las imágenes locales correctamente
        logging: false,          // Desactiva logs innecesarios en la consola
        allowTaint: true,        // Permite capturar elementos con imágenes mixtas
        backgroundColor: null    // Mantiene la transparencia de fondo si existe
    });

    return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

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
            
            // Regla para a8 clara (blanca)
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
            
            // LÓGICA DE ANOTACIÓN ENUMERADA
            const notesArea = document.getElementById('notes');
            const history = game.history();
            const moveNumber = Math.ceil(history.length / 2);
            
            if (move.color === 'w') { 
                notesArea.value += (notesArea.value ? "\n" : "") + `${moveNumber}. ${move.san}`;
            } else {
                notesArea.value += ` ${move.san}`;
            }
            
            renderBoard();
            moveImages.push(await captureBoardState());

            // DETECCION AUTOMATICA DE JAQUE MATE
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
        moveImages.pop();
        
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

async function finishGame() {
    if (!window.showDirectoryPicker) { alert("Usa Chrome/Edge para guardar."); return; }
    try {
        const handle = await window.showDirectoryPicker();
        const counter = localStorage.getItem('chessCounter');
        const folderName = `${playerName}_${counter}`;
        const subFolder = await handle.getDirectoryHandle(folderName, { create: true });

        const txtFile = await subFolder.getFileHandle(`${folderName}.txt`, { create: true });
        const writableTxt = await txtFile.createWritable();
        await writableTxt.write(`NOTAS:\n${document.getElementById('notes').value}\n\nPGN:\n${game.pgn()}`);
        await writableTxt.close();

        for (let i = 0; i < moveImages.length; i++) {
            const imgFile = await subFolder.getFileHandle(`movimiento_${i}.png`, { create: true });
            const writableImg = await imgFile.createWritable();
            await writableImg.write(moveImages[i]);
            await writableImg.close();
        }

        localStorage.setItem('chessCounter', parseInt(counter) + 1);
        alert("Guardado en: " + folderName);
    } catch (err) { console.error(err); }
}

window.addEventListener('resize', drawArrow);