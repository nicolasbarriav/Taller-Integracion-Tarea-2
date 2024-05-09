const url = "https://tarea-2.2024-1.tallerdeintegracion.cl";
const routes = ["stations","trains","lines"];
const station_color={
    "1":"red",
    "2":"yellow",
    "3":"brown",
    "4":"blue",
    "4A":"lightblue",
    "5":"darkgreen",
    "6":"purple",
    "7":"grey"
}
const JOIN = {
    "type": "JOIN",
    "payload": {
    "id": "18627382",
    "username": "nicolas"
    }
};
var TrainsLocation = {};
var TrainStatus = {};
var TrainData = {}; 
var Markers = {};
var StatusMarker = [];

let websocket;
let map;

window.onload = async function () {
    try{          
        map = await leaf();
        const lista = await getData(); // [STATIONS,TRAINS,LINES]
        await createJSON(lista[1],TrainsLocation,TrainStatus,TrainData,Markers);
        setMapStations(map, lista[0]);
        openWebSocket();
    }catch (error) {
        console.error(`[ERROR] Socket Server: ${error}`);
    }
}

// START WEBSOCKET
function openWebSocket() {
    websocket = new WebSocket('wss://tarea-2.2024-1.tallerdeintegracion.cl/connect');

    websocket.onopen = function () {
        console.log(`[NewSocket]: ${websocket.url}`);
        websocket.send(JSON.stringify(JOIN));
    };

    websocket.onmessage = function (event) {
        let eventData;
        try {
        eventData = JSON.parse(event.data);
        } catch (error) {
        console.error('Error al parsear el JSON:', error);
        return;
        }
        console.log(`[IncomingMessage]: ${eventData.type}`);
        
        if (eventData.type === 'position') {
            // cambia coords tren
            setMapTrain(map, eventData["data"]);
        } else if (eventData.type === 'accepted'){
            {};
        }else if (eventData.type === 'status'){
            // cambia status del tren
            setStatus( eventData["data"]);
            setMapTrainStatus(map, eventData["data"]);
            
        } else if (eventData.type === 'arrival'){
            // cambia tabla de trenes estacion actual
            setTrainActualStation(eventData["data"]);
        } else if (eventData.type === 'departure'){
            {};
        } else if (eventData.type === 'boarding'){
            {};
        } else if (eventData.type === 'unboarding'){
            {};
        } else if (eventData.type === 'message'){
            // cambia el chat
            sendMessage(eventData["data"]);
        } else {
            console.log('[ERROR] Evento no reconocido:', eventData.type);
        }
    };

    websocket.onerror = function (error) {
        console.log('WebSocket error: ' + error);
        console.warn('WebSocket error: ' + error);
        alert(error);
    };

    websocket.onclose = function () {
        console.log(`[EndConnection]: ${websocket.url}`);
    };
}
function sendMessage(msm = 0){
    const currentTime = getTime();
    let html_pub = document.createElement("div");
    html_pub.className = "message";
    let content;
    if(! msm){
        content = document.getElementById(`new_comment`).value;
        document.getElementById(`new_comment`).textContent = "";
        var CHAT ={
            "type": "MESSAGE",
            "payload": {
            "content": content
            }
        };
        try{
            websocket.send(JSON.stringify(CHAT));
        }catch(error){
            console.error(`[ERROR] sendMessage: ${error} - Possibly Websocket could not send Chat`);
        }
    }else{
        content = '<b>'+ msm["name"] +'</b> - '+ msm["content"];
    }
    html_pub.innerHTML=`${content}  <div class="message_time">${currentTime}</div>`;
    document.getElementsByClassName("mesasage-box")[0].prepend(html_pub);
}
function getTime(){
    var now = new Date();
    var hour = now.getHours();
    var minute = now.getMinutes();
    var second = now.getSeconds();
    hour = (hour < 10 ? "0" : "") + hour;
    minute = (minute < 10 ? "0" : "") + minute;
    second = (second < 10 ? "0" : "") + second;
    var time = hour + ":" + minute + ":" + second;
    return time;
}

// START DATA
async function leaf(){
    var map =  L.map('map', {
        // center: coords,
        center: [-33.447487,  -70.673676],//coors of Santiago
        zoom: 13
    });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
    return map;
}
async function getData(){
    const STATIONS = await getFetch("stations");
    const LINES = await getFetch("lines");
    const TRAINS =await getFetch("trains");
    for (const i in STATIONS){
        HtmlEstacion(STATIONS[i]);
    }
    for (const i in TRAINS){
        HtmlTrenes(TRAINS[i]);
    }    
    return [STATIONS,TRAINS,LINES];
}
async function getFetch (rt){
    const route = url +"/api/metro/"+ rt;
    const request = new Request(route, {
        method: "GET"
    })
    try{
        const response = await fetch(request);
        if(!response.ok){
            throw new Error("Something went wrong on API server!");
        }
        const data = await response.json();
        return data;
    }catch (error) {
        console.error(`[ERROR]: ${error}`);
    }
};
function HtmlEstacion(station){
    let html_pub = document.createElement("tr");

    html_pub.innerHTML=`
    <th>${station.name}</th>
    <th>${station.station_id}</th>
    <th>${station.line_id}</th>`;
    
    document.getElementsByClassName("estaciones-table")[0].appendChild(html_pub);
}
function HtmlTrenes(tren, actual_station=tren.origin_station_id){
    let html_pub = document.createElement("tr");

    html_pub.innerHTML=`
    <th>${tren.train_id}</th>
    <th>${tren.driver_name}</th>
    <th>${tren.origin_station_id}</th>
    <th>${tren.destination_station_id}</th>
    <th id="${tren.train_id}">${actual_station}</th>`;

    
    document.getElementsByClassName("trenes-table")[0].appendChild(html_pub);
}
function setTrainActualStation(dataTrain){
    try{
        document.getElementById(dataTrain["train_id"]).textContent = dataTrain["station_id"];
    }catch(error){
        console.error(`[ERROR] setTrainActualStation: ${error} - Possibly couldnot find the id of the train`);
        return 0;
    }
}
function setMapStations(map, STATIONS){
    if (typeof STATIONS === 'undefined'){
        return 0;
    }
    if ((STATIONS.keys()).length === 0){
        return 0;
    }
    var lat_0 = 0;
    var long_0 = 0;
    var color_0 = 0;
    
    for(const i in STATIONS){
        var color = station_color[STATIONS[i]["line_id"]]?station_color[STATIONS[i]["line_id"]]:"black";
        var lat = STATIONS[i]["position"]["lat"];
        var long = STATIONS[i]["position"]["long"];
        var customIcon = L.divIcon({
            className: 'custom-icon',
            html: `<i class="fa-solid fa-circle" style="color:${color};"></i>`,
            iconSize: [40, 40], // size of the icon
            iconAnchor: [0, 0], // point of the icon which will correspond to marker's location
            popupAnchor: [0, -40], // point from which the popup should open relative to the iconAnchor
        });
        var marker = L.marker([lat, long], { icon: customIcon },
        {alt: `${STATIONS[i]["name"]}`}).addTo(map)
        .bindPopup(`Id: ${STATIONS[i]["station_id"]}\nNombre: ${STATIONS[i]["name"]}\nLinea: ${STATIONS[i]["line_id"]}`);
        if (lat_0 & long_0){
            if (color_0 == color){
                // mismo color y existen coordenadas anteriores.
                var bounds = [[lat_0, long_0],[lat,long]];
                L.polyline(bounds, {color: color, weight: 4}).addTo(map);
            }
        }
        lat_0 = lat;
        long_0 = long;
        color_0 = color;
    }
}
function setStatus(dataTrain){
    if (typeof dataTrain === 'undefined'){
        return 0;
    }
    var train_id = dataTrain["train_id"];
    if (!TrainsLocation[train_id]){
        console.log("[ERROR] setStatus: TRAIN IS NOT IN THE ACTUAL SYSTEM. PLEASE LOAD THE PAGE AGAIN.");
        return 0;
        TrainsLocation[train_id]  = {"lat" : lat, "long": long};
    }
    if(!TrainData[train_id]){
        console.log("[ERROR] setStatus: TRAIN IS NOT IN THE ACTUAL SYSTEM. PLEASE LOAD THE PAGE AGAIN.");
        return 0;
        TrainData[train_id] = {"line_id": 1 , "driver_name": "Albert Einseten"};
        // const lista = await getData(); // [STATIONS,TRAINS,LINES]
        // await createJSON(lista[1],TrainsLocation,TrainStatus,TrainData,Markers);
    }
    if(!TrainStatus[train_id]){
        console.log("[ERROR] setStatus: TRAIN IS NOT IN THE ACTUAL SYSTEM. PLEASE LOAD THE PAGE AGAIN.");
        return 0;
        TrainStatus[train_id] = {"estado": "moving"};
    }
    try{
        var existingMarker = Markers[train_id];
        var lineID = TrainData[train_id]["line_id"] ;
        var driverName = TrainData[train_id]["driver_name"];
        var status = dataTrain["status"];
        TrainStatus[train_id] = {"estado": dataTrain["status"]};
        existingMarker.bindPopup(`ID: ${train_id}, Linea: ${lineID} , Chofer: ${driverName}, Estado: ${status}`);
    }catch (error) {
        console.error(`[ERROR] setStatus: ${error}`);
        return 0;
    }
}
function setMapTrain(map, dataTrain){
    if (typeof dataTrain === 'undefined'){
        return 0;
    }
    var train_id = dataTrain["train_id"];
    var lat = dataTrain["position"]["lat"];
    var long = dataTrain["position"]["long"];
    if (!TrainsLocation[train_id]){
        console.log("[ERROR] setMapTrain: TRAIN IS NOT IN THE ACTUAL SYSTEM. PLEASE LOAD THE PAGE AGAIN.");
        return 0;
        TrainsLocation[train_id]  = {"lat" : lat, "long": long};
    }
    if(!TrainData[train_id]){
        console.log("[ERROR] setMapTrain: TRAIN IS NOT IN THE ACTUAL SYSTEM. PLEASE LOAD THE PAGE AGAIN.");
        return 0;
        TrainData[train_id] = {"line_id": 1 , "driver_name": "Albert Einseten"};
        // const lista = await getData(); // [STATIONS,TRAINS,LINES]
        // await createJSON(lista[1],TrainsLocation,TrainStatus,TrainData,Markers);
    }
    if(!TrainStatus[train_id]){
        console.log("[ERROR] setMapTrain: TRAIN IS NOT IN THE ACTUAL SYSTEM. PLEASE LOAD THE PAGE AGAIN.");
        return 0;
        TrainStatus[train_id] = {"estado": "moving"};
    }
    try{
        var existingMarker = Markers[train_id];
    }catch (error) {
        console.error(`[ERROR] setMapTrain: ${error} - Possibly could not find train_id on Markers`);
        return 0;
    }
    if (existingMarker){
        var lat0 = TrainsLocation[train_id]["lat"];
        var long0 = TrainsLocation[train_id]["long"];
        existingMarker.setLatLng([lat,long]);
        // el camino o trace que deja el tren
        var customIcon = L.divIcon({
            className: 'custom-icon',
            html: `<i class="fa-solid fa-chevron-up" style="opacity: 25%;"></i>`,
            iconSize: [1, 1], // size of the icon
            iconAnchor: [0, 0], // point of the icon which will correspond to marker's location
            popupAnchor: [0, -40], // point from which the popup should open relative to the iconAnchor
        });
        var marker = L.marker([lat0, long0], { icon: customIcon }).addTo(map);
    }else{
        var customIcon = L.divIcon({
            className: 'custom-icon',
            html: `<i class="fa-solid fa-train-subway"></i>`,
            iconSize: [70, 70], // size of the icon
            iconAnchor: [0, 0], // point of the icon which will correspond to marker's location
            popupAnchor: [0, -40], // point from which the popup should open relative to the iconAnchor
        });
        var lineID = TrainData[train_id]["line_id"] ;
        var driverName = TrainData[train_id]["driver_name"];
        var status =TrainStatus[train_id]["estado"];

        var marker = L.marker([lat, long], { icon: customIcon },
        {alt: `${train_id}`}).addTo(map)
        .bindPopup(`ID: ${train_id}, Linea: ${lineID} , Chofer: ${driverName}, Estado: ${status}`);
        marker._leaflet_id = train_id;
        Markers[train_id] = marker;
    }
    TrainsLocation[train_id]["lat"]= lat;
    TrainsLocation[train_id]["long"]= long;
}
function setMapTrainStatus(map, dataTrain){
    if (typeof dataTrain === 'undefined'){
        return 0;
    }
    var train_id = dataTrain["train_id"];
    if (!TrainsLocation[train_id]){
        console.log("[ERROR] setMapTrainStatus: TRAIN IS NOT IN THE ACTUAL SYSTEM. PLEASE LOAD THE PAGE AGAIN.");
        return 0;
        TrainsLocation[train_id]  = {"lat" : lat, "long": long};
    }
    if(!TrainData[train_id]){
        console.log("[ERROR] setMapTrainStatus: TRAIN IS NOT IN THE ACTUAL SYSTEM. PLEASE LOAD THE PAGE AGAIN.");
        return 0;
        TrainData[train_id] = {"line_id": 1 , "driver_name": "Albert Einseten"};
        // const lista = await getData(); // [STATIONS,TRAINS,LINES]
        // await createJSON(lista[1],TrainsLocation,TrainStatus,TrainData,Markers);
    }
    if(!TrainStatus[train_id]){
        console.log("[ERROR] setMapTrainStatus: TRAIN IS NOT IN THE ACTUAL SYSTEM. PLEASE LOAD THE PAGE AGAIN.");
        return 0;
        TrainStatus[train_id] = {"estado": "moving"};
    }
    var lat =  TrainsLocation[train_id]["lat"];
    var long = TrainsLocation[train_id]["long"];
    var status = dataTrain["status"];

    try{
        var existingMarker = Markers[train_id];
    }catch (error) {
        console.error(`[ERROR] setMapTrainStatus: ${error} - Possibly could not find train_id on Markers`);
        return 0;
    }
    if (existingMarker){
        var circleOptions = {
            color: 'mediumvioletred', // color of the circle border
            fillColor: 'burlywood', // color of the circle fill
            fillOpacity: 0.9, // opacity of the circle fill
            radius: 100 // radius of the circle in meters
        };
        
        // Create the circle and add it to the map
        var circle = L.circle([lat,long], circleOptions).addTo(map)
        .bindPopup(`ID: ${train_id}, Estado: ${status}`);
        StatusMarker.push(circle);
    }else{
        console.error(`[ERROR] setMapTrainStatus: not exisitng marker`);
    }
    if(StatusMarker.length>5){
        (StatusMarker.shift()).remove();
    }
    
}
async function createJSON(TRAINS, TrainsLocation,TrainStatus,TrainData, Markers){
    for (const i in TRAINS){
        TrainsLocation[TRAINS[i]["train_id"]] = {"lat" : 0, "long": 0};
        TrainStatus[TRAINS[i]["train_id"]] = {"estado": "ON"};
        TrainData[TRAINS[i]["train_id"]] = {"line_id": TRAINS[i]["line_id"] , "driver_name": TRAINS[i]["driver_name"]};
        Markers[TRAINS[i]["train_id"]] = 0;
    }
}