// Author: @patriciogv 2015

// ============================================= VARIABLES
//
var timeDiff = 0;
var cloudOffset = [0,0];
var offset_target = [0,0];

// ISS TLL lines
var ISS = { name: "ISS" ,
            tleLine1: '1 25544U 98067A   15305.48861694  .00009749  00000-0  15091-3 0  9998',
            tleLine2: '2 25544  51.6435 118.8193 0006784  99.4264 289.9384 15.54738918969408' };

// ============================================= INIT 
// Prepair leafleat and tangram
map = (function () {
    'use strict';

    // Leaflet Map
    var map = L.map('map');
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
    map.setView([0, 0], 3);
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
        
        window.setInterval("updateSun()", 1000);
        window.setInterval("updateClouds()", 100);

        if (window.DeviceMotionEvent) {
            window.addEventListener("devicemotion", onMotionUpdate, false);
        }
        document.addEventListener('mousemove', onMouseUpdate, false);
        document.addEventListener('mouseenter', onMouseUpdate, false);
    });
    layer.addTo(map);
}

function initOrbit() {
    addOrbitToTangramSource("orbits", ISS);
}

// ============================================= UPDATE

Date.prototype.getJulian = function() {
    return Math.floor((this / 86400000) - (this.getTimezoneOffset()/1440) + 2440587.5);
}

function updateSun() {   // time in seconds since Jan. 01, 1970 UTC
    // Update Sun position
    var now = new Date();
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
