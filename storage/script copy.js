// --- VARIABLES DE ESTADO DEL JUEGO ---
let selectedSquare = null;
let selectedPiece = null;
let currentTurn = 'white';
let gameStarted = false;

// --- VARIABLES DE REGISTRO Y TIEMPO ---
let moveHistory = [];
let moveNumber = 1;

// Tiempo base de la partida (10 minutos)
const GAME_TIME_SECONDS = 600;

// Contadores de tiempo por jugador
let whiteTimeLeft = GAME_TIME_SECONDS;
let blackTimeLeft = GAME_TIME_SECONDS;
let timerInterval;

// Referencias del DOM
let whiteButton;
let blackButton;
let whiteTimerDisplay;
let blackTimerDisplay;
let turnDisplay;
let movesList;
let startButton;

// Símbolos de las piezas y su código
const PIECES = {
    'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔', 'P': '♙',
    'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚', 'p': '♟'
};

// Representación lógica del tablero (Matriz 8x8)
let boardState = [
    ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
    ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
    ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
];

const boardSize = 8;

// ===========================================
//             FUNCIONES DE UTILIDAD
// ===========================================

function idToCoords(id) {
    const col = id.charCodeAt(0) - 'a'.charCodeAt(0);
    const row = 8 - parseInt(id[1]);
    return [row, col];
}

function coordsToId(row, col) {
    const colLetter = String.fromCharCode('a'.charCodeAt(0) + col);
    const rowNumber = 8 - row;
    return colLetter + rowNumber;
}

function getPieceCode(row, col) {
    if (row >= 0 && row < 8 && col >= 0 && col < 8) {
        return boardState[row][col];
    }
    return '';
}

function getPieceColor(pieceCode) {
    if (!pieceCode) return null;
    return (pieceCode === pieceCode.toUpperCase()) ? 'white' : 'black';
}

// ===========================================
//         LÓGICA DE MOVIMIENTO (REGLAS)
// ===========================================

function isValidMove(pieceCode, start, end) {
    const [endRow, endCol] = end;
    const pieceType = pieceCode.toUpperCase();
    const pieceColor = getPieceColor(pieceCode);
    const targetPieceCode = getPieceCode(endRow, endCol);
    const targetColor = getPieceColor(targetPieceCode);
    
    if (targetColor === pieceColor) {
        return false;
    }

    switch (pieceType) {
        case 'P': return isValidPawnMove(pieceCode, start, end);
        case 'R': return isValidRookMove(pieceCode, start, end);
        case 'B': return isValidBishopMove(pieceCode, start, end);
        case 'Q': return isValidQueenMove(pieceCode, start, end);
        case 'K': return isValidKingMove(pieceCode, start, end);
        case 'N': return isValidKnightMove(pieceCode, start, end);
        default: return false;
    }
}

function isValidPawnMove(pieceCode, start, end) {
    const [startRow, startCol] = start;
    const [endRow, endCol] = end;
    const direction = (pieceCode === 'P') ? -1 : 1;
    const targetPieceCode = getPieceCode(endRow, endCol);

    const rowDiff = endRow - startRow;
    const colDiff = Math.abs(endCol - startCol);
    
    if (colDiff === 0 && rowDiff === direction && targetPieceCode === '') return true;

    const isInitialRow = (pieceCode === 'P' && startRow === 6) || (pieceCode === 'p' && startRow === 1);
    const isNextSquareEmpty = getPieceCode(startRow + direction, startCol) === '';
    
    if (isInitialRow && colDiff === 0 && rowDiff === 2 * direction && targetPieceCode === '' && isNextSquareEmpty) return true;
    
    if (colDiff === 1 && rowDiff === direction && targetPieceCode !== '') return true;

    return false;
}

function isValidRookMove(pieceCode, start, end) {
    const [startRow, startCol] = start;
    const [endRow, endCol] = end;

    if (startRow !== endRow && startCol !== endCol) return false;
    
    if (startRow === endRow) {
        const step = (endCol > startCol) ? 1 : -1;
        for (let col = startCol + step; col !== endCol; col += step) {
            if (getPieceCode(startRow, col) !== '') return false;
        }
    } else {
        const step = (endRow > startRow) ? 1 : -1;
        for (let row = startRow + step; row !== endRow; row += step) {
            if (getPieceCode(row, startCol) !== '') return false;
        }
    }
    return true;
}

function isValidBishopMove(pieceCode, start, end) {
    const [startRow, startCol] = start;
    const [endRow, endCol] = end;

    if (Math.abs(startRow - endRow) !== Math.abs(startCol - endCol)) return false;

    const rowStep = (endRow > startRow) ? 1 : -1;
    const colStep = (endCol > startCol) ? 1 : -1;
    
    let currentRow = startRow + rowStep;
    let currentCol = startCol + colStep;

    while (currentRow !== endRow) {
        if (getPieceCode(currentRow, currentCol) !== '') return false;
        currentRow += rowStep;
        currentCol += colStep;
    }
    return true;
}

function isValidQueenMove(pieceCode, start, end) {
    return isValidRookMove(pieceCode, start, end) || isValidBishopMove(pieceCode, start, end);
}

function isValidKingMove(pieceCode, start, end) {
    const [startRow, startCol] = start;
    const [endRow, endCol] = end;

    const rowDiff = Math.abs(startRow - endRow);
    const colDiff = Math.abs(startCol - endCol);
    
    return rowDiff <= 1 && colDiff <= 1;
}

function isValidKnightMove(pieceCode, start, end) {
    const [startRow, startCol] = start;
    const [endRow, endCol] = end;

    const rowDiff = Math.abs(startRow - endRow);
    const colDiff = Math.abs(startCol - endCol);
    
    return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
}

// ===========================================
//         LÓGICA DE TIEMPO Y TURNO
// ===========================================

function formatTime(seconds) {
    if (seconds < 0) return "0:00";
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

function endGame(winnerColor) {
    if (timerInterval) clearInterval(timerInterval);
    currentTurn = 'gameOver';

    whiteButton.disabled = true;
    blackButton.disabled = true;
    
    alert(`¡Fin del juego! El jugador ${winnerColor === 'white' ? 'Blanco' : 'Negro'} gana por tiempo.`);
}

function updateTimer() {
    if (timerInterval) clearInterval(timerInterval);
    if (currentTurn === 'gameOver' || !gameStarted) return;

    const runningPlayer = (currentTurn === 'white') ? 'black' : 'white';

    timerInterval = setInterval(() => {
        
        if (runningPlayer === 'white') {
            whiteTimeLeft--;
            whiteTimerDisplay.textContent = formatTime(whiteTimeLeft);
            if (whiteTimeLeft <= 0) endGame('black');
        } else {
            blackTimeLeft--;
            blackTimerDisplay.textContent = formatTime(blackTimeLeft);
            if (blackTimeLeft <= 0) endGame('white');
        }
    }, 1000);
}

function switchTurnState() {
    turnDisplay.textContent = `Turno: ${currentTurn === 'white' ? 'Blancas' : 'Negras'}`;
    
    if (gameStarted) {
        startButton.disabled = true;
    }

    if (currentTurn === 'white') {
        whiteButton.disabled = false;
        blackButton.disabled = true;
    } else {
        whiteButton.disabled = true;
        blackButton.disabled = false;
    }
    
    updateTimer();
}

// ===========================================
//         LÓGICA DEL REGISTRO DE JUGADAS
// ===========================================

function renderMoveHistory() {
    movesList.innerHTML = '';
    
    moveHistory.forEach(move => {
        const entry = document.createElement('div');
        entry.classList.add('move-entry');
        
        entry.innerHTML = `
            <span class="move-number">${move.number}.</span>
            <span class="move-white">${move.white}</span>
            <span class="move-black">${move.black}</span>
        `;
        movesList.appendChild(entry);
    });
    movesList.scrollTop = movesList.scrollHeight;
}

// ===========================================
//      ACTUALIZACIÓN DEL DOM Y EVENTOS
// ===========================================

function updateDOM() {
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            const id = coordsToId(row, col);
            const squareElement = document.getElementById(id);
            const pieceCode = boardState[row][col];
            
            if (pieceCode) {
                squareElement.innerHTML = `<span class="piece">${PIECES[pieceCode]}</span>`;
            } else {
                squareElement.innerHTML = '';
            }
        }
    }
    turnDisplay.textContent = `Turno: ${currentTurn === 'white' ? 'Blancas' : 'Negras'}`;
}

function handleSquareClick(event) {
    if (!gameStarted) return;

    const clickedSquare = event.currentTarget;
    const [endRow, endCol] = idToCoords(clickedSquare.id);
    const targetPieceCode = getPieceCode(endRow, endCol);

    if (currentTurn === 'gameOver') return;

    // --- LÓGICA DE SELECCIÓN (Primer Clic) ---
    if (!selectedSquare) {
        const piece = getPieceCode(endRow, endCol);
        if (piece) {
            const pieceColor = getPieceColor(piece);
            
            if (pieceColor !== currentTurn) return;

            selectedSquare = clickedSquare;
            selectedPiece = piece;
            selectedSquare.classList.add('selected');
        }
        
    } 
    // --- LÓGICA DE MOVIMIENTO (Segundo Clic) ---
    else {
        const [startRow, startCol] = idToCoords(selectedSquare.id);
        
        if (clickedSquare === selectedSquare) {
            selectedSquare.classList.remove('selected');
            selectedSquare = null;
            selectedPiece = null;
            return;
        }
        
        // Clic en pieza propia: re-seleccionar
        if (getPieceColor(targetPieceCode) === currentTurn) {
            selectedSquare.classList.remove('selected');
            selectedSquare = clickedSquare;
            selectedPiece = targetPieceCode;
            selectedSquare.classList.add('selected');
            return;
        }

        // 3. VALIDAR el movimiento
        if (isValidMove(selectedPiece, [startRow, startCol], [endRow, endCol])) {
            
            // --- REGISTRO DE JUGADA ---
            const sourceId = selectedSquare.id;
            const targetId = clickedSquare.id;
            const moveNotation = sourceId + targetId;

            if (currentTurn === 'white') {
                moveHistory.push({ number: moveNumber, white: moveNotation, black: '' });
            } else {
                const lastMove = moveHistory[moveHistory.length - 1];
                lastMove.black = moveNotation;
                moveNumber++;
            }
            renderMoveHistory();
            // --------------------------

            // 4. EJECUTAR el movimiento
            boardState[endRow][endCol] = selectedPiece;
            boardState[startRow][startCol] = '';

            // 5. Limpiar la selección
            selectedSquare.classList.remove('selected');
            selectedSquare = null;
            selectedPiece = null;
            
            // 6. Cambiar el turno y actualizar el estado
            currentTurn = (currentTurn === 'white') ? 'black' : 'white';
            updateDOM();
            switchTurnState();
            
        } else {
            // Movimiento no válido
            selectedSquare.classList.remove('selected');
            selectedSquare = null;
            selectedPiece = null;
        }
    }
}

// ===========================================
//         FUNCIONES DE COORDENADAS
// ===========================================

function createCoordinates() {
    const ranks = document.getElementById('ranks');
    const files = document.getElementById('files');
    
    // Limpiar cualquier contenido existente
    ranks.innerHTML = '';
    files.innerHTML = '';
    
    // Crear números (8 al 1) para el lado izquierdo
    for (let i = 8; i >= 1; i--) {
        const rankLabel = document.createElement('div');
        rankLabel.className = 'rank-label';
        rankLabel.textContent = i;
        ranks.appendChild(rankLabel);
    }
    
    // Crear letras (A a H) para la parte inferior
    const fileLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    fileLetters.forEach(letter => {
        const fileLabel = document.createElement('div');
        fileLabel.className = 'file-label';
        fileLabel.textContent = letter;
        files.appendChild(fileLabel);
    });
}

/**
 * Inicializa el tablero y los componentes.
 */
function createBoard() {
    const board = document.getElementById('chessboard');
    
    // ASIGNAR REFERENCIAS DEL DOM (CRUCIAL)
    whiteButton = document.getElementById('white-button');
    blackButton = document.getElementById('black-button');
    whiteTimerDisplay = document.getElementById('white-timer-display');
    blackTimerDisplay = document.getElementById('black-timer-display');
    turnDisplay = document.getElementById('turn-display');
    movesList = document.getElementById('moves-list');
    startButton = document.getElementById('start-button');

    // Manejar el clic en los botones para Pausa
    whiteButton.addEventListener('click', () => {
        if (timerInterval) clearInterval(timerInterval);
        alert("Juego pausado. Pulsa OK para reanudar el tiempo de Negras.");
        updateTimer();
    });
    blackButton.addEventListener('click', () => {
        if (timerInterval) clearInterval(timerInterval);
        alert("Juego pausado. Pulsa OK para reanudar el tiempo de Blancas.");
        updateTimer();
    });

    // --- LÓGICA DE INICIO ---
    startButton.addEventListener('click', () => {
        if (!gameStarted) {
            gameStarted = true;
            switchTurnState();
        }
    });

    // Construir la estructura del tablero
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            const square = document.createElement('div');
            square.classList.add('square');
            
            const isLight = (row + col) % 2 === 0;
            square.classList.add(isLight ? 'light' : 'dark');
            
            const id = coordsToId(row, col);
            square.id = id;

            square.addEventListener('click', handleSquareClick);
            board.appendChild(square);
        }
    }
    
    // Crear coordenadas
    createCoordinates();
    
    // Configuración inicial (Solo DOM)
    updateDOM();
    whiteTimerDisplay.textContent = formatTime(whiteTimeLeft);
    blackTimerDisplay.textContent = formatTime(blackTimeLeft);
    
    // Al inicio, todos los botones de turno están deshabilitados hasta que se presione "Iniciar Partida".
    whiteButton.disabled = true;
    blackButton.disabled = true;
}

// Iniciar el juego al cargar el script
createBoard();