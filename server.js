const express = require('express');
const app = express();
const expressWs = require('express-ws')(app);

const cors = require('cors');
app.use(cors());

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('AIS.sqlite');

app.use(express.static('public'));

const wsPort = 3000;

function query(ws, currentSec, success) {
    const q = `SELECT mmsi AS id, imo, navigational_status, longitude AS lon, latitude AS lat, heading, cog, sog, ship_name AS name, call_sign, ship_type, draught, size_bow, size_stern, size_port, size_starboard, destination, strftime('%s',timestamp) AS timestamp
                FROM
                    (SELECT *, (CAST(strftime('%H',timestamp) AS INTEGER)*3600 + CAST(strftime('%M',timestamp) AS INTEGER)*60 + CAST(strftime('%S',timestamp) AS INTEGER)) AS total_sec 
                    FROM vessels                    
                    WHERE (total_sec>=${currentSec} AND total_sec<(${currentSec}+60)))`;

    db.all(q, (err, rows) => {
        if (err) {
            console.error(err);
            return;
        }
        const msg = JSON.stringify(rows);
        if (ws.readyState == ws.OPEN) {
            ws.send(msg);
            success();
        }
    });
};

function getVessels(ws) {
    let currentSec = 0;
    setInterval(() => {
        query(ws, currentSec, () => {
            currentSec += 60;
        })
    }, 1000);
};

app.ws('/', (ws, req) => {
    console.log('Client connection has opened.');
    try {
        getVessels(ws);
    } catch (err) {
        console.error(err);
    };

    ws.on('close', (code,reason) => {
        console.log(`Client connection was closed with code ${code} and reason ${reason}.`);
    });

    ws.on('error', (event) => {
        console.log(`Client connection closed with error ${event}.`);
    });
});

app.listen(wsPort, () => {
    console.log(`Server running on port ${wsPort}`);
});

