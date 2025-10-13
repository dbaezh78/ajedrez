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
let undoButton;

// Variables para coronación
let promotionModal;
let promotionOptions;
let pendingPromotion = null;

// Variables para controlar el enroque
let castlingRights = {
    white: { kingside: true, queenside: true },
    black: { kingside: true, queenside: true }
};

// Variable para peón al paso
let enPassantTarget = null;

// Almacenar información adicional para deshacer movimientos
let moveDetails = [];

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
//         PEÓN AL PASO (EN PASSANT)
// ===========================================

function isValidEnPassant(pieceCode, start, end) {
    const [startRow, startCol] = start;
    const [endRow, endCol] = end;
    
    // Verificar que sea un peón
    if (pieceCode.toUpperCase() !== 'P') return false;
    
    // Verificar que se mueve diagonalmente una casilla
    const rowDiff = endRow - startRow;
    const colDiff = Math.abs(endCol - startCol);
    
    if (colDiff !== 1 || Math.abs(rowDiff) !== 1) return false;
    
    // Verificar que la casilla de destino esté vacía
    if (boardState[endRow][endCol] !== '') return false;
    
    // Verificar que hay un peón enemigo en la casilla adyacente horizontalmente
    const enemyPawnRow = startRow; // Misma fila
    const enemyPawnCol = endCol;   // Misma columna que el destino
    const enemyPawn = boardState[enemyPawnRow][enemyPawnCol];
    
    if (!enemyPawn || enemyPawn.toUpperCase() !== 'P') return false;
    if (getPieceColor(enemyPawn) === getPieceColor(pieceCode)) return false;
    
    // Verificar que el peón enemigo acaba de moverse dos casillas
    if (enPassantTarget && enPassantTarget.row === enemyPawnRow && enPassantTarget.col === enemyPawnCol) {
        return true;
    }
    
    return false;
}

function executeEnPassant(pieceCode, start, end) {
    const [startRow, startCol] = start;
    const [endRow, endCol] = end;
    
    // Mover el peón
    boardState[endRow][endCol] = pieceCode;
    boardState[startRow][startCol] = '';
    
    // Capturar el peón enemigo (que está en la misma fila inicial, misma columna del destino)
    const capturedPawnRow = startRow;
    const capturedPawnCol = endCol;
    boardState[capturedPawnRow][capturedPawnCol] = '';
}

// ===========================================
//         CORONACIÓN DE PEONES
// ===========================================

function showPromotionModal(row, col, pieceColor) {
    pendingPromotion = { row, col, color: pieceColor };
    promotionModal.style.display = 'block';
}

function hidePromotionModal() {
    promotionModal.style.display = 'none';
    pendingPromotion = null;
}

function handlePromotion(pieceCode) {
    if (!pendingPromotion) return;
    
    const { row, col, color } = pendingPromotion;
    
    // Convertir el código de pieza según el color
    const newPieceCode = color === 'white' ? pieceCode : pieceCode.toLowerCase();
    
    // Reemplazar el peón con la nueva pieza
    boardState[row][col] = newPieceCode;
    
    // Actualizar el DOM
    updateDOM();
    
    // Ocultar el modal
    hidePromotionModal();
    
    // Continuar con el cambio de turno
    completeTurnSwitch();
}

function checkForPromotion(pieceCode, start, end) {
    const [startRow, startCol] = start;
    const [endRow, endCol] = end;
    
    // Verificar si es un peón que llegó al extremo opuesto
    if (pieceCode.toUpperCase() === 'P') {
        const pieceColor = getPieceColor(pieceCode);
        
        // Peón blanco en fila 0 (última fila para blancas)
        if (pieceColor === 'white' && endRow === 0) {
            return true;
        }
        
        // Peón negro en fila 7 (última fila para negras)
        if (pieceColor === 'black' && endRow === 7) {
            return true;
        }
    }
    
    return false;
}

// ===========================================
//         DETECCIÓN DE JAQUE Y JAQUE MATE
// ===========================================

function findKingPosition(color) {
    const kingCode = color === 'white' ? 'K' : 'k';
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if (boardState[row][col] === kingCode) {
                return [row, col];
            }
        }
    }
    return null;
}

function isSquareAttackedBy(square, attackerColor) {
    const [targetRow, targetCol] = square;
    
    // Verificar ataques de peones
    const pawnDirection = attackerColor === 'white' ? -1 : 1;
    const pawnCode = attackerColor === 'white' ? 'P' : 'p';
    
    // Ataques diagonales de peones
    const pawnAttackSquares = [
        [targetRow - pawnDirection, targetCol - 1],
        [targetRow - pawnDirection, targetCol + 1]
    ];
    
    for (const [row, col] of pawnAttackSquares) {
        if (row >= 0 && row < 8 && col >= 0 && col < 8) {
            if (boardState[row][col] === pawnCode) {
                return true;
            }
        }
    }
    
    // Verificar ataques de caballos
    const knightMoves = [
        [2, 1], [2, -1], [-2, 1], [-2, -1],
        [1, 2], [1, -2], [-1, 2], [-1, -2]
    ];
    const knightCode = attackerColor === 'white' ? 'N' : 'n';
    
    for (const [dr, dc] of knightMoves) {
        const row = targetRow + dr;
        const col = targetCol + dc;
        if (row >= 0 && row < 8 && col >= 0 && col < 8) {
            if (boardState[row][col] === knightCode) {
                return true;
            }
        }
    }
    
    // Verificar ataques en línea recta (torres y reinas)
    const straightDirections = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const rookCode = attackerColor === 'white' ? 'R' : 'r';
    const queenCode = attackerColor === 'white' ? 'Q' : 'q';
    
    for (const [dr, dc] of straightDirections) {
        let row = targetRow + dr;
        let col = targetCol + dc;
        
        while (row >= 0 && row < 8 && col >= 0 && col < 8) {
            const piece = boardState[row][col];
            if (piece !== '') {
                if (piece === rookCode || piece === queenCode) {
                    return true;
                }
                break;
            }
            row += dr;
            col += dc;
        }
    }
    
    // Verificar ataques diagonales (alfiles y reinas)
    const diagonalDirections = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
    const bishopCode = attackerColor === 'white' ? 'B' : 'b';
    
    for (const [dr, dc] of diagonalDirections) {
        let row = targetRow + dr;
        let col = targetCol + dc;
        
        while (row >= 0 && row < 8 && col >= 0 && col < 8) {
            const piece = boardState[row][col];
            if (piece !== '') {
                if (piece === bishopCode || piece === queenCode) {
                    return true;
                }
                break;
            }
            row += dr;
            col += dc;
        }
    }
    
    // Verificar ataques de rey
    const kingCode = attackerColor === 'white' ? 'K' : 'k';
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const row = targetRow + dr;
            const col = targetCol + dc;
            if (row >= 0 && row < 8 && col >= 0 && col < 8) {
                if (boardState[row][col] === kingCode) {
                    return true;
                }
            }
        }
    }
    
    return false;
}

function isKingInCheck(color) {
    const kingPosition = findKingPosition(color);
    if (!kingPosition) return false;
    
    const attackerColor = color === 'white' ? 'black' : 'white';
    return isSquareAttackedBy(kingPosition, attackerColor);
}

function hasAnyValidMove(color) {
    for (let startRow = 0; startRow < 8; startRow++) {
        for (let startCol = 0; startCol < 8; startCol++) {
            const pieceCode = boardState[startRow][startCol];
            if (pieceCode && getPieceColor(pieceCode) === color) {
                for (let endRow = 0; endRow < 8; endRow++) {
                    for (let endCol = 0; endCol < 8; endCol++) {
                        if (isValidMove(pieceCode, [startRow, startCol], [endRow, endCol])) {
                            return true;
                        }
                    }
                }
            }
        }
    }
    return false;
}

function isCheckmate(color) {
    return isKingInCheck(color) && !hasAnyValidMove(color);
}

function isStalemate(color) {
    return !isKingInCheck(color) && !hasAnyValidMove(color);
}

function updateTurnDisplay() {
    let displayText = `Turno: ${currentTurn === 'white' ? 'Blancas' : 'Negras'}`;
    
    if (currentTurn === 'gameOver') return;
    
    if (isKingInCheck(currentTurn)) {
        const kingColor = currentTurn === 'white' ? 'BLANCO' : 'NEGRO';
        if (isCheckmate(currentTurn)) {
            displayText = `<span class="checkmate-warning">¡JAQUE MATE! Ganan las ${currentTurn === 'white' ? 'NEGRAS' : 'BLANCAS'}</span>`;
            endGameByCheckmate(currentTurn === 'white' ? 'black' : 'white');
        } else {
            displayText += ` | <span class="check-warning">JAQUE AL REY ${kingColor}</span>`;
        }
    } else if (isStalemate(currentTurn)) {
        displayText = `<span class="stalemate-warning">¡TABLAS POR AHOGADO!</span>`;
        endGameByStalemate();
    }
    
    turnDisplay.innerHTML = displayText;
}

function endGameByCheckmate(winnerColor) {
    if (timerInterval) clearInterval(timerInterval);
    currentTurn = 'gameOver';
    
    whiteButton.disabled = true;
    blackButton.disabled = true;
    undoButton.disabled = true;
    
    setTimeout(() => {
        alert(`¡JAQUE MATE! El jugador ${winnerColor === 'white' ? 'Blanco' : 'Negro'} gana la partida.`);
    }, 100);
}

function endGameByStalemate() {
    if (timerInterval) clearInterval(timerInterval);
    currentTurn = 'gameOver';
    
    whiteButton.disabled = true;
    blackButton.disabled = true;
    undoButton.disabled = true;
    
    setTimeout(() => {
        alert("¡Tablas por ahogado! La partida termina en empate.");
    }, 100);
}

// ===========================================
//         LÓGICA DE ENROQUE
// ===========================================

function updateCastlingRights(pieceCode, start) {
    const [startRow, startCol] = start;
    const color = getPieceColor(pieceCode);
    
    if (pieceCode.toUpperCase() === 'K') {
        castlingRights[color].kingside = false;
        castlingRights[color].queenside = false;
    }
    
    if (pieceCode.toUpperCase() === 'R') {
        if (color === 'white') {
            if (startRow === 7 && startCol === 0) castlingRights.white.queenside = false;
            if (startRow === 7 && startCol === 7) castlingRights.white.kingside = false;
        } else {
            if (startRow === 0 && startCol === 0) castlingRights.black.queenside = false;
            if (startRow === 0 && startCol === 7) castlingRights.black.kingside = false;
        }
    }
}

function isValidCastling(pieceCode, start, end) {
    const [startRow, startCol] = start;
    const [endRow, endCol] = end;
    const color = getPieceColor(pieceCode);
    
    if (pieceCode.toUpperCase() !== 'K') return false;
    if (startRow !== endRow) return false;
    if (Math.abs(startCol - endCol) !== 2) return false;
    
    const isKingside = endCol > startCol;
    
    if (isKingside && !castlingRights[color].kingside) return false;
    if (!isKingside && !castlingRights[color].queenside) return false;
    
    if (isKingInCheck(color)) return false;
    
    const direction = isKingside ? 1 : -1;
    for (let col = startCol + direction; col !== (isKingside ? 7 : 0); col += direction) {
        if (boardState[startRow][col] !== '') return false;
    }
    
    const intermediateCol = startCol + direction;
    if (isSquareAttackedBy([startRow, intermediateCol], color === 'white' ? 'black' : 'white')) return false;
    
    return true;
}

function executeCastling(pieceCode, start, end) {
    const [startRow, startCol] = start;
    const [endRow, endCol] = end;
    const color = getPieceColor(pieceCode);
    const isKingside = endCol > startCol;
    
    boardState[endRow][endCol] = pieceCode;
    boardState[startRow][startCol] = '';
    
    const rookStartCol = isKingside ? 7 : 0;
    const rookEndCol = isKingside ? endCol - 1 : endCol + 1;
    const rookCode = color === 'white' ? 'R' : 'r';
    
    boardState[startRow][rookEndCol] = rookCode;
    boardState[startRow][rookStartCol] = '';
    
    castlingRights[color].kingside = false;
    castlingRights[color].queenside = false;
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

    let isValidBasicMove = false;
    switch (pieceType) {
        case 'P': 
            // Verificar peón al paso primero
            if (isValidEnPassant(pieceCode, start, end)) {
                return !wouldMoveCauseCheck(pieceCode, start, end, pieceColor);
            }
            isValidBasicMove = isValidPawnMove(pieceCode, start, end); 
            break;
        case 'R': isValidBasicMove = isValidRookMove(pieceCode, start, end); break;
        case 'B': isValidBasicMove = isValidBishopMove(pieceCode, start, end); break;
        case 'Q': isValidBasicMove = isValidQueenMove(pieceCode, start, end); break;
        case 'K': 
            if (isValidCastling(pieceCode, start, end)) {
                return !wouldMoveCauseCheck(pieceCode, start, end, pieceColor);
            }
            isValidBasicMove = isValidKingMove(pieceCode, start, end); 
            break;
        case 'N': isValidBasicMove = isValidKnightMove(pieceCode, start, end); break;
        default: return false;
    }
    
    if (!isValidBasicMove) return false;
    
    return !wouldMoveCauseCheck(pieceCode, start, end, pieceColor);
}

function wouldMoveCauseCheck(pieceCode, start, end, pieceColor) {
    const [startRow, startCol] = start;
    const [endRow, endCol] = end;
    
    const originalTargetPiece = boardState[endRow][endCol];
    
    // Simular peón al paso
    let capturedEnPassantPiece = '';
    let capturedEnPassantRow = -1;
    let capturedEnPassantCol = -1;
    
    if (pieceCode.toUpperCase() === 'P' && isValidEnPassant(pieceCode, start, end)) {
        capturedEnPassantRow = startRow;
        capturedEnPassantCol = endCol;
        capturedEnPassantPiece = boardState[capturedEnPassantRow][capturedEnPassantCol];
        boardState[capturedEnPassantRow][capturedEnPassantCol] = '';
    }
    
    boardState[endRow][endCol] = pieceCode;
    boardState[startRow][startCol] = '';
    
    const causesCheck = isKingInCheck(pieceColor);
    
    // Revertir movimiento
    boardState[startRow][startCol] = pieceCode;
    boardState[endRow][endCol] = originalTargetPiece;
    
    // Revertir captura de peón al paso si se simuló
    if (capturedEnPassantPiece !== '') {
        boardState[capturedEnPassantRow][capturedEnPassantCol] = capturedEnPassantPiece;
    }
    
    return causesCheck;
}

function isValidPawnMove(pieceCode, start, end) {
    const [startRow, startCol] = start;
    const [endRow, endCol] = end;
    const direction = (pieceCode === 'P') ? -1 : 1;
    const targetPieceCode = getPieceCode(endRow, endCol);

    const rowDiff = endRow - startRow;
    const colDiff = Math.abs(endCol - startCol);
    
    // Movimiento hacia adelante
    if (colDiff === 0 && rowDiff === direction && targetPieceCode === '') return true;

    // Movimiento inicial de dos casillas
    const isInitialRow = (pieceCode === 'P' && startRow === 6) || (pieceCode === 'p' && startRow === 1);
    const isNextSquareEmpty = getPieceCode(startRow + direction, startCol) === '';
    
    if (isInitialRow && colDiff === 0 && rowDiff === 2 * direction && targetPieceCode === '' && isNextSquareEmpty) return true;
    
    // Captura diagonal normal
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
    undoButton.disabled = true;
    
    alert(`¡Fin del juego! El jugador ${winnerColor === 'white' ? 'Blanco' : 'Negro'} gana por tiempo.`);
}

function updateTimer() {
    if (timerInterval) clearInterval(timerInterval);
    if (currentTurn === 'gameOver' || !gameStarted) return;

    const runningPlayer = currentTurn;

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
    updateTurnDisplay();
    
    if (gameStarted) {
        startButton.disabled = true;
        undoButton.disabled = false;
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

function completeTurnSwitch() {
    currentTurn = (currentTurn === 'white') ? 'black' : 'white';
    updateDOM();
    switchTurnState();
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
    
    movesList.scrollTop = 0;
}

// ===========================================
//         FUNCIONES PARA RETROCEDER JUGADA
// ===========================================

function undoMove() {
    if (!gameStarted || moveHistory.length === 0 || currentTurn === 'gameOver') {
        return;
    }
    
    if (timerInterval) clearInterval(timerInterval);
    
    const lastMoveIndex = moveHistory.length - 1;
    const lastMove = moveHistory[lastMoveIndex];
    
    if (currentTurn === 'white') {
        if (lastMove.black) {
            undoLastMove('black', lastMoveIndex);
            lastMove.black = '';
            currentTurn = 'black';
        } else {
            undoLastMove('white', lastMoveIndex);
            moveHistory.pop();
            moveDetails.pop();
            moveNumber--;
            currentTurn = 'white';
        }
    } else {
        if (lastMove.white) {
            undoLastMove('white', lastMoveIndex);
            lastMove.white = '';
            currentTurn = 'white';
        }
    }
    
    if (moveHistory.length > 0) {
        const currentLastMove = moveHistory[moveHistory.length - 1];
        if (!currentLastMove.white && !currentLastMove.black) {
            moveHistory = [];
            moveDetails = [];
            moveNumber = 1;
            currentTurn = 'white';
            resetCastlingRights();
            enPassantTarget = null;
        }
    } else {
        moveHistory = [];
        moveDetails = [];
        moveNumber = 1;
        currentTurn = 'white';
        resetCastlingRights();
        enPassantTarget = null;
    }
    
    updateDOM();
    renderMoveHistory();
    switchTurnState();
}

function undoLastMove(color, moveIndex) {
    const moveDetail = moveDetails[moveIndex];
    const moveNotation = color === 'white' ? moveHistory[moveIndex].white : moveHistory[moveIndex].black;
    
    if (moveNotation === 'O-O') {
        undoKingsideCastling(color);
    } else if (moveNotation === 'O-O-O') {
        undoQueensideCastling(color);
    } else if (moveNotation.includes('e.p.')) {
        // Revertir peón al paso
        undoEnPassant(moveNotation, moveDetail, color);
    } else {
        undoNormalMove(moveNotation, moveDetail, color);
    }
    
    // Restaurar derechos de enroque
    if (moveDetail.castlingRights) {
        if (color === 'white') {
            castlingRights.white = {...moveDetail.castlingRights.white};
        } else {
            castlingRights.black = {...moveDetail.castlingRights.black};
        }
    }
    
    // Restaurar objetivo de peón al paso
    if (moveDetail.enPassantTarget) {
        enPassantTarget = moveDetail.enPassantTarget;
    }
}

function undoNormalMove(moveNotation, moveDetail, color) {
    const sourceId = moveNotation.substring(0, 2);
    const targetId = moveNotation.substring(2, 4);
    const [startRow, startCol] = idToCoords(sourceId);
    const [endRow, endCol] = idToCoords(targetId);
    
    boardState[startRow][startCol] = moveDetail.piece;
    boardState[endRow][endCol] = moveDetail.capturedPiece || '';
}

function undoEnPassant(moveNotation, moveDetail, color) {
    const sourceId = moveNotation.substring(0, 2);
    const targetId = moveNotation.substring(2, 4);
    const [startRow, startCol] = idToCoords(sourceId);
    const [endRow, endCol] = idToCoords(targetId);
    
    // Restaurar peón que se movió
    boardState[startRow][startCol] = moveDetail.piece;
    boardState[endRow][endCol] = '';
    
    // Restaurar peón capturado (que estaba en la fila inicial)
    const capturedPawnRow = startRow;
    const capturedPawnCol = endCol;
    boardState[capturedPawnRow][capturedPawnCol] = moveDetail.capturedPiece;
}

function undoKingsideCastling(color) {
    if (color === 'white') {
        boardState[7][4] = 'K';
        boardState[7][7] = 'R';
        boardState[7][6] = '';
        boardState[7][5] = '';
    } else {
        boardState[0][4] = 'k';
        boardState[0][7] = 'r';
        boardState[0][6] = '';
        boardState[0][5] = '';
    }
}

function undoQueensideCastling(color) {
    if (color === 'white') {
        boardState[7][4] = 'K';
        boardState[7][0] = 'R';
        boardState[7][2] = '';
        boardState[7][3] = '';
    } else {
        boardState[0][4] = 'k';
        boardState[0][0] = 'r';
        boardState[0][2] = '';
        boardState[0][3] = '';
    }
}

function resetCastlingRights() {
    castlingRights = {
        white: { kingside: true, queenside: true },
        black: { kingside: true, queenside: true }
    };
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
                const pieceColor = getPieceColor(pieceCode);
                const colorClass = pieceColor === 'white' ? 'piece-white' : 'piece-black';
                squareElement.innerHTML = `<span class="piece ${colorClass}">${PIECES[pieceCode]}</span>`;
            } else {
                squareElement.innerHTML = '';
            }
        }
    }
    updateTurnDisplay();
}

function handleSquareClick(event) {
    if (!gameStarted || currentTurn === 'gameOver') return;

    const clickedSquare = event.currentTarget;
    const [endRow, endCol] = idToCoords(clickedSquare.id);
    const targetPieceCode = getPieceCode(endRow, endCol);

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

        // VALIDAR el movimiento
        if (isValidMove(selectedPiece, [startRow, startCol], [endRow, endCol])) {
            
            // --- GUARDAR INFORMACIÓN PARA DESHACER ---
            const capturedPiece = boardState[endRow][endCol];
            const moveDetail = {
                piece: selectedPiece,
                capturedPiece: capturedPiece,
                castlingRights: {
                    white: {...castlingRights.white},
                    black: {...castlingRights.black}
                },
                enPassantTarget: enPassantTarget ? {...enPassantTarget} : null
            };
            
            // --- REGISTRO DE JUGADA ---
            const sourceId = selectedSquare.id;
            const targetId = clickedSquare.id;
            
            let moveNotation;
            let isEnPassant = false;
            
            // Verificar tipo de movimiento especial
            if (selectedPiece.toUpperCase() === 'K' && Math.abs(startCol - endCol) === 2) {
                moveNotation = (endCol > startCol) ? 'O-O' : 'O-O-O';
            } else if (isValidEnPassant(selectedPiece, [startRow, startCol], [endRow, endCol])) {
                moveNotation = sourceId + targetId + ' e.p.';
                isEnPassant = true;
            } else {
                moveNotation = sourceId + targetId;
            }

            if (currentTurn === 'white') {
                moveHistory.push({ number: moveNumber, white: moveNotation, black: '' });
                moveDetails.push(moveDetail);
            } else {
                const lastMove = moveHistory[moveHistory.length - 1];
                lastMove.black = moveNotation;
                moveDetails[moveHistory.length - 1] = moveDetail;
                moveNumber++;
            }
            renderMoveHistory();

            // EJECUTAR el movimiento
            if (selectedPiece.toUpperCase() === 'K' && Math.abs(startCol - endCol) === 2) {
                executeCastling(selectedPiece, [startRow, startCol], [endRow, endCol]);
                enPassantTarget = null;
            } else if (isEnPassant) {
                executeEnPassant(selectedPiece, [startRow, startCol], [endRow, endCol]);
                enPassantTarget = null;
            } else {
                boardState[endRow][endCol] = selectedPiece;
                boardState[startRow][startCol] = '';
                
                // Actualizar derechos de enroque si se mueve rey o torre
                updateCastlingRights(selectedPiece, [startRow, startCol]);
                
                // Establecer objetivo de peón al paso si un peón avanza dos casillas
                if (selectedPiece.toUpperCase() === 'P' && Math.abs(startRow - endRow) === 2) {
                    enPassantTarget = {
                        row: endRow,
                        col: endCol,
                        color: getPieceColor(selectedPiece)
                    };
                } else {
                    enPassantTarget = null;
                }
            }

            // Limpiar la selección
            selectedSquare.classList.remove('selected');
            selectedSquare = null;
            selectedPiece = null;
            
            // Verificar coronación de peón
            if (checkForPromotion(boardState[endRow][endCol], [startRow, startCol], [endRow, endCol])) {
                showPromotionModal(endRow, endCol, currentTurn);
            } else {
                completeTurnSwitch();
            }
            
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
    
    ranks.innerHTML = '';
    files.innerHTML = '';
    
    for (let i = 8; i >= 1; i--) {
        const rankLabel = document.createElement('div');
        rankLabel.className = 'rank-label';
        rankLabel.textContent = i;
        ranks.appendChild(rankLabel);
    }
    
    const fileLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    fileLetters.forEach(letter => {
        const fileLabel = document.createElement('div');
        fileLabel.className = 'file-label';
        fileLabel.textContent = letter;
        files.appendChild(fileLabel);
    });
}

function createBoard() {
    const board = document.getElementById('chessboard');
    
    whiteButton = document.getElementById('white-button');
    blackButton = document.getElementById('black-button');
    whiteTimerDisplay = document.getElementById('white-timer-display');
    blackTimerDisplay = document.getElementById('black-timer-display');
    turnDisplay = document.getElementById('turn-display');
    movesList = document.getElementById('moves-list');
    startButton = document.getElementById('start-button');
    undoButton = document.getElementById('undo-button');
    promotionModal = document.getElementById('promotion-modal');
    promotionOptions = document.querySelectorAll('.promotion-option');

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

    startButton.addEventListener('click', () => {
        if (!gameStarted) {
            gameStarted = true;
            switchTurnState();
        }
    });

    undoButton.addEventListener('click', undoMove);

    promotionOptions.forEach(option => {
        option.addEventListener('click', () => {
            const pieceCode = option.getAttribute('data-piece');
            handlePromotion(pieceCode);
        });
    });

    window.addEventListener('click', (event) => {
        if (event.target === promotionModal) {
            hidePromotionModal();
            if (pendingPromotion) {
                completeTurnSwitch();
            }
        }
    });

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
    
    createCoordinates();
    
    updateDOM();
    whiteTimerDisplay.textContent = formatTime(whiteTimeLeft);
    blackTimerDisplay.textContent = formatTime(blackTimeLeft);
    
    whiteButton.disabled = true;
    blackButton.disabled = true;
    undoButton.disabled = true;
}

// Iniciar el juego al cargar el script
document.addEventListener('DOMContentLoaded', createBoard);