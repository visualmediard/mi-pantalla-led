const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// 1. CONFIGURACIÓN DE LA BASE DE DATOS
const db = new sqlite3.Database('./interacciones.db');

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS clicks (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        color TEXT, 
        fecha DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

// 2. SERVIR ARCHIVOS ESTÁTICOS
app.use(express.static('public'));

// 3. RUTA PARA VER LOS DATOS (Debe ir antes del listen)
app.get('/ver-datos', (req, res) => {
    db.all("SELECT * FROM clicks ORDER BY fecha DESC", [], (err, rows) => {
        if (err) {
            res.status(500).send("Error al leer la base de datos");
            return;
        }
        
        let html = `
            <html>
            <head>
                <title>Historial de Datos</title>
                <style>
                    body { font-family: sans-serif; padding: 20px; background: #f4f4f4; }
                    table { width: 100%; border-collapse: collapse; background: white; }
                    th, td { padding: 10px; border: 1px solid #ddd; text-align: left; }
                    th { background: #333; color: white; }
                    .color-box { width: 20px; height: 20px; display: inline-block; border: 1px solid #000; vertical-align: middle; margin-right: 10px; }
                </style>
            </head>
            <body>
                <h1>Historial de Interacciones</h1>
                <p>Total de registros: ${rows.length}</p>
                <table>
                    <tr><th>ID</th><th>Color</th><th>Fecha (UTC)</th></tr>
        `;
        
        rows.forEach((row) => {
            html += `
                <tr>
                    <td>${row.id}</td>
                    <td><span class="color-box" style="background:${row.color}"></span>${row.color}</td>
                    <td>${row.fecha}</td>
                </tr>`;
        });
        
        html += `</table></body></html>`;
        res.send(html);
    });
});

// 4. LÓGICA DE SOCKETS
io.on('connection', (socket) => {
    console.log('Nuevo usuario conectado');

    // Enviar el total acumulado al entrar
    db.get("SELECT COUNT(*) AS total FROM clicks", (err, row) => {
        if (!err) {
            socket.emit('actualizarPantalla', { 
                color: '#000000', 
                total: row.total || 0 
            });
        }
    });

    // Escuchar cambios desde el celular
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

// 5. ENCENDIDO DEL SERVIDOR (Siempre al final)
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Servidor activo en puerto ${PORT}`);
});