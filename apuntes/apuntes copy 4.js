let game = new Chess();
let moveHistoryFEN = []; // Guardará el texto de las posiciones
let lastMoveHistory = []; // Guardará el rastro de las casillas
let currentPointer = 0; // Puntero para navegar atrás y adelante
let lastMove = { from: null, to: null };
let selectedSquare = null;
let playerName = "";

// Tus hermosas piezas locales originales intactas
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
    
    // Inicializar estados base
    moveHistoryFEN = [game.fen()];
    lastMoveHistory = [{ from: null, to: null }];
    currentPointer = 0;
    
    renderBoard();
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

function handleSquareClick(square) {
    // Si estamos explorando el historial hacia atrás, bloqueamos nuevos movimientos directos
    if (currentPointer < moveHistoryFEN.length - 1) return;

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
            
            // Guardamos el paso en memoria de texto plano
            moveHistoryFEN.push(game.fen());
            lastMoveHistory.push({ from: move.from, to: move.to });
            currentPointer = moveHistoryFEN.length - 1;
            
            renderBoard();

            if (game.in_checkmate()) {
                setTimeout(() => { alert("¡Jaque Mate!"); }, 300);
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

// --- NAVEGACIÓN DINÁMICA CON TUS BOTONES AZULES ---
function undoMove() {
    if (currentPointer > 0) {
        currentPointer--;
        game.load(moveHistoryFEN[currentPointer]);
        lastMove = lastMoveHistory[currentPointer];
        renderBoard();
    }
}

function redoMove() {
    if (currentPointer < moveHistoryFEN.length - 1) {
        currentPointer++;
        game.load(moveHistoryFEN[currentPointer]);
        lastMove = lastMoveHistory[currentPointer];
        renderBoard();
    }
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
    if (lastMove && lastMove.from && lastMove.to) {
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

// --- GUARDA ÚNICAMENTE UN ARCHIVO DE TEXTO INTELIGENTE Y COMPACTO ---
async function finishGame() {
    try {
        const notesValue = document.getElementById('notes').value;
        const pgnValue = game.pgn();
        
        // Empaquetamos las notas, el PGN y todo el árbol de texto FEN/Rastros dentro del string
        const saveData = {
            player: playerName,
            notes: notesValue,
            pgn: pgnValue,
            historyFEN: moveHistoryFEN,
            historyMoves: lastMoveHistory
        };

        const blob = new Blob([JSON.stringify(saveData, null, 2)], { type: 'text/plain' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Jugada_${playerName}.txt`;
        link.click();
        
        alert("¡Tus apuntes interactivos se han guardado exitosamente!");
    } catch (err) {
        console.error(err);
        alert("Ocurrió un error al exportar el archivo de apuntes.");
    }
}

// --- NUEVA FUNCIÓN INTERACTIVA: Carga una partida de apuntes guardada ---
function loadSavedGame(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            playerName = data.player || "Jugador";
            document.getElementById('playerNameDisplay').innerText = "Partida de: " + playerName;
            document.getElementById('notes').value = data.notes || "";
            
            // Reconstruimos el árbol interactivo de datos
            moveHistoryFEN = data.historyFEN;
            lastMoveHistory = data.historyMoves;
            
            // Colocamos el tablero en la jugada inicial listos para repasar
            currentPointer = 0;
            game.load(moveHistoryFEN[0]);
            lastMove = lastMoveHistory[0];
            
            renderBoard();
            alert("¡Apuntes interactivos cargados! Usa los botones azulados de Atrás y Adelante para repasar la posición de las fichas.");
        } catch (err) {
            alert("El archivo seleccionado no corresponde a un formato de apuntes válido.");
        }
    };
    reader.readAsText(file);
}