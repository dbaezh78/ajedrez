// --- VARIABLES DE ESTADO DEL JUEGO ---
let selectedSquare = null;
let selectedPiece = null;
let currentTurn = 'white';
let gameStarted = false;

// --- VARIABLES DE REGISTRO Y TIEMPO --
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

// Arreglo para almacenar los detalles de cada jugada (Rastro y botón Volver)
let moveDetails = [];

// Símbolos de las piezas apuntando a tus rutas locales SVG
const PIECES = {
    'R': '<img src="../src/img/wR.svg" style="width:85%; height:85%; pointer-events:none;">',
    'N': '<img src="../src/img/wN.svg" style="width:85%; height:85%; pointer-events:none;">',
    'B': '<img src="../src/img/wB.svg" style="width:85%; height:85%; pointer-events:none;">',
    'Q': '<img src="../src/img/wQ.svg" style="width:85%; height:85%; pointer-events:none;">',
    'K': '<img src="../src/img/wK.svg" style="width:85%; height:85%; pointer-events:none;">',
    'P': '<img src="../src/img/wP.svg" style="width:85%; height:85%; pointer-events:none;">',
    
    'r': '<img src="../src/img/bR.svg" style="width:85%; height:85%; pointer-events:none;">',
    'n': '<img src="../src/img/bN.svg" style="width:85%; height:85%; pointer-events:none;">',
    'b': '<img src="../src/img/bB.svg" style="width:85%; height:85%; pointer-events:none;">',
    'q': '<img src="../src/img/bQ.svg" style="width:85%; height:85%; pointer-events:none;">',
    'k': '<img src="../src/img/bK.svg" style="width:85%; height:85%; pointer-events:none;">',
    'p': '<img src="../src/img/bP.svg" style="width:85%; height:85%; pointer-events:none;">'
};

const boardSize = 8;
let initialBoard = [
    ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
    ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
    [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
    [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
    [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
    [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
    ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
    ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
];

function idToCoords(id) {
    const col = id.charCodeAt(0) - 97;
    const row = 8 - parseInt(id[1]);
    return { row, col };
}

function coordsToId(row, col) {
    const colLetter = String.fromCharCode(97 + col);
    const rowNumber = 8 - row;
    return colLetter + rowNumber;
}

// --- RENDERIZADO DEL TABLERO Y RESALTADOS VISUALES ---
function updateDOM() {
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            const id = coordsToId(row, col);
            const square = document.getElementById(id);
            const pieceCode = initialBoard[row][col];

            // Limpiamos los rastros anteriores
            square.classList.remove('selected', 'last-move', 'possible-move', 'king-in-check');

            if (pieceCode !== ' ') {
                square.innerHTML = PIECES[pieceCode];
            } else {
                square.innerHTML = '';
            }
        }
    }

    // Resalta la pieza que tienes seleccionada para mover en verde
    if (selectedSquare) {
        const selectedElement = document.getElementById(selectedSquare);
        if (selectedElement) {
            selectedElement.classList.add('selected');
        }

        // Puntos guías de jugadas posibles (filtrando jugadas ilegales o que no salvan al rey)
        for (let row = 0; row < boardSize; row++) {
            for (let col = 0; col < boardSize; col++) {
                const targetId = coordsToId(row, col);
                if (targetId !== selectedSquare) {
                    if (isValidMove(selectedSquare, targetId) && !wouldLeaveKingInCheck(selectedSquare, targetId)) {
                        const targetSquare = document.getElementById(targetId);
                        if (targetSquare) {
                            targetSquare.classList.add('possible-move');
                        }
                    }
                }
            }
        }
    }

    // PINTAR EL REY EN ROJO SI ESTÁ EN JAQUE ACTIVO
    if (gameStarted && currentTurn !== 'gameOver') {
        if (isKingInCheck(currentTurn, initialBoard)) {
            const kingSquareId = findKingPosition(currentTurn, initialBoard);
            if (kingSquareId) {
                const kingSquareElement = document.getElementById(kingSquareId);
                if (kingSquareElement) {
                    kingSquareElement.classList.add('king-in-check');
                }
            }
        }
    }

    // Dibuja la marca fija del último movimiento (Amarillo Suave)
    if (moveDetails.length > 0) {
        const lastMove = moveDetails[moveDetails.length - 1];
        highlightLastMove(lastMove.fromId, lastMove.toId);
    }
}

function highlightLastMove(fromId, toId) {
    const fromSquare = document.getElementById(fromId);
    const toSquare = document.getElementById(toId);
    if (fromSquare) fromSquare.classList.add('last-move');
    if (toSquare) toSquare.classList.add('last-move');
}

// --- SELECCIÓN Y PROCESAMIENTO ORDENADO DE CLICS (SIN DELAY VISUAL) ---
function handleSquareClick(event) {
    if (!gameStarted || currentTurn === 'gameOver') return;
    const clickedSquareId = event.currentTarget.id;
    const { row, col } = idToCoords(clickedSquareId);
    const piece = initialBoard[row][col];

    if (selectedSquare === null) {
        // Primer clic: Seleccionar pieza propia
        if (piece !== ' ' && isOwnPiece(piece)) {
            selectedSquare = clickedSquareId;
            selectedPiece = piece;
            updateDOM();
        }
    } else {
        // Segundo clic: Ya hay una pieza seleccionada
        if (selectedSquare === clickedSquareId) {
            // Deseleccionar al pulsar la misma pieza
            selectedSquare = null;
            selectedPiece = null;
            updateDOM();
        } else if (piece !== ' ' && isOwnPiece(piece)) {
            // Cambiar de pieza seleccionada a otra propia
            selectedSquare = clickedSquareId;
            selectedPiece = piece;
            updateDOM();
        } else {
            // Intentar mover a casilla vacía o capturar pieza enemiga
            if (isValidMove(selectedSquare, clickedSquareId) && !wouldLeaveKingInCheck(selectedSquare, clickedSquareId)) {
                executeMove(selectedSquare, clickedSquareId); // Modifica la matriz y actualiza el DOM de inmediato
            } else {
                // Si el movimiento es inválido, limpiamos la selección
                selectedSquare = null;
                selectedPiece = null;
                updateDOM();
            }
        }
    }
}

function isOwnPiece(piece) {
    if (currentTurn === 'white' && piece === piece.toUpperCase()) return true;
    if (currentTurn === 'black' && piece === piece.toLowerCase()) return true;
    return false;
}

function isValidMove(fromId, toId, boardState = initialBoard) {
    const from = idToCoords(fromId);
    const to = idToCoords(toId);
    const piece = boardState[from.row][from.col].toUpperCase();

    const rowDiff = to.row - from.row;
    const colDiff = to.col - from.col;

    const targetPiece = boardState[to.row][to.col];
    
    if (targetPiece !== ' ') {
        const isWhitePiece = boardState[from.row][from.col] === boardState[from.row][from.col].toUpperCase();
        const isTargetWhite = targetPiece === targetPiece.toUpperCase();
        if (isWhitePiece === isTargetWhite) return false;
    }

    switch (piece) {
        case 'P': return validatePawnMove(from, to, rowDiff, colDiff, toId, boardState);
        case 'R': return validateRookMove(from, to, boardState);
        case 'N': return (Math.abs(rowDiff) === 2 && Math.abs(colDiff) === 1) || (Math.abs(rowDiff) === 1 && Math.abs(colDiff) === 2);
        case 'B': return validateBishopMove(from, to, boardState);
        case 'Q': return validateRookMove(from, to, boardState) || validateBishopMove(from, to, boardState);
        case 'K': return validateKingMove(from, to, rowDiff, colDiff, boardState);
    }
    return false;
}

function validatePawnMove(from, to, rowDiff, colDiff, toId, boardState) {
    const color = boardState[from.row][from.col] === 'P' ? 'white' : 'black';
    const direction = color === 'white' ? -1 : 1;
    const startRow = color === 'white' ? 6 : 1;
    const targetPiece = boardState[to.row][to.col];

    if (colDiff === 0) {
        if (rowDiff === direction && targetPiece === ' ') return true;
        if (rowDiff === 2 * direction && from.row === startRow) {
            const middlePiece = boardState[from.row + direction][from.col];
            if (targetPiece === ' ' && middlePiece === ' ') return true;
        }
    } else if (Math.abs(colDiff) === 1 && rowDiff === direction) {
        if (targetPiece !== ' ') return true;
        if (enPassantTarget && toId === enPassantTarget) return true; // Captura al paso
    }
    return false;
}

function validateRookMove(from, to, boardState) {
    if (from.row !== to.row && from.col !== to.col) return false;
    const rowStep = from.row === to.row ? 0 : (to.row > from.row ? 1 : -1);
    const colStep = from.col === to.col ? 0 : (to.col > from.col ? 1 : -1);
    let r = from.row + rowStep;
    let c = from.col + colStep;
    while (r !== to.row || c !== to.col) {
        if (boardState[r][c] !== ' ') return false;
        r += rowStep; c += colStep;
    }
    return true;
}

function validateBishopMove(from, to, boardState) {
    if (Math.abs(to.row - from.row) !== Math.abs(to.col - from.col)) return false;
    const rowStep = to.row > from.row ? 1 : -1;
    const colStep = to.col > from.col ? 1 : -1;
    let r = from.row + rowStep;
    let c = from.col + colStep;
    while (r !== to.row || c !== to.col) {
        if (boardState[r][c] !== ' ') return false;
        r += rowStep; c += colStep;
    }
    return true;
}

function validateKingMove(from, to, rowDiff, colDiff, boardState) {
    if (Math.abs(rowDiff) <= 1 && Math.abs(colDiff) <= 1) return true;
    
    // REGLA DE ENROQUE REVISADA (FIDE)
    if (boardState === initialBoard && rowDiff === 0 && Math.abs(colDiff) === 2) {
        const side = currentTurn;
        const castling = castlingRights[side];
        if (side === 'white' && from.row !== 7) return false;
        if (side === 'black' && from.row !== 0) return false;
        
        // No se puede enrocar si estás en jaque actualmente
        if (isKingInCheck(side, boardState)) return false;

        if (colDiff === 2 && castling.kingside) {
            if (boardState[from.row][5] === ' ' && boardState[from.row][6] === ' ') {
                // No puede pasar por una casilla bajo ataque enemigo
                if (isSquareAttacked(coordsToId(from.row, 5), side, boardState)) return false;
                return true;
            }
        }
        if (colDiff === -2 && castling.queenside) {
            if (boardState[from.row][3] === ' ' && boardState[from.row][2] === ' ' && boardState[from.row][1] === ' ') {
                // No puede pasar por una casilla bajo ataque enemigo
                if (isSquareAttacked(coordsToId(from.row, 3), side, boardState)) return false;
                return true;
            }
        }
    }
    return false;
}

// --- LOGICA DE PROTECCIÓN Y DETECCIÓN DE AMENAZAS ---
function isSquareAttacked(squareId, defendingColor, boardState) {
    for (let r = 0; r < boardSize; r++) {
        for (let c = 0; c < boardSize; c++) {
            const piece = boardState[r][c];
            if (piece !== ' ') {
                const isPieceWhite = piece === piece.toUpperCase();
                const isDefendingWhite = defendingColor === 'white';
                if (isPieceWhite !== isDefendingWhite) {
                    if (isValidMove(coordsToId(r, c), squareId, boardState)) return true;
                }
            }
        }
    }
    return false;
}

function findKingPosition(color, boardState) {
    const kingCode = color === 'white' ? 'K' : 'k';
    for (let r = 0; r < boardSize; r++) {
        for (let c = 0; c < boardSize; c++) {
            if (boardState[r][c] === kingCode) return coordsToId(r, c);
        }
    }
    return null;
}

function isKingInCheck(color, boardState) {
    const kingId = findKingPosition(color, boardState);
    if (!kingId) return false;
    return isSquareAttacked(kingId, color, boardState);
}

function wouldLeaveKingInCheck(fromId, toId) {
    const from = idToCoords(fromId);
    const to = idToCoords(toId);
    let virtualBoard = initialBoard.map(row => [...row]);
    const piece = virtualBoard[from.row][from.col];
    
    if (piece.toUpperCase() === 'P' && Math.abs(to.col - from.col) === 1 && virtualBoard[to.row][to.col] === ' ') {
        const direction = piece === 'P' ? -1 : 1;
        virtualBoard[to.row - direction][to.col] = ' ';
    }
    
    virtualBoard[to.row][to.col] = piece;
    virtualBoard[from.row][from.col] = ' ';
    return isKingInCheck(currentTurn, virtualBoard);
}

// --- SISTEMA REGLAMENTO FIDE: ANÁLISIS DE FIN DE PARTIDA ---
function countLegalMoves(color) {
    let legalMovesCount = 0;
    for (let r = 0; r < boardSize; r++) {
        for (let c = 0; c < boardSize; c++) {
            const piece = initialBoard[r][c];
            if (piece !== ' ') {
                const isPieceWhite = piece === piece.toUpperCase();
                const isColorWhite = color === 'white';
                if (isPieceWhite === isColorWhite) {
                    const fromId = coordsToId(r, c);
                    for (let tr = 0; tr < boardSize; tr++) {
                        for (let tc = 0; tc < boardSize; tc++) {
                            const toId = coordsToId(tr, tc);
                            if (fromId !== toId) {
                                if (isValidMove(fromId, toId) && !wouldLeaveKingInCheck(fromId, toId)) {
                                    legalMovesCount++;
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    return legalMovesCount;
}

// --- EJECUCIÓN DEL MOVIMIENTO SEGURO ---
function executeMove(fromId, toId) {
    const from = idToCoords(fromId);
    const to = idToCoords(toId);
    const p = initialBoard[from.row][from.col];

    let capturedPiece = initialBoard[to.row][to.col];
    let isEnPassant = false;
    let castledSide = null;

    let prevCastling = { white: { ...castlingRights.white }, black: { ...castlingRights.black } };
    let prevEnPassant = enPassantTarget;

    // Procesar captura al paso en la matriz
    if (p.toUpperCase() === 'P' && Math.abs(to.col - from.col) === 1 && capturedPiece === ' ') {
        const direction = p === 'P' ? -1 : 1;
        capturedPiece = initialBoard[to.row - direction][to.col];
        initialBoard[to.row - direction][to.col] = ' ';
        isEnPassant = true;
    }

    // Procesar movimiento de la torre en caso de enroque
    if (p.toUpperCase() === 'K' && Math.abs(to.col - from.col) === 2) {
        if (to.col === 6) {
            initialBoard[from.row][5] = initialBoard[from.row][7];
            initialBoard[from.row][7] = ' ';
            castledSide = 'kingside';
        } else if (to.col === 2) {
            initialBoard[from.row][3] = initialBoard[from.row][0];
            initialBoard[from.row][0] = ' ';
            castledSide = 'queenside';
        }
    }

    // Movemos la pieza físicamente en la matriz
    initialBoard[to.row][to.col] = p;
    initialBoard[from.row][from.col] = ' ';

    // Cancelar derechos de enroques según la pieza movida
    if (p === 'K') { castlingRights.white.kingside = false; castlingRights.white.queenside = false; }
    if (p === 'k') { castlingRights.black.kingside = false; castlingRights.black.queenside = false; }
    if (p === 'R' && from.row === 7 && from.col === 7) castlingRights.white.kingside = false;
    if (p === 'R' && from.row === 7 && from.col === 0) castlingRights.white.queenside = false;
    if (p === 'r' && from.row === 0 && from.col === 7) castlingRights.black.kingside = false;
    if (p === 'r' && from.row === 0 && from.col === 0) castlingRights.black.queenside = false;

    // Habilitar casilla de peligro al paso si corresponde
    let nextEnPassant = null;
    if (p.toUpperCase() === 'P' && Math.abs(to.row - from.row) === 2) {
        const direction = p === 'P' ? -1 : 1;
        nextEnPassant = coordsToId(from.row + direction, from.col);
    }
    enPassantTarget = nextEnPassant;

    // REGISTRO DE DATOS SEGURO PARA EL RASTRO Y EL BOTÓN DESHACER
    moveDetails.push({
        fromId, toId, piece: p, capturedPiece, isEnPassant, castledSide,
        prevCastling, prevEnPassant
    });

    const isPawnPromotion = p.toUpperCase() === 'P' && (to.row === 0 || to.row === 7);
    if (isPawnPromotion) {
        pendingPromotion = { fromId, toId, row: to.row, col: to.col, pieceColor: p === 'P' ? 'white' : 'black' };
        showPromotionModal();
    } else {
        recordMoveText(fromId, toId, p, capturedPiece !== ' ');
        completeTurnSwitch();
    }
}

function recordMoveText(fromId, toId, piece, isCapture) {
    let pName = piece.toUpperCase();
    if (pName === 'P') pName = '';
    let captureSymbol = isCapture ? 'x' : '';
    let moveNotation = `${pName}${captureSymbol}${toId}`;
    if (piece.toUpperCase() === 'P' && isCapture) {
        moveNotation = fromId[0] + 'x' + toId;
    }

    if (currentTurn === 'white') {
        moveHistory.push(`${moveNumber}. ${moveNotation}`);
    } else {
        moveHistory[moveHistory.length - 1] += ` ${moveNotation}`;
        moveNumber++;
    }
    updateMovesListDOM();
}

function updateMovesListDOM() {
    const scrollContainer = movesList.querySelector('.moves-scroll') || movesList;
    const existingBtn = scrollContainer.querySelector('button');
    scrollContainer.innerHTML = moveHistory.map(m => `<div>${m}</div>`).join('');
    if (existingBtn) scrollContainer.appendChild(existingBtn);
    scrollContainer.scrollTop = scrollContainer.scrollHeight;
}

// --- CIERRE DE TURNO Y VALIDACIÓN DE MATE/AHOGADO ---
function completeTurnSwitch() {
    selectedSquare = null;
    selectedPiece = null;
    currentTurn = currentTurn === 'white' ? 'black' : 'white';
    
    const legalMoves = countLegalMoves(currentTurn);
    const inCheck = isKingInCheck(currentTurn, initialBoard);

    if (legalMoves === 0) {
        stopTimer();
        if (inCheck) {
            const winner = currentTurn === 'white' ? 'Negras' : 'Blancas';
            // ACTUALIZADO: Texto exacto en mayúsculas para el fin de la partida
            turnDisplay.innerHTML = `<span style="color: #e74c3c; font-weight: bold;">¡JAQUE MAQUE! Ganan las ${winner}</span>`;
            currentTurn = 'gameOver';
            updateDOM(); // Renderizamos para que el rey quede en rojo bajo el mate
            setTimeout(() => { alert(`¡JAQUE MAQUE! La partida ha terminado. Ganador: ${winner}`); }, 250);
            return;
        } else {
            turnDisplay.innerHTML = `<span style="color: gray; font-weight: bold;">¡TABLAS POR AHOGADO! Empate</span>`;
            currentTurn = 'gameOver';
            updateDOM();
            setTimeout(() => { alert('¡Tablas por Ahogado! Ningún jugador tiene movimientos legales. Empate.'); }, 250);
            return;
        }
    }

    // ACTUALIZADO: Texto exacto en mayúsculas cuando el rey es amenazado ordinariamente
    if (inCheck) {
        const kingName = currentTurn === 'white' ? 'BLANCAS' : 'NEGRAS';
        turnDisplay.innerHTML = `Turno: ${currentTurn === 'white' ? 'Blancas' : 'Negras'} <span style="color: #e74c3c; font-weight: bold;">¡JAQUE AL REY ${kingName}! ⚠️</span>`;
    } else {
        turnDisplay.textContent = `Turno: ${currentTurn === 'white' ? 'Blancas' : 'Negras'}`;
    }
    
    updateDOM(); // Redibuja el tablero limpio incluyendo marcas de rastro estables
    switchTimer();
}

function undoMove() {
    if (moveDetails.length === 0 || currentTurn === 'gameOver') return;
    stopTimer();
    const last = moveDetails.pop();

    const from = idToCoords(last.fromId);
    const to = idToCoords(last.toId);

    initialBoard[from.row][from.col] = last.piece;
    initialBoard[to.row][to.col] = ' ';

    if (last.capturedPiece !== ' ') {
        if (last.isEnPassant) {
            const direction = last.piece === 'P' ? -1 : 1;
            initialBoard[to.row - direction][to.col] = last.capturedPiece;
        } else {
            initialBoard[to.row][to.col] = last.capturedPiece;
        }
    }

    if (last.castledSide) {
        if (last.castledSide === 'kingside') {
            initialBoard[from.row][7] = initialBoard[from.row][5];
            initialBoard[from.row][5] = ' ';
        } else if (last.castledSide === 'queenside') {
            initialBoard[from.row][0] = initialBoard[from.row][3];
            initialBoard[from.row][3] = ' ';
        }
    }

    castlingRights = last.prevCastling;
    enPassantTarget = last.prevEnPassant;

    if (currentTurn === 'white') {
        moveNumber--;
        moveHistory.pop();
    } else {
        const lastIndex = moveHistory.length - 1;
        const parts = moveHistory[lastIndex].split(' ');
        if (parts.length > 2) {
            moveHistory[lastIndex] = parts[0] + ' ' + parts[1];
        } else {
            moveHistory.pop();
        }
    }

    currentTurn = last.piece === last.piece.toUpperCase() ? 'white' : 'black';
    turnDisplay.textContent = `Turno: ${currentTurn === 'white' ? 'Blancas' : 'Negras'}`;
    selectedSquare = null;
    selectedPiece = null;

    updateDOM();
    updateMovesListDOM();

    if (moveDetails.length > 0) undoButton.disabled = false;
    else undoButton.disabled = true;

    startTimerLogic();
}

function showPromotionModal() { promotionModal.style.display = 'flex'; }
function hidePromotionModal() { promotionModal.style.display = 'none'; }

function handlePromotion(pieceCode) {
    if (!pendingPromotion) return;
    const { row, col, pieceColor, fromId, toId } = pendingPromotion;
    const finalPiece = pieceColor === 'white' ? pieceCode.toUpperCase() : pieceCode.toLowerCase();
    initialBoard[row][col] = finalPiece;

    const lastMoveDetail = moveDetails[moveDetails.length - 1];
    let isCap = lastMoveDetail ? lastMoveDetail.capturedPiece !== ' ' : false;

    recordMoveText(fromId, toId, finalPiece, isCap);
    hidePromotionModal();
    pendingPromotion = null;
    completeTurnSwitch();
}

function startTimerLogic() {
    timerInterval = setInterval(() => {
        if (currentTurn === 'white') {
            whiteTimeLeft--;
            whiteTimerDisplay.textContent = formatTime(whiteTimeLeft);
            if (whiteTimeLeft <= 0) endGame('Negras');
        } else {
            blackTimeLeft--;
            blackTimerDisplay.textContent = formatTime(blackTimeLeft);
            if (blackTimeLeft <= 0) endGame('Blancas');
        }
    }, 1000);
}

function switchTimer() {
    clearInterval(timerInterval);
    if (currentTurn === 'white') {
        whiteButton.disabled = false; blackButton.disabled = true;
    } else {
        whiteButton.disabled = true; blackButton.disabled = false;
    }
    startTimerLogic();
    undoButton.disabled = false;
}

function stopTimer() { clearInterval(timerInterval); whiteButton.disabled = true; blackButton.disabled = true; }
function formatTime(seconds) { const m = Math.floor(seconds / 60); const s = seconds % 60; return `${m}:${s < 10 ? '0' : ''}${s}`; }
function endGame(winner) { stopTimer(); gameStarted = false; currentTurn = 'gameOver'; alert(`¡Tiempo agotado! El ganador es: ${winner}`); }

function createCoordinates() {
    const ranksContainer = document.getElementById('ranks');
    const filesContainer = document.getElementById('files');
    ranksContainer.innerHTML = '';
    filesContainer.innerHTML = '';
    for (let i = 8; i >= 1; i--) { const lbl = document.createElement('div'); lbl.className = 'rank-label'; lbl.textContent = i; ranksContainer.appendChild(lbl); }
    const fileLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    fileLetters.forEach(l => { const lbl = document.createElement('div'); lbl.className = 'file-label'; lbl.textContent = l; filesContainer.appendChild(lbl); });
}

document.addEventListener("DOMContentLoaded", () => {
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

    startButton.addEventListener('click', () => {
        if (!gameStarted) {
            gameStarted = true; startButton.disabled = true; startButton.style.opacity = '0.6';
            switchTimer();
        }
    });

    undoButton.addEventListener('click', undoMove);
    promotionOptions.forEach(opt => {
        opt.addEventListener('click', () => {
            const pieceCode = opt.getAttribute('data-piece');
            handlePromotion(pieceCode);
        });
    });

    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            const square = document.createElement('div');
            square.classList.add('square');
            const isLight = (row + col) % 2 === 0;
            square.classList.add(isLight ? 'light' : 'dark');
            square.id = coordsToId(row, col);
            square.addEventListener('click', handleSquareClick);
            board.appendChild(square);
        }
    }
    createCoordinates();
    updateDOM();
    whiteTimerDisplay.textContent = formatTime(whiteTimeLeft);
    blackTimerDisplay.textContent = formatTime(blackTimeLeft);
});