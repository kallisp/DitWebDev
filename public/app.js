window.addEventListener('load', (event) => {

    const map = L.map('mapId').setView([37.9, 23.62], 11.49);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    const ws = new WebSocket("ws://34.107.39.66:3000");

    const vessels = {};
    const circles = {};
    const polylines = {};

    ws.addEventListener('open', (event) => {
        console.log('Connection established.')
    });

    ws.addEventListener('close', (event) => {
        console.log(`Connection closed with message ${event.reason} and code ${event.code}.`);
    });

    ws.addEventListener('error', (event) => {
        console.log(`Connection closed with error ${event}.`)
    });

    ws.addEventListener('message', (event) => {
        console.log(`Server sent message: ${event.data}`);
        let msg = [];
        try {
            msg = JSON.parse(event.data);
        }
        catch (error) {
            console.error(`An error has occurred: ${error.message}.`);
        }

        for (let i = 0; i <= msg.length - 1; i++) {
            const vessel = msg[i];

            const vesselId = vessel.id;

            if (!(vesselId in vessels)) {
                vessels[vesselId] = [vessel];
            }
            else {
                vessels[vesselId].push(vessel);
            }
        }

        for (const vesselId in vessels) {
            let latlngs = [];
            let circleLL = [];

            const vesselArray = vessels[vesselId];

            for (let i = 0; i <= vesselArray.length - 1; i++) {

                const vesselInstance = vesselArray[i];

                const lat = vesselInstance.lat;
                const lon = vesselInstance.lon;

                latlngs.push([lat, lon])
            }

            const lastVessel = vesselArray[vesselArray.length - 1];
            circleLL = [lastVessel.lat, lastVessel.lon];

            const popupContent = `<b>Name: </b> ${lastVessel.name}`;

            const popup = L.popup().setContent(popupContent);

            if (vesselId in circles) {
                const oldCircle = circles[vesselId];
                oldCircle.setLatLng(circleLL);
            }
            else {
                const newCircle = L.circleMarker(circleLL, {
                    color: '#E04836',
                    fillColor: 'white',
                    fillOpacity: 0.3,
                    radius: 4,
                    weight: 1.5
                }).addTo(map);

                circles[vesselId] = newCircle;
                newCircle.bindPopup(popup);
            }

            if (vesselId in polylines) {
                const oldPolyline = polylines[vesselId];
                oldPolyline.setLatLngs(latlngs);
            }
            else {
                const polyline = L.polyline(latlngs, {
                    color: '#E04836',
                    weight: 1.5
                }).addTo(map);

                polylines[vesselId] = polyline;
            }
        }

        if (msg.length > 0) {
            const date = new Date(msg[0].timestamp * 1000);
            const dateString = date.toUTCString();

            const timestampDiv = document.getElementById('timestampId');
            const timestampElem = document.createElement('p');
            const timestampText = document.createTextNode(dateString);
            timestampElem.appendChild(timestampText);
            timestampDiv.innerHTML = timestampElem.textContent;
        }
    });
});