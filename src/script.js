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
    return null; // No debería pasar
}

function isSquareAttackedBy(square, attackerColor) {
    const [targetRow, targetCol] = square;
    
    // Verificar ataques de peones
    const pawnDirection = attackerColor === 'white' ? -1 : 1;
    const pawnCode = attackerColor === 'white' ? 'P' : 'p';
    
    // Ataques diagonales de peones
    const pawnAttackSquares = [
        [targetRow + pawnDirection, targetCol - 1],
        [targetRow + pawnDirection, targetCol + 1]
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
                break; // Pieza bloqueando el camino
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
                break; // Pieza bloqueando el camino
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
    // Buscar todas las piezas del color
    for (let startRow = 0; startRow < 8; startRow++) {
        for (let startCol = 0; startCol < 8; startCol++) {
            const pieceCode = boardState[startRow][startCol];
            if (pieceCode && getPieceColor(pieceCode) === color) {
                
                // Verificar todos los posibles movimientos para esta pieza
                for (let endRow = 0; endRow < 8; endRow++) {
                    for (let endCol = 0; endCol < 8; endCol++) {
                        if (isValidMove(pieceCode, [startRow, startCol], [endRow, endCol])) {
                            return true; // Encontró al menos un movimiento válido
                        }
                    }
                }
            }
        }
    }
    return false; // No hay movimientos válidos
}

function isCheckmate(color) {
    return isKingInCheck(color) && !hasAnyValidMove(color);
}

function isStalemate(color) {
    return !isKingInCheck(color) && !hasAnyValidMove(color);
}

function updateTurnDisplay() {
    let displayText = `Turno: ${currentTurn === 'white' ? 'Blancas' : 'Negras'}`;
    
    // Verificar si el rey del jugador actual está en jaque
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

    // Verificar movimiento básico según el tipo de pieza
    let isValidBasicMove = false;
    switch (pieceType) {
        case 'P': isValidBasicMove = isValidPawnMove(pieceCode, start, end); break;
        case 'R': isValidBasicMove = isValidRookMove(pieceCode, start, end); break;
        case 'B': isValidBasicMove = isValidBishopMove(pieceCode, start, end); break;
        case 'Q': isValidBasicMove = isValidQueenMove(pieceCode, start, end); break;
        case 'K': isValidBasicMove = isValidKingMove(pieceCode, start, end); break;
        case 'N': isValidBasicMove = isValidKnightMove(pieceCode, start, end); break;
        default: return false;
    }
    
    if (!isValidBasicMove) return false;
    
    // Verificar que el movimiento no deje al rey en jaque
    return !wouldMoveCauseCheck(pieceCode, start, end, pieceColor);
}

function wouldMoveCauseCheck(pieceCode, start, end, pieceColor) {
    const [startRow, startCol] = start;
    const [endRow, endCol] = end;
    
    // Guardar el estado original
    const originalTargetPiece = boardState[endRow][endCol];
    
    // Simular el movimiento
    boardState[endRow][endCol] = pieceCode;
    boardState[startRow][startCol] = '';
    
    // Verificar si el rey está en jaque después del movimiento
    const causesCheck = isKingInCheck(pieceColor);
    
    // Revertir el movimiento simulado
    boardState[startRow][startCol] = pieceCode;
    boardState[endRow][endCol] = originalTargetPiece;
    
    return causesCheck;
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
    undoButton.disabled = true;
    
    alert(`¡Fin del juego! El jugador ${winnerColor === 'white' ? 'Blanco' : 'Negro'} gana por tiempo.`);
}

function updateTimer() {
    if (timerInterval) clearInterval(timerInterval);
    if (currentTurn === 'gameOver' || !gameStarted) return;

    const runningPlayer = (currentTurn === 'black') ? 'black' : 'white';


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
    updateTurnDisplay(); // Actualizar display con posible mensaje de jaque
    
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
    // Cambiar el turno y actualizar el estado
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
    
    // Mantener el scroll en la parte superior
    movesList.scrollTop = 0;
}

// ===========================================
//         FUNCIÓN DE RETROCEDER JUGADA
// ===========================================

function undoMove() {
    if (!gameStarted || moveHistory.length === 0 || currentTurn === 'gameOver') {
        return;
    }
    
    // Detener el temporizador
    if (timerInterval) clearInterval(timerInterval);
    
    // Revertir el último movimiento
    if (currentTurn === 'white') {
        // Si es turno de blancas, revertir el movimiento de negras
        const lastMove = moveHistory[moveHistory.length - 1];
        if (lastMove.black) {
            const sourceId = lastMove.black.substring(0, 2);
            const targetId = lastMove.black.substring(2, 4);
            const [startRow, startCol] = idToCoords(sourceId);
            const [endRow, endCol] = idToCoords(targetId);
            
            // Guardar la pieza capturada (si había)
            const capturedPiece = boardState[startRow][startCol];
            
            // Mover la pieza de vuelta
            boardState[startRow][startCol] = boardState[endRow][endCol];
            boardState[endRow][endCol] = capturedPiece || '';
            
            // Remover el movimiento de negras
            lastMove.black = '';
            currentTurn = 'black';
        } else {
            // Si no hay movimiento de negras, revertir el movimiento de blancas
            moveHistory.pop();
            moveNumber--;
            currentTurn = 'white';
        }
    } else {
        // Si es turno de negras, revertir el movimiento de blancas del último turno
        const lastMove = moveHistory[moveHistory.length - 1];
        if (lastMove.white) {
            const sourceId = lastMove.white.substring(0, 2);
            const targetId = lastMove.white.substring(2, 4);
            const [startRow, startCol] = idToCoords(sourceId);
            const [endRow, endCol] = idToCoords(targetId);
            
            // Guardar la pieza capturada (si había)
            const capturedPiece = boardState[startRow][startCol];
            
            // Mover la pieza de vuelta
            boardState[startRow][startCol] = boardState[endRow][endCol];
            boardState[endRow][endCol] = capturedPiece || '';
            
            // Remover el movimiento de blancas
            lastMove.white = '';
            currentTurn = 'white';
        }
    }
    
    // Si después de revertir no quedan movimientos, reiniciar
    if (moveHistory.length === 0 || (moveHistory[moveHistory.length - 1].white === '' && moveHistory[moveHistory.length - 1].black === '')) {
        moveHistory = [];
        moveNumber = 1;
        currentTurn = 'white';
    }
    
    // Actualizar la interfaz
    updateDOM();
    renderMoveHistory();
    switchTurnState();
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
    updateTurnDisplay(); // Actualizar display con posible mensaje de jaque
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
            const capturedPiece = boardState[endRow][endCol];
            boardState[endRow][endCol] = selectedPiece;
            boardState[startRow][startCol] = '';

            // 5. Limpiar la selección
            selectedSquare.classList.remove('selected');
            selectedSquare = null;
            selectedPiece = null;
            
            // 6. Verificar coronación de peón
            if (checkForPromotion(boardState[endRow][endCol], [startRow, startCol], [endRow, endCol])) {
                showPromotionModal(endRow, endCol, currentTurn);
                // No cambiar turno aún, esperar selección de pieza
            } else {
                // Cambiar turno normalmente
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
    undoButton = document.getElementById('undo-button');
    promotionModal = document.getElementById('promotion-modal');
    promotionOptions = document.querySelectorAll('.promotion-option');

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

    // --- LÓGICA DE RETROCEDER ---
    undoButton.addEventListener('click', undoMove);

    // --- LÓGICA DE CORONACIÓN ---
    promotionOptions.forEach(option => {
        option.addEventListener('click', () => {
            const pieceCode = option.getAttribute('data-piece');
            handlePromotion(pieceCode);
        });
    });

    // Cerrar modal si se hace clic fuera de él
    window.addEventListener('click', (event) => {
        if (event.target === promotionModal) {
            hidePromotionModal();
            // Si se cancela la coronación, revertir el movimiento del peón
            if (pendingPromotion) {
                // Aquí podrías implementar la lógica para revertir el movimiento
                // Por ahora simplemente continuamos con el cambio de turno
                completeTurnSwitch();
            }
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
    undoButton.disabled = true;
}

// Iniciar el juego al cargar el script
createBoard();