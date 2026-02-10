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

// 3. RUTA PARA VER LOS DATOS
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
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; background: #1a1a1a; color: white; }
                    table { width: 100%; border-collapse: collapse; background: #2d2d2d; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.3); }
                    th, td { padding: 15px; border-bottom: 1px solid #3d3d3d; text-align: left; }
                    th { background: #444; color: #00ff88; text-transform: uppercase; font-size: 12px; letter-spacing: 1px; }
                    .color-box { width: 24px; height: 24px; display: inline-block; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); vertical-align: middle; margin-right: 10px; }
                    h1 { color: #00ff88; }
                </style>
            </head>
            <body>
                <h1>📊 Historial de Interacciones</h1>
                <p>Total de registros acumulados: <strong>${rows.length}</strong></p>
                <table>
                    <tr><th>ID</th><th>Color Detectado</th><th>Fecha y Hora</th></tr>
        `;
        
        rows.forEach((row) => {
            const colorMostrar = row.color || '#cccccc';
            html += `
                <tr>
                    <td>#${row.id}</td>
                    <td><span class="color-box" style="background:${colorMostrar}"></span>${colorMostrar}</td>
                    <td>${row.fecha}</td>
                </tr>`;
        });
        
        html += `</table></body></html>`;
        res.send(html);
    });
});

// 4. LÓGICA DE SOCKETS (MEJORADA)
io.on('connection', (socket) => {
    console.log('Nuevo usuario conectado');

    // Enviar total actual al conectar
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
        // SEGURIDAD: Detectar si data es un objeto o solo un string
        let colorFinal = "#ffffff";
        
        if (typeof data === 'object' && data.color) {
            colorFinal = data.color;
        } else if (typeof data === 'string') {
            colorFinal = data;
        }

        console.log("Insertando color:", colorFinal);

        db.run("INSERT INTO clicks (color) VALUES (?)", [colorFinal], function(err) {
            if (err) return console.error(err.message);

            db.get("SELECT COUNT(*) AS total FROM clicks", (err, row) => {
                if (!err) {
                    // Notificar a todos los dispositivos conectados
                    io.emit('actualizarPantalla', { 
                        color: colorFinal, 
                        total: row.total 
                    });
                }
            });
        });
    });
});

// 5. ENCENDIDO DEL SERVIDOR
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Servidor activo en puerto ${PORT}`);
});