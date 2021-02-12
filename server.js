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
    const q = `select *, (hour*3600)+(min*60)+sec AS total_sec 
        FROM (select CAST(substr(time(timestamp),1,2) AS INTEGER) AS hour, 
                    CAST(substr(time(timestamp),4,2) AS INTEGER) AS min,
                    CAST(substr(time(timestamp),7,2) AS INTEGER) AS sec,
                    mmsi  AS id, imo, navigational_status, longitude AS lon, latitude AS lat, heading, cog, sog, ship_name AS name, call_sign, 
                    ship_type, draught, size_bow, size_stern, size_port, size_starboard, destination, strftime('%s',timestamp) AS timestamp
                    from vessels)                    
                    where (total_sec>=${currentSec} AND total_sec<(${currentSec}+60))`;

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

function getVessels(ws){
    let currentSec = 0;
    setInterval(() => {
        query(ws, currentSec, () => {
            currentSec += 60;
        })
    }, 1000);
};

app.ws('/', (ws, req) => {
    console.log('Ws server connection has opened.');
    try {
       getVessels(ws);
    } catch (err) {
        console.error(err);
    };


    ws.on('close', function () {
        console.log('Ws server connection was closed.');
    });
});

app.listen(wsPort, function () {
    console.log(`Server running at port ${wsPort}`);
});

