// Author: @patriciogv 2015

// ============================================= VARIABLES
//
// var track = orbit.orbitData;
var track = [];
var timeDiff = 0;
var lastDayNightOverlayUpdate = 0;
var isMiles = false;
var MILE_IN_KM = 1.609344;
var place = "";
var placeCounter = 0;
var lastState = {};
var createObjectURL = (window.URL && window.URL.createObjectURL) || (window.webkitURL && window.webkitURL.createObjectURL);
var cloudOffset = [0,0];
var offset_target = [0,0];

// ISS TLL lines
var tleLine1 = '1 25544U 98067A   15305.48861694  .00009749  00000-0  15091-3 0  9998',
    tleLine2 = '2 25544  51.6435 118.8193 0006784  99.4264 289.9384 15.54738918969408';

var satrec = satellite.twoline2satrec(tleLine1, tleLine2);

// ============================================= INIT 
// Prepair leafleat and tangram
map = (function () {
    'use strict';

    // Leaflet Map
    var map = L.map('map',{
                            scrollWheelZoom: 'center', 
                            dragging: false,
                            minZoom: 4,
                            maxZoom: 12,
                            zoomControl: false 
                        });
    // Tangram Layer
    var layer = Tangram.leafletLayer({
        scene: 'scene.yaml',
        attribution: '<a href="https://twitter.com/patriciogv" target="_blank">@patriciogv</a> | <a href="https://mapzen.com/tangram" target="_blank">Tangram</a> | &copy; OSM contributors | <a href="https://mapzen.com/" target="_blank">Mapzen</a>'
    });

    window.layer = layer;
    var scene = layer.scene;
    window.scene = scene;

    map.setView([0, 0], 4);

    var hash = new L.Hash(map);

    /***** Render loop *****/
    window.addEventListener('load', function () {
        init();
    });

    return map;
}());

function init() {
    var t = new Date();
    t.setMinutes ( t.getMinutes() - 2 );
    var stepSec = 60;
    for (var i = 0; i < 98; i++) {
        track.push(getSatellitePositionAt(satrec,t));
        t.setSeconds(t.getSeconds() + stepSec); 
    }

    var state = getSatelliteState( getCurrentTime() );
    var time   = state.time;
    var satLon = state.lon;
    var satLat = state.lat;

    map.setView([satLat, satLon], 5);
    // Scene initialized
    layer.on('init', function() {
        console.log("Creating orbit and cheching on WebGL ")
        
        // If the browser don't suport big textures, reload scene using LowDefenition images
        if ( scene.gl.getParameter(scene.gl.MAX_TEXTURE_SIZE) < 10800) {
            console.log("Warning, Browser don't suport big images, reloading style with smaller images");
            setDefinition("ld");
        } else {
            if (window.devicePixelRatio === 1) {
                setDefinition("hd");
            } else {
                initOrbit();
            }
        }
        
        window.setInterval("update(getCurrentTime())", 1000);
        window.setInterval("updateClouds(getCurrentTime())", 100);

        if (window.DeviceMotionEvent) {
            window.addEventListener("devicemotion", onMotionUpdate, false);
        }
        document.addEventListener('mousemove', onMouseUpdate, false);
        document.addEventListener('mouseenter', onMouseUpdate, false);
    });
    layer.addTo(map);

    updateLocation("");
}

function initOrbit() {
    getHttp("data/iss.geojson", function(err, res){
        if (err) {
            console.error(err);
        }

        var response = JSON.parse(res);
        response.features[0].geometry.coordinates = [];
        response.features[1].geometry.coordinates = [];

        var prevLon = track[0].ln;
        var currentGeom = 0;
        for (var i = 0; i < track.length; i++) {
            if (prevLon > 0.0 && track[i].ln < 0.0){
                response.features[currentGeom].geometry.coordinates.push([track[i].ln+360, track[i].lt])
                currentGeom = 1;
            }
            response.features[currentGeom].geometry.coordinates.push([track[i].ln, track[i].lt]);
            prevLon = track[i].ln;
        }

        if (response.features[1].geometry.coordinates.length === 0.0) {
            response.features.length = 1;
        }

        var content = JSON.stringify(response);

        scene.config.sources.iss.url = createObjectURL(new Blob([content]));
        scene.rebuild();
    });
}

// ============================================= UPDATE

Date.prototype.getJulian = function() {
    return Math.floor((this / 86400000) - (this.getTimezoneOffset()/1440) + 2440587.5);
}

function update(time) {   // time in seconds since Jan. 01, 1970 UTC
    // Update position to the satelite
    var state = getSatelliteState(time);
    var options = {animate: true, duration: 1., easeLinearity: 1};

    if (state.lon < -173) {
        options.animate = false;
        options.duration = 0.0;
    }

    map.panTo([state.lat, state.lon],options);    
    document.getElementById('left-lat').innerHTML = "LAT " + state.lat.toFixed(4);
    document.getElementById('left-lon').innerHTML = "LON " + state.lon.toFixed(4);
    
    // Update Sun position
    var now = new Date();
    document.getElementById('left-time').innerHTML = now.getTime().toString();

    var cur_hour = now.getHours();
    var cur_min = now.getMinutes();
    var cur_sec = now.getSeconds();
    var cur_jul = now.getJulian() - 1;
    var equinox_jul = new Date(now.getFullYear(),2,20,24,-now.getTimezoneOffset(),0,0).getJulian() - 1;

    var offset_x = 27-Math.round(((cur_hour*3600 + cur_min*60 + cur_sec)/86400) * 180 ); // Resulting offset X
    var offset_sin = ((365.25 - equinox_jul + cur_jul)%365.25)/365.25; // Day offset, mapped on the equinox offset
    var offset_sin_factor = Math.sin(offset_sin * 2 * Math.PI); // Sine wave offset
    var offset_y = offset_sin_factor * 23.44; // Map onto angle. Maximum angle is 23.44° in both directions

    var sunPos = [offset_x, offset_y]; 
    scene.styles.earth.shaders.uniforms.u_sun_offset = sunPos;
    scene.styles.water.shaders.uniforms.u_sun_offset = sunPos;

    lastState = state;
}

function updateClouds() {
    if (scene.styles && 
        offset_target[0] !== cloudOffset[0] && 
        offset_target[1] !== cloudOffset[1] ) {
        cloudOffset[0] += (offset_target[0]-cloudOffset[0])*.25;
        cloudOffset[1] += (offset_target[1]-cloudOffset[1])*.25;
        scene.styles.earth.shaders.uniforms.u_clouds_offset = cloudOffset;
        scene.styles.water.shaders.uniforms.u_clouds_offset = cloudOffset;
    }
}

function updateLocation(text) {
    if (placeCounter > text.length || place === "") {
        placeCounter = 0;
        text = "";
        var state = getSatelliteState(getCurrentTime());
        updateGeocode(state.lat, state.lon);
        setTimeout(function(){
            updateLocation("");
        }, 3000);
    } else {
        setTimeout( function(){
            document.getElementById('loc').innerHTML = text + "<span>|</span>"; 
            updateLocation(text+place.charAt(placeCounter++));
        }, 100);
    }
}

function updateGeocode (lat, lng) {

    // This is my API Key for this project. 
    // They are free! get one at https://mapzen.com/developers/sign_in
    var PELIAS_KEY = 'search--cv2Foc';

    var endpoint = '//search.mapzen.com/v1/reverse?point.lat=' + lat + '&point.lon=' + lng + '&size=1&layers=coarse&api_key=' + PELIAS_KEY;

    getHttp(endpoint, function(err, res){
        if (err) {
            console.error(err);
        }

        // TODO: Much more clever viewport/zoom based determination of current location
        var response = JSON.parse(res);
        if (!response.features || response.features.length === 0) {
            // Sometimes reverse geocoding returns no results
            place = 'Unknown location';
        }
        else {
            place = response.features[0].properties.label;
        }
    });
}

// ============================================= SET/GET
// defString could be: "ld" or "hd"
//
function setDefinition (defString) {
    getHttp("scene.yaml", function(err, res){
        if (err) {
            console.error(err);
        }
        var content = res.replace(/\-[x]*hd\.jpg/gm, "-"+defString+".jpg");
        var url = createObjectURL(new Blob([content]));
        scene.load(url,false);
        initOrbit();
    });
}

function getCurrentTime() {   // time in seconds since Jan. 01, 1970 UTC
  return Math.round(new Date().getTime()/1000);
}

function getSatelliteState(time) {   // time in seconds since Jan. 01, 1970 UTC
    if ( (time < track[0].t) || (time > track[track.length-1].t) ) {
        console.log("Time out of limits", time, track[0].t, "-", track[track.length-1].t)
        // window.location.reload(true);
        return null;
    }

    try {
        var idx = getIndex(time);
        var state1 = track[idx];
        var state2 = track[idx+1];
        var factor = (time - state1.t) / (state2.t - state1.t);
        var lon   = state1.ln + (state2.ln - state1.ln) * factor;
        var lat   = state1.lt + (state2.lt - state1.lt) * factor;
        return { time: time, lon: lon, lat: lat };
        // var alt   = state1.h + (state2.h - state1.h) * factor;
        // var speed = state1.v + (state2.v - state1.v) * factor;
        // return { time: time, lon: lon, lat: lat, alt: alt, speed: speed };
    }
    catch (ex) {
        console.log("Something went wrong", ex);
        // window.location.reload(true);
        return null;
    }
}

function getIndex(time) {   // time in seconds since Jan. 01, 1970 UTC
    var i = 0;
    while ( (time > track[i].t) && (i < track.length) )
        i++;
    return i - 1;
}

function getHttp (url, callback) {
    var request = new XMLHttpRequest();
    var method = 'GET';

    request.onreadystatechange = function () {
        if (request.readyState === 4 && request.status === 200) {
            var response = request.responseText;

            // TODO: Actual error handling
            var error = null;
            callback(error, response);
        }
    };
    request.open(method, url, true);
    request.send();
}

function getSatellitePositionAt(satrec, date) {
    var position_and_velocity = satellite.propagate(satrec,
                                                    date.getUTCFullYear(), 
                                                    date.getUTCMonth() + 1,
                                                    date.getUTCDate(),
                                                    date.getUTCHours(), 
                                                    date.getUTCMinutes(), 
                                                    date.getUTCSeconds());

    var position_eci = position_and_velocity["position"];
    var gmst = satellite.gstimeFromDate(date.getUTCFullYear(), 
                                           date.getUTCMonth() + 1, // Note, this function requires months in range 1-12. 
                                           date.getUTCDate(),
                                           date.getUTCHours(), 
                                           date.getUTCMinutes(), 
                                           date.getUTCSeconds());
    // Geodetic
    var position_gd    = satellite.eciToGeodetic(position_eci, gmst);

    // Geodetic coords are accessed via "longitude", "latitude".
    var lon = satellite.degreesLong(position_gd["longitude"]);
    var lat = satellite.degreesLat(position_gd["latitude"]);
    return { t: Math.round(date.getTime()/1000), ln: lon, lt: lat };
}

// ============================================= TOOLS
function unhide(divID) {
    var item = document.getElementById(divID);
    if (item) {
        item.className=(item.className=='hidden')?'unhidden':'hidden';
    }
}

// ============================================= EVENTS

function onMouseUpdate (e) {
    var mouse = [ (e.pageX/screen.width-.5)*0.005, (e.pageY/screen.height-.5)*-0.002];
    offset_target[0] = mouse[0];
    offset_target[1] = mouse[1];
}

function onMotionUpdate (e) {
    var accX = Math.round(event.accelerationIncludingGravity.x*10)/10;  
    var accY = Math.round(event.accelerationIncludingGravity.y*10)/10;  
    offset_target = [ -accX/1000, -accY/1000 ];
}
