const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// 1. Configuración de la base de datos (lo que ya tenías)
const db = new sqlite3.Database('./interacciones.db');
db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS clicks (id INTEGER PRIMARY KEY AUTOINCREMENT, color TEXT, fecha DATETIME DEFAULT CURRENT_TIMESTAMP)");
});

// 2. Servir los archivos de tu carpeta 'public'
app.use(express.static('public'));

// 3. Lógica de Sockets (tu código de la imagen)
io.on('connection', (socket) => {
    console.log('¡Nuevo usuario conectado!');

    // Enviar total al conectar
    db.get("SELECT COUNT(*) AS total FROM clicks", (err, row) => {
        if (!err) {
            socket.emit('actualizarPantalla', { 
                color: '#000000', 
                total: row.total || 0 
            });
        }
    });

    // Escuchar el cambio de color
    socket.on('cambiarColor', (data) => {
        db.run("INSERT INTO clicks (color) VALUES (?)", [data.color], function(err) {
            if (err) return console.error(err.message);

            db.get("SELECT COUNT(*) AS total FROM clicks", (err, row) => {
                if (!err) {
                    io.emit('actualizarPantalla', { 
                        color: data.color, 
                        total: row.total 
                    });
                }
            });
        });
    });
});
// Ruta para ver las interacciones (puedes entrar a tu-url.com/ver-datos)
app.get('/ver-datos', (req, res) => {
    db.all("SELECT * FROM clicks ORDER BY fecha DESC", [], (err, rows) => {
        if (err) {
            res.status(500).send("Error al leer la base de datos");
            return;
        }
        
        // Creamos una tabla HTML sencilla para mostrar los datos
        let html = `<h1>Historial de Interacciones</h1><table border="1"><tr><th>ID</th><th>Color</th><th>Fecha</th></tr>`;
        rows.forEach((row) => {
            html += `<tr><td>${row.id}</td><td style="background-color:${row.color}; color:white">${row.color}</td><td>${row.fecha}</td></tr>`;
        });
        html += `</table>`;
        
        res.send(html);
    });
});

// 4. Encendido del servidor (tu código de la imagen)
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Servidor activo en puerto ${PORT}`);
});