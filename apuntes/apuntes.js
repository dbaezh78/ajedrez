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
        renderBoard();
        moveImages.push(await captureBoardState());
    };

    async function captureBoardState() {
        const canvas = await html2canvas(document.querySelector('.board-wrapper'));
        return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    }

    function toggleOrientation() {
        const isBlack = document.getElementById('colorToggle').checked;
        const label = document.getElementById('colorLabel');
        
        if (isBlack) {
            label.innerHTML = "Jugando con las: <b>Negras</b>";
        } else {
            label.innerHTML = "Jugando con las: <b>Blancas</b>";
        }
        
        renderBoard();
    }

    function renderBoard() {
        const boardElement = document.getElementById('board');
        const isBlack = document.getElementById('colorToggle').checked;
        
        // Limpiar tablero manteniendo el SVG de las flechas
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
                if (piece) {
                    squareDiv.innerText = pieces[piece.color][piece.type];
                }

                squareDiv.onclick = () => handleSquareClick(squareName);
                boardElement.appendChild(squareDiv);
            });
        });

        updateLabels(isBlack);
        drawArrow();
    }

    function updateLabels(isBlack) {
        const ranks = document.querySelector('.ranks');
        const files = document.querySelector('.files');
        
        const rankValues = isBlack ? [1, 2, 3, 4, 5, 6, 7, 8] : [8, 7, 6, 5, 4, 3, 2, 1];
        const fileValues = isBlack ? ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'] : ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

        if (ranks) ranks.innerHTML = rankValues.map(r => `<div>${r}</div>`).join('');
        if (files) files.innerHTML = fileValues.map(f => `<div>${f}</div>`).join('');
    }

    async function handleSquareClick(square) {
        if (selectedSquare) {
            const move = game.move({ from: selectedSquare, to: square, promotion: 'q' });
            if (move) {
                lastMove = { from: move.from, to: move.to };
                document.getElementById('notes').value += ` ${move.san}`;
                renderBoard();
                moveImages.push(await captureBoardState());
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
        const files = 'abcdefgh';
        let col = files.indexOf(coord[0]);
        let row = parseInt(coord[1]);

        let x, y;
        if (isBlack) {
            // Invertido: 'h' es col 0, fila 1 es arriba
            x = (7 - col) * 100 + 50;
            y = (row - 1) * 100 + 50;
        } else {
            // Normal: 'a' es col 0, fila 8 es arriba
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

    async function undoMove() {
        const move = game.undo();
        if(move) {
            moveImages.pop();
            const history = game.history({verbose: true});
            lastMove = history.length > 0 ? { from: history[history.length-1].from, to: history[history.length-1].to } : { from: null, to: null };
            renderBoard();
        }
    }

    async function finishGame() {
        if (!window.showDirectoryPicker) { alert("Navegador no compatible."); return; }
        try {
            const handle = await window.showDirectoryPicker();
            const counter = localStorage.getItem('chessCounter');
            const folderName = `${playerName}_${counter}`;
            const subFolder = await handle.getDirectoryHandle(folderName, { create: true });

            // Guardar reporte TXT
            const txtFile = await subFolder.getFileHandle(`${folderName}.txt`, { create: true });
            const writableTxt = await txtFile.createWritable();
            const content = `PARTIDA DE: ${playerName}\nNOTAS:\n${document.getElementById('notes').value}\n\nPGN:\n${game.pgn()}`;
            await writableTxt.write(content);
            await writableTxt.close();

            // Guardar Imágenes
            for (let i = 0; i < moveImages.length; i++) {
                const imgFile = await subFolder.getFileHandle(`movimiento_${i}.png`, { create: true });
                const writableImg = await imgFile.createWritable();
                await writableImg.write(moveImages[i]);
                await writableImg.close();
            }

            localStorage.setItem('chessCounter', parseInt(counter) + 1);
            alert("Partida guardada con éxito en la carpeta: " + folderName);
        } catch (err) { console.error(err); }
    }