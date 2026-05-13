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
        playerName = prompt("Introduce tu nombre:", "Jugador");
        document.getElementById('playerNameDisplay').innerText = "Partida de: " + playerName;
        if(!localStorage.getItem('chessCounter')) localStorage.setItem('chessCounter', 1);
        
        // Capturar estado inicial
        moveImages.push(await captureBoardState());
        renderBoard();
    };

    // Función que captura el tablero como Blob
    async function captureBoardState() {
        const canvas = await html2canvas(document.querySelector('.board-wrapper'));
        return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    }

    async function finishGame() {
        if (!window.showDirectoryPicker) {
            alert("Navegador no compatible.");
            return;
        }
        try {
            const dirHandle = await window.showDirectoryPicker();
            const count = localStorage.getItem('chessCounter');
            const name = `${playerName}_${count}`;
            const folderHandle = await dirHandle.getDirectoryHandle(name, {create: true});
            
            // 1. Guardar TXT
            const txtHandle = await folderHandle.getFileHandle(`${name}.txt`, {create: true});
            const writableTxt = await txtHandle.createWritable();
            await writableTxt.write(`Reporte: ${name}\n\nApuntes:\n${document.getElementById('notes').value}\n\nPGN:\n${game.pgn()}`);
            await writableTxt.close();
            
            // 2. Guardar todas las imágenes del array
            for(let i = 0; i < moveImages.length; i++) {
                const imgHandle = await folderHandle.getFileHandle(`movimiento_${i}.png`, {create: true});
                const writableImg = await imgHandle.createWritable();
                await writableImg.write(moveImages[i]);
                await writableImg.close();
            }

            localStorage.setItem('chessCounter', parseInt(count) + 1);
            alert("¡Guardado exitosamente! Se guardaron " + moveImages.length + " imágenes.");
        } catch (err) { console.error(err); alert("Error al guardar."); }
    }

    function renderBoard() {
        const boardEl = document.getElementById('board');
        const svg = document.getElementById('arrowLayer');
        boardEl.innerHTML = ''; boardEl.appendChild(svg);
        const b = game.board();
        const files = 'abcdefgh';
        
        for(let i=0; i<8; i++) {
            for(let j=0; j<8; j++) {
                const sq = b[i][j];
                const coord = files[j] + (8-i);
                const squareEl = document.createElement('div');
                squareEl.className = `square ${(i+j)%2===0 ? 'white' : 'black'}`;
                if (coord === selectedSquare) squareEl.classList.add('selected');
                if (coord === lastMove.from || coord === lastMove.to) squareEl.classList.add('last-move');
                if(sq) squareEl.innerText = pieces[sq.color][sq.type];
                squareEl.onclick = () => handleSquareClick(i, j);
                boardEl.appendChild(squareEl);
            }
        }
        drawArrow();
    }

    async function handleSquareClick(r, c) {
        const files = 'abcdefgh';
        const squareCoord = `${files[c]}${8-r}`;
        if(selectedSquare) {
            const move = game.move({ from: selectedSquare, to: squareCoord, promotion: 'q' });
            if(move) {
                lastMove = { from: move.from, to: move.to };
                // Añadir nota
                const notesEl = document.getElementById('notes');
                const moveCount = Math.ceil(game.history().length / 2);
                notesEl.value += (game.turn() === 'b' ? ` ${move.san}` : `\n${moveCount}. ${move.san}`);
                
                // --- CAPTURA AUTOMÁTICA ---
                moveImages.push(await captureBoardState());
                
                renderBoard();
                if (game.in_checkmate()) setTimeout(finishGame, 500);
            } else {
                const piece = game.get(squareCoord);
                selectedSquare = (piece && piece.color === game.turn()) ? squareCoord : null;
                renderBoard();
            }
            selectedSquare = null;
        } else {
            const piece = game.get(squareCoord);
            if(piece && piece.color === game.turn()) {
                selectedSquare = squareCoord;
                renderBoard();
            }
        }
    }

    // --- Funciones auxiliares ---
    function getSquareCoords(coord) {
        const files = 'abcdefgh';
        const col = files.indexOf(coord[0]);
        const row = 8 - parseInt(coord[1]);
        return { x: col * 100 + 50, y: row * 100 + 50 };
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

    async function undoMove() {
        const move = game.undo();
        if(move) {
            moveImages.pop(); // Quitar la imagen del movimiento deshecho
            document.getElementById('notes').value = document.getElementById('notes').value.replace(new RegExp(`\\s*${move.san}\\s*$`), '');
            const history = game.history({verbose: true});
            lastMove = history.length > 0 ? { from: history[history.length-1].from, to: history[history.length-1].to } : { from: null, to: null };
            renderBoard();
        }
    }

    function redoMove() { /* Nota: Redo requiere rehacer captura, por simplificación esta vez omite redo para asegurar integridad de imágenes */ }

    function toggleOrientation() {
        const isBlack = document.getElementById('colorToggle').checked;
        const label = document.getElementById('colorLabel');
        
        if (isBlack) {
            label.innerHTML = "Jugar como: <b>Negras</b>";
        } else {
            label.innerHTML = "Jugar como: <b>Blancas</b>";
        }
        
        // Volvemos a dibujar el tablero con la nueva orientación
        renderBoard();
    }

// Opcional: Si quieres que la computadora mueva automáticamente 
// cuando elijas negras al inicio, deberías llamar a una función de IA aquí.
