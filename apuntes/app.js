// Inicialización del juego y tablero
const game = new Chess();
const board = Chessboard('board', {
    draggable: true,
    position: 'start',
    onDrop: onDrop
});

// Manejo de movimientos
function onDrop(source, target) {
    const move = game.move({ from: source, to: target, promotion: 'q' });
    if (move === null) return 'snapback'; // Movimiento ilegal
}

// Función de exportación
document.getElementById('downloadBtn').addEventListener('click', async () => {
    // 1. Descargar imagen del tablero
    const boardElement = document.getElementById('board');
    const canvas = await html2canvas(boardElement);
    const imageLink = document.createElement('a');
    imageLink.download = 'tablero.png';
    imageLink.href = canvas.toDataURL();
    imageLink.click();

    // 2. Descargar archivo .txt con notas y PGN
    const notes = document.getElementById('notes').value;
    const pgn = game.pgn();
    const content = `APUNTES:\n${notes}\n\nPGN:\n${pgn}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const textLink = document.createElement('a');
    textLink.href = URL.createObjectURL(blob);
    textLink.download = 'partida.txt';
    textLink.click();
});