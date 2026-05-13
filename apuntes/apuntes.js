let game = new Chess();
let moveImages = []; // Array para guardar los Blobs de las imágenes
let lastMove = { from: null, to: null };
let selectedSquare = null;
let playerName = "";

const pieces = {
    'w': { 'k': '♔', 'q': '♕', 'r': '♖', 'b': '♗', 'n': '♘', 'p': '♙' },
    'b': { 'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟' }
};

window.onload = async () => {
    playerName = prompt("Tu nombre:", "Jugador");
    document.getElementById('playerNameDisplay').innerText = "Partida de: " + playerName;
    if(!localStorage.getItem('chessCounter')) localStorage.setItem('chessCounter', 1);
    renderBoard();
    // Capturar estado inicial
    moveImages.push(await captureBoardState());
};

async function captureBoardState() {
    const canvas = await html2canvas(document.querySelector('.board-wrapper'));
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
            squareDiv.className = `square ${(row + col) % 2 === 0 ? 'black' : 'white'}`;
            squareDiv.dataset.square = squareName;

            if (selectedSquare === squareName) squareDiv.classList.add('selected');
            if (lastMove.from === squareName || lastMove.to === squareName) squareDiv.classList.add('last-move');

            const piece = game.get(squareName);
            if (piece) squareDiv.innerText = pieces[piece.color][piece.type];

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
            
            // --- Lógica de anotación que ya tienes ---
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

            // ======================================================
            // AQUÍ DEBES PONER LA VERIFICACIÓN DE JAQUE MATE
            // ======================================================
            if (game.in_checkmate()) {
                // Pequeña pausa para que el usuario vea la jugada final antes del cuadro
                setTimeout(() => {
                    alert("¡Jaque Mate! La partida ha terminado.");
                    finishGame(); // Llama a tu función de guardado
                }, 500);
            }
            // ======================================================

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
    // Usamos el tamaño actual para que las flechas coincidan si haces zoom
    const size = document.getElementById('board').clientWidth;
    const squareSize = size / 8;
    const col = 'abcdefgh'.indexOf(coord[0]);
    const row = parseInt(coord[1]);
    let x, y;
    if (isBlack) {
        x = (7 - col) * squareSize + (squareSize / 2);
        y = (row - 1) * squareSize + (squareSize / 2);
    } else {
        x = col * squareSize + (squareSize / 2);
        y = (8 - row) * squareSize + (squareSize / 2);
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
    document.getElementById('colorLabel').innerHTML = isBlack ? "Jugando con las: <b>Negras</b>" : "Jugando con las: <b>Blancas</b>";
    renderBoard();
}

async function undoMove() {
    const move = game.undo();
    if(move) {
        moveImages.pop();
        
        // Limpiar la anotación del cuadro de texto
        const notes = document.getElementById('notes');
        const history = game.history();
        
        if (move.color === 'w') {
            // Eliminar el número y la jugada blanca
            const moveNumber = Math.ceil((history.length + 1) / 2);
            const regex = new RegExp(`(\\n)?${moveNumber}\\.\\s${move.san}$`, 'g');
            notes.value = notes.value.replace(regex, '').trim();
        } else {
            // Eliminar solo la jugada negra
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