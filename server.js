const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public')); // Aquí guardaremos nuestras páginas web

let interacciones = 0; // Contador de usuarios

io.on('connection', (socket) => {
    // Cuando alguien se conecta
    console.log('Alguien se ha conectado');

    // Cuando el móvil envía un color
    socket.on('cambiarColor', (color) => {
        interacciones++;
        // Reenviar el color y el contador a la pantalla gigante
        io.emit('actualizarPantalla', { color: color, total: interacciones });
    });
});

http.listen(3000, () => {
    console.log('Servidor corriendo en http://localhost:3000');
});