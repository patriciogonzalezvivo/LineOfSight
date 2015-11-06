// Author: @patriciogv 2015

var ISS = {     
            name: 'ISS',
            tleLine1: '1 25544U 98067A   15305.48861694  .00009749  00000-0  15091-3 0  9998',
            tleLine2: '2 25544  51.6435 118.8193 0006784  99.4264 289.9384 15.54738918969408' 
        };

var SCUBE = {   
            name: "S-CUBE",                 
            tleLine1: '1 40898U 98067GY  15305.82492873  .00034571  00000-0  47173-3 0  9991',
            tleLine2: '2 40898  51.6406 116.6319 0007444  96.7092 263.4748 15.57127173  6944'
        };

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
        initOrbit();
    });
    layer.addTo(map);
}

function initOrbit() {
    addOrbitToTangramSource("orbits", [ISS, SCUBE]);
}

function initTexture() {
    var sat = ISS;

    // Generate the orbit;
    var track = [];
    var satrec = satellite.twoline2satrec(sat.tleLine1, sat.tleLine2);
    var t = new Date();
    t.setMinutes(t.getMinutes() - 2);
    var stepSec = 60;
    for (var i = 0; i < 98; i++) {
        track.push(getSatellitePositionAt(satrec,t));
        t.setSeconds(t.getSeconds() + stepSec); 
    }

    var width = 98;
    var height = 4;

    // // Using Canvas
    // var canvas = document.createElement("canvas");
    // canvas.height = height;
    // canvas.width = width;
    // var ctx = canvas.getContext('2d');
    // var imageData = ctx.getImageData(0, 0, width, height);
    // var data = imageData.data;
    // for (var y = 0; y < height; y++) {
    //     for (var x = 0; x < width; x++) {
    //         var index = (y*width+x)*4;
    //         data[index] = 255;
    //         data[index+1] = 0;
    //         data[index+2] = 0;
    //         data[index+3] = 255;
    //     }
    // }
    // ctx.putImageData(imageData, 0, 0);
    // scene.styles.orbit.shaders.uniforms.u_lut = canvas.toDataURL();
    // scene.rebuild();

    // // Using WebGL
    var gl = scene.gl;
    var floatTextures = gl.getExtension('OES_texture_float');
    if (!floatTextures) {
        console.log('no floating point texture support');
    } else {
        console.log('floating point texture support');
    }

    var uniforms = {};
    uniforms.u_lut = {};

    var pixels = new Float32Array(width*height*4);
    for (var y = 0; y < height; y++) {
        for (var x = 0; x < width; x++) {
            var index = (y*width+x)*4;
            var data = [ .5+(track[x].ln/180)*.5, .5+(track[x].lt/90)*.5];
            pixels[index] = data[0];
            pixels[index+1] = data[1];
            pixels[index+2] = 0.0;
            pixels[index+3] = 1.0;
        }
    }
    var texture = scene.styles.orbit.program.uniforms.u_lut;
    gl.activeTexture(gl.TEXTURE0);
    // gl.bindTexture(gl.TEXTURE_2D, 0);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(
        gl.TEXTURE_2D, // target
        0, // mip level
        gl.RGBA, // internal format
        width, height, // width and height
        0, // border
        gl.RGBA, //format
        gl.FLOAT, // type
        pixels // texture data
    );
    // gl.bindTexture(gl.TEXTURE_2D, null);
    scene.rebuild();
}
