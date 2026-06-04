let game = new Chess();
let moveImages = []; // Array original para guardar los Blobs de las imágenes
let lastMove = { from: null, to: null };
let selectedSquare = null;
let playerName = "";

// Variables para el visor interactivo de archivos cargados
let moveHistoryFEN = [];
let lastMoveHistory = [];
let currentPointer = 0;
let indexedFiles = {}; // Mapa para recordar los archivos del directorio

// Tus piezas locales originales intactas
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
    
    // Inicializar estados del historial base
    moveHistoryFEN = [game.fen()];
    lastMoveHistory = [{ from: null, to: null }];
    currentPointer = 0;
    
    renderBoard();
    moveImages.push(await captureBoardState());
};

async function captureBoardState() {
    await new Promise(resolve => setTimeout(resolve, 100));
    const canvas = await html2canvas(document.querySelector('.board-wrapper'), {
        logging: false,
        backgroundColor: null,
        useCORS: true,
        allowTaint: true
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
    // Bloquear si estamos revisando jugadas viejas en modo visor
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
            
            renderBoard();
            moveImages.push(await captureBoardState());
            
            // Sincronizar FEN para los botones en caliente
            moveHistoryFEN.push(game.fen());
            lastMoveHistory.push({ from: move.from, to: move.to });
            currentPointer = moveHistoryFEN.length - 1;

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

// --- BOTONES ATRÁS/ADELANTE DUALES (Manejan deshacer clásico y navegación de cargados) ---
function undoMove() {
    if (moveHistoryFEN.length > 1 && currentPointer === moveHistoryFEN.length - 1) {
        // Modo Juego Clásico: Deshacer jugada real
        const move = game.undo();
        if(move) {
            moveImages.pop();
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
            currentPointer = moveHistoryFEN.length - 1;
            renderBoard();
        }
    } else if (currentPointer > 0) {
        // Modo Visor: Navegar hacia atrás en archivo cargado
        currentPointer--;
        game.load(moveHistoryFEN[currentPointer]);
        lastMove = lastMoveHistory[currentPointer];
        renderBoard();
    }
}

function redoMove() {
    // Modo Visor: Avanzar hacia adelante en archivo cargado
    if (currentPointer < moveHistoryFEN.length - 1) {
        currentPointer++;
        game.load(moveHistoryFEN[currentPointer]);
        lastMove = lastMoveHistory[currentPointer];
        renderBoard();
    }
}

// --- CARGADOR INDIVIDUAL ORIGINAL INDEPENDIENTE ---
function loadSavedGame(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        parseAndLoadTextGame(e.target.result, file.name);
    };
    reader.readAsText(file);
}

// --- NUEVO: ESCANEAR MODAL DE LA CARPETA LOCAL "Misapuntes" ---
async function selectNotesFolder() {
    if (!window.showDirectoryPicker) { alert("Tu navegador no soporta lectura de carpetas locales. Usa Chrome o Edge."); return; }
    try {
        const directoryHandle = await window.showDirectoryPicker();
        const listBox = document.getElementById('gamesListBox');
        listBox.innerHTML = ""; 
        indexedFiles = {};       

        for await (const entry of directoryHandle.values()) {
            if (entry.kind === 'file' && entry.name.endsWith('.txt')) {
                const option = document.createElement('option');
                option.value = entry.name;
                option.textContent = entry.name;
                listBox.appendChild(option);
                indexedFiles[entry.name] = entry; 
            }
        }
        if (listBox.options.length === 0) alert("No se encontraron archivos .txt en esa carpeta.");
    } catch (err) {
        console.error(err);
    }
}

// --- NUEVO: CARGAR JUEGO SELECCIONADO DESDE EL LISTBOX ---
async function loadSelectedGameFromList() {
    const selectedFileName = document.getElementById('gamesListBox').value;
    if (!selectedFileName || !indexedFiles[selectedFileName]) return;
    try {
        const fileHandle = indexedFiles[selectedFileName];
        const fileData = await fileHandle.getFile();
        const fileText = await fileData.text();
        parseAndLoadTextGame(fileText, selectedFileName);
    } catch (err) {
        console.error(err);
    }
}

// --- INTERPRETE DE REPASO: Lee tanto texto limpio como anotaciones FEN ---
function parseAndLoadTextGame(text, filename) {
    document.getElementById('notes').value = text;
    
    // Tratamos de ver si el archivo tiene un árbol JSON interactivo empaquetado, si no, cargamos modo básico
    try {
        if (text.trim().startsWith('{')) {
            const data = JSON.parse(text);
            document.getElementById('notes').value = data.notes || text;
            moveHistoryFEN = data.historyFEN || [game.fen()];
            lastMoveHistory = data.historyMoves || [{ from: null, to: null }];
        } else {
            // Si es un archivo txt tradicional de notas, cargamos el PGN si existe
            game.reset();
            moveHistoryFEN = [game.fen()];
            lastMoveHistory = [{ from: null, to: null }];
            
            const pgnInText = text.split(/PGN:/i)[1];
            if (pgnInText) game.load_pgn(pgnInText.trim());
            
            const historyVerbose = game.history({ verbose: true });
            let tempGame = new Chess();
            historyVerbose.forEach(m => {
                tempGame.move(m);
                moveHistoryFEN.push(tempGame.fen());
                lastMoveHistory.push({ from: m.from, to: m.to });
            });
        }
    } catch(e) {
        game.reset();
        moveHistoryFEN = [game.fen()];
        lastMoveHistory = [{ from: null, to: null }];
    }
    
    currentPointer = 0;
    game.load(moveHistoryFEN[0]);
    lastMove = lastMoveHistory[0];
    renderBoard();
}

// --- TU FUNCIÓN DE GUARDADO CLÁSICA DIRECTA A DIRECTORIO INTACTA ---
async function finishGame() {
    if (!window.showDirectoryPicker) { alert("Usa Chrome/Edge para guardar."); return; }
    try {
        const handle = await window.showDirectoryPicker();
        const counter = localStorage.getItem('chessCounter');
        const folderName = `${playerName}_${counter}`;
        const subFolder = await handle.getDirectoryHandle(folderName, { create: true });

        // También incluimos el árbol interactivo en el txt por si quieres cargarlo en el ListBox después
        const txtFile = await subFolder.getFileHandle(`${folderName}.txt`, { create: true });
        const writableTxt = await txtFile.createWritable();
        
        const interactivePack = {
            player: playerName,
            notes: document.getElementById('notes').value,
            pgn: game.pgn(),
            historyFEN: moveHistoryFEN,
            historyMoves: lastMoveHistory
        };
        
        await writableTxt.write(JSON.stringify(interactivePack, null, 2));
        await writableTxt.close();

        for (let i = 0; i < moveImages.length; i++) {
            const imgFile = await subFolder.getFileHandle(`movimiento_${i}.png`, { create: true });
            const writableImg = await imgFile.createWritable();
            await writableImg.write(moveImages[i]);
            await writableImg.close();
        }

        localStorage.setItem('chessCounter', parseInt(counter) + 1);
        alert("Guardado exitoso en la carpeta: " + folderName);
    } catch (err) { console.error(err); }
}

window.addEventListener('resize', drawArrow);