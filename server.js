const express = require('express');
const app = express();
const expressWs = require('express-ws')(app);

const bodyParser = require('body-parser');
app.use(bodyParser.json());  // parse application/json

const cors = require('cors');
app.use(cors());

app.use(express.static('public'));

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('AIS.sqlite');

const csv = require('csv-parser');
const fs = require('fs');

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS vessels (timestamp TEXT,mmsi TEXT,imo TEXT,navigational_status TEXT,longitude TEXT,latitude TEXT,heading TEXT,cog TEXT,sog TEXT,ship_name TEXT,call_sign TEXT,ship_type TEXT,draught TEXT,size_bow TEXT,size_stern TEXT,size_port TEXT,size_starboard TEXT,destination TEXT)`);

    const results = [];

    fs.createReadStream('day.csv')
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => {
            //console.log(results);
            const stmt = db.prepare(`INSERT INTO vessels(timestamp,mmsi,imo,navigational_status,longitude,latitude,heading,cog,sog,ship_name,call_sign,ship_type,draught,size_bow,size_stern,size_port,size_starboard,destination) 
                                                  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
            results.forEach((result) => {
                // stmt.run(result.timestamp,
                //     result.mmsi,
                //     result.imo,
                //     result.navigational_status,
                //     result.longitude,
                //     result.latitude,
                //     result.heading,
                //     result.cog,
                //     result.sog,
                //     result.ship_name,
                //     result.call_sign,
                //     result.ship_type,
                //     result.draught,
                //     result.size_bow,
                //     result.size_port,
                //     result.size_starboard,
                //     result.destination);
                stmt.run([result]);

            });
            stmt.finalize();
        });
});

let currentSec = 0;

const wsPort = 3000;
app.listen(wsPort, function () {
    console.log(`Server running at ${wsPort}`);

    function query(ws) {
        try {
            const q = `select *, (hour*3600)+(min*60)+sec AS total_sec 
                    FROM (select CAST(substr(time(timestamp),1,2) AS INTEGER) AS hour, 
                    CAST(substr(time(timestamp),4,2) AS INTEGER) AS min,
                    CAST(substr(time(timestamp),7,2) AS INTEGER) AS sec,
                    mmsi  AS id, imo, navigational_status, longitude AS lon,latitude AS lat, heading, cog, sog, 
                    ship_name AS name, call_sign, ship_type, draught, size_bow, size_stern, size_port, size_starboard, destination, strftime('%s',timestamp) AS timestamp
                    from vessels)                    
                    where (total_sec>=${currentSec} AND total_sec<(${currentSec}+60))`;

            db.all(q, (err, rows) => {
                if (err) {
                    // res.json({'message':'failure','code':err});
                    console.error(err);
                    return;
                }
                const msg = JSON.stringify(rows);

                // ws.getWss().clients

                ws.send(msg);
                currentSec += 60;
            });
        } catch (ex) {
            console.error(ex);
        }
    };

    // app.get('/', function (req, res, next) {
    //     console.log('get route', req.testing);
    //     res.end();
    // });

    app.ws('/', (ws, req) => {
        console.log('Ws server connection has opened.');
        try {
            setInterval(() => {
                expressWs?.getWss()?.clients.forEach(c=>{
                   query(c);
                })
            //   console.log(expressWs?.getWss()?.clients);
                // query(ws);
            }, 1000);
        } catch (ex) {
            console.error(ex);
        }
        // ws.setInterval(query, 1000);
        // try {
        //     const sentMsg = setInterval(query, 1000);
        //     ws.send(sentMsg);
        // } catch (err) {
        //     console.error(err);
        // }

        // ws.on('message', (message) => {
        //     const json = JSON.stringify({ message: 'Gotcha' });
        //     //const input = JSON.parse(msg);
        //     // ws.send(msg);
        //     ws.send(json);
        //     console.log(`Sent: ${json}`);
        // });

        // The connection was closed
        ws.on('close', function () {
            console.log('Ws server connection was closed.');
        });
        ws.on('error', e=> console.log(e));
    });

});



// app.get('/vessels/:destination', async (req, res) => { //οταν κανω ενα get request (req) στο root path θα καλεσει την callback και θα μου επιστρεψει το response (res)
//     const q = `select * from vessels where destination = '${req.params.destination}'`;
//     try {
//         const results = await query(q);
//         res.send(results);
//     } catch(err) {
//         console.error(err);
//         res.send(err);
//     }
// });

