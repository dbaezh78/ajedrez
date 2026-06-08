let game = new Chess();
<<<<<<< HEAD
let moveImages = []; // Se mantiene vacío para evitar alterar firmas de inicio si es necesario
=======
>>>>>>> 8a960712a374d3437621d316bf1e746ad9e57463
let lastMove = { from: null, to: null };
let selectedSquare = null;
let playerName = "";

// Variables para el visor interactivo de archivos cargados
let moveHistoryFEN = [];
let lastMoveHistory = [];
let currentPointer = 0;

let indexedFiles = {}; // Diccionario para almacenar los manejadores de archivos locales
let webFilesList = []; // Lista para almacenar el mapa del JSON de la web

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
    
    moveHistoryFEN = [game.fen()];
    lastMoveHistory = [{ from: null, to: null }];
    currentPointer = 0;
    
    renderBoard();

    // Inicialización automática por defecto del modo Local persistente
    handleSourceChange();
};

<<<<<<< HEAD
// Se remueve la lógica interna pesada de html2canvas ya que no procesaremos imágenes
async function captureBoardState() {
    return null;
}

=======
>>>>>>> 8a960712a374d3437621d316bf1e746ad9e57463
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

async function handleSourceChange() {
    const selectedSource = document.querySelector('input[name="sourceOrigin"]:checked').value;
    const actionBtn = document.getElementById('actionSourceBtn');
    const listBoxTitle = document.getElementById('listboxTitleDisplay');
    const listBox = document.getElementById('gamesListBox');
    
    listBox.innerHTML = ""; 

    if (selectedSource === 'local') {
        actionBtn.style.display = 'block';
        actionBtn.textContent = '📁 Seleccionar Carpeta Misapuntes';
        actionBtn.onclick = selectNotesFolder;
        listBoxTitle.textContent = "Partidas Locales:";
        
        try {
            const storedHandle = await getStoredDirectoryHandle();
            if (storedHandle) {
                if (await storedHandle.queryPermission({ mode: 'readwrite' }) === 'granted') {
                    await loadFilesFromHandle(storedHandle);
                }
            }
        } catch (err) { console.error(err); }
        
    } else {
        actionBtn.style.display = 'block';
        actionBtn.textContent = '🔄 Sincronizar Listado Web';
        actionBtn.onclick = loadWebJSONIndex;
        listBoxTitle.textContent = "Partidas en Servidor Web:";
        
        await loadWebJSONIndex();
    }
}

async function loadWebJSONIndex() {
    const listBox = document.getElementById('gamesListBox');
    listBox.innerHTML = "";
    webFilesList = [];

    try {
        const response = await fetch('../Misapuntes/partidas.json');
        if (!response.ok) throw new Error("No se pudo leer el archivo de índice web.");
        
        const data = await response.json();
        webFilesList = data.partidas;

        webFilesList.forEach((partida, index) => {
            const option = document.createElement('option');
            const labelSub = partida.sub ? ` (${partida.sub})` : "";
            option.value = index; 
            option.textContent = `${partida.nombre}${labelSub}`;
            listBox.appendChild(option);
        });
    } catch (err) {
        console.error("Error al sincronizar con el JSON web:", err);
        listBox.innerHTML = "<option disabled>Error al cargar índice web...</option>";
    }
}

async function loadSelectedGameFromList() {
    const selectedSource = document.querySelector('input[name="sourceOrigin"]:checked').value;
    const listBox = document.getElementById('gamesListBox');
    const selectedValue = listBox.value;
    
    if (selectedValue === "") return;

    if (selectedSource === 'local') {
        if (!indexedFiles[selectedValue]) return;
        try {
            const fileHandle = indexedFiles[selectedValue];
            const fileData = await fileHandle.getFile();
            const fileText = await fileData.text();
            parseAndLoadTextGame(fileText);
        } catch (err) { console.error(err); }
    } else {
        const index = parseInt(selectedValue);
        const partidaInfo = webFilesList[index];
        if (!partidaInfo) return;

        try {
            const response = await fetch(`../Misapuntes/${partidaInfo.nombre}.txt`);
            if (!response.ok) throw new Error("No se pudo descargar el archivo de apuntes.");
            const fileText = await response.text();
            parseAndLoadTextGame(fileText);
        } catch (err) {
            console.error(err);
            alert("No se pudo abrir el archivo desde el servidor web.");
        }
    }
}

async function selectNotesFolder() {
    try {
        const directoryHandle = await window.showDirectoryPicker();
        await storeDirectoryHandle(directoryHandle);
        await loadFilesFromHandle(directoryHandle);
    } catch (err) { console.error(err); }
}

async function loadFilesFromHandle(directoryHandle) {
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
}

function parseAndLoadTextGame(text) {
    document.getElementById('notes').value = text;
    try {
        if (text.trim().startsWith('{')) {
            const data = JSON.parse(text);
            document.getElementById('notes').value = data.notes || text;
            moveHistoryFEN = data.historyFEN || [game.fen()];
            lastMoveHistory = data.historyMoves || [{ from: null, to: null }];
        } else {
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

function undoMove() {
    if (moveHistoryFEN.length > 1 && currentPointer === moveHistoryFEN.length - 1) {
        const move = game.undo();
        if(move) {
            moveHistoryFEN.pop(); lastMoveHistory.pop();
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

<<<<<<< HEAD
// --- FUNCIÓN DE GUARDADO OPTIMIZADA: SÓLO ARCHIVO .TXT INTERACTIVO ---
async function finishGame() {
    if (!window.showDirectoryPicker) { alert("Usa Chrome/Edge para guardar."); return; }
    try {
        const handle = await window.showDirectoryPicker();
        const counter = localStorage.getItem('chessCounter');
        const folderName = `${playerName}_${counter}`;
        const subFolder = await handle.getDirectoryHandle(folderName, { create: true });

        // Guardamos única y exclusivamente el archivo .txt estructurado
        const txtFile = await subFolder.getFileHandle(`${folderName}.txt`, { create: true });
        const writableTxt = await txtFile.createWritable();
=======
// --- GUARDADO EXCLUSIVO: Solo descarga el archivo .txt individual en donde tú elijas ---
function finishGame() {
    try {
        const notesValue = document.getElementById('notes').value;
        const pgnValue = game.pgn();
>>>>>>> 8a960712a374d3437621d316bf1e746ad9e57463
        
        const interactivePack = {
            player: playerName,
            notes: notesValue,
            pgn: pgnValue,
            historyFEN: moveHistoryFEN,
            historyMoves: lastMoveHistory
        };
        
<<<<<<< HEAD
        await writableTxt.write(JSON.stringify(interactivePack, null, 2));
        await writableTxt.close();

        localStorage.setItem('chessCounter', parseInt(counter) + 1);
        alert("¡Tus apuntes se han guardado exitosamente en la carpeta!: " + folderName);
        
        // Refrescamos automáticamente la lista local para ver el nuevo archivo indexado de inmediato
        await handleSourceChange();
    } catch (err) { 
        console.error("Error durante el guardado:", err); 
        alert("El guardado fue cancelado.");
=======
        const blob = new Blob([JSON.stringify(interactivePack, null, 2)], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        
        const counter = localStorage.getItem('chessCounter') || "1";
        link.download = `${playerName}_Partida_${counter}.txt`;
        
        link.click();
        URL.revokeObjectURL(link.href);

        localStorage.setItem('chessCounter', parseInt(counter) + 1);
        alert("¡Guardando apuntes! Selecciona la carpeta donde quieres almacenar el archivo .txt");
    } catch (err) {
        console.error("Error al exportar el archivo de apuntes:", err);
>>>>>>> 8a960712a374d3437621d316bf1e746ad9e57463
    }
}

function loadSavedGame(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        parseAndLoadTextGame(e.target.result);
    };
    reader.readAsText(file);
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

function getDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("ChessNotesFolderDB", 1);
        request.onupgradeneeded = e => { e.target.result.createObjectStore("folders"); };
        request.onsuccess = e => resolve(e.target.result);
        request.onerror = e => reject(e.target.error);
    });
}
async function storeDirectoryHandle(handle) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction("folders", "readwrite");
        tx.objectStore("folders").put(handle, "defaultFolder");
        tx.oncomplete = () => resolve(); tx.onerror = e => reject(tx.error);
    });
}
async function getStoredDirectoryHandle() {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction("folders", "readonly");
        const request = tx.objectStore("folders").get("defaultFolder");
        request.onsuccess = () => resolve(request.result); request.onerror = e => reject(tx.error);
    });
}

window.addEventListener('resize', drawArrow);