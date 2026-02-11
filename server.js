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
        fecha DATETIME DEFAULT (datetime('now', 'localtime'))
    )`);
});

// 2. SERVIR ARCHIVOS ESTÁTICOS
app.use(express.static('public'));

// 3. RUTA PARA VER LOS DATOS (TABLA MEJORADA)
app.get('/ver-datos', (req, res) => {
    db.all("SELECT * FROM clicks ORDER BY fecha DESC", [], (err, rows) => {
        if (err) {
            res.status(500).send("Error al leer la base de datos");
            return;
        }
        
        let html = `
            <html>
            <head>
                <title>Historial RD</title>
                <style>
                    body { font-family: sans-serif; padding: 30px; background: #f0f2f5; }
                    table { width: 100%; border-collapse: collapse; background: white; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
                    th, td { padding: 12px; border: 1px solid #ddd; text-align: left; }
                    th { background: #333; color: white; }
                    .color-circle { width: 15px; height: 15px; display: inline-block; border-radius: 50%; border: 1px solid #000; margin-right: 8px; vertical-align: middle; }
                </style>
            </head>
            <body>
                <h1>🇩🇴 Historial de Interacciones (Hora RD)</h1>
                <p>Total de registros: ${rows.length}</p>
                <table>
                    <tr><th>ID</th><th>Color</th><th>Fecha y Hora Local</th></tr>
        `;
        
        rows.forEach((row) => {
            const displayColor = row.color || "#FFFFFF";
            html += `
                <tr>
                    <td>${row.id}</td>
                    <td><span class="color-circle" style="background:${displayColor}"></span>${displayColor}</td>
                    <td>${row.fecha}</td>
                </tr>`;
        });
        
        html += `</table></body></html>`;
        res.send(html);
    });
});

// 4. LÓGICA DE SOCKETS (CORRIGE EL ERROR DE 'NULL')
io.on('connection', (socket) => {
    db.get("SELECT COUNT(*) AS total FROM clicks", (err, row) => {
        if (!err) socket.emit('actualizarPantalla', { color: '#000000', total: row.total || 0 });
    });

    socket.on('cambiarColor', (data) => {
        // Validamos si data es objeto o string para evitar el 'null'
        const colorFinal = (typeof data === 'object' && data.color) ? data.color : (typeof data === 'string' ? data : "#FFFFFF");

        // Insertamos usando 'localtime' que ahora leerá la variable TZ de Render
        db.run("INSERT INTO clicks (color, fecha) VALUES (?, datetime('now', 'localtime'))", [colorFinal], function(err) {
            if (err) return console.error(err.message);

            db.get("SELECT COUNT(*) AS total FROM clicks", (err, row) => {
                if (!err) io.emit('actualizarPantalla', { color: colorFinal, total: row.total });
            });
        });
    });
});

// 5. ENCENDIDO
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Servidor activo en puerto ${PORT}`);
});