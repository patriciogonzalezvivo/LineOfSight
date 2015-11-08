// Author: @patriciogv 2015
var samplesTotal = 300;
var samplesStep = 20;
var satellites = [
                {     
                    name: 'ISS',
                    type: "stations",
                    tleLine1: '1 25544U 98067A   15305.48861694  .00009749  00000-0  15091-3 0  9998',
                    tleLine2: '2 25544  51.6435 118.8193 0006784  99.4264 289.9384 15.54738918969408' 
                },
                {   
                    name: 'S-CUBE',   
                    type: "stations",               
                    tleLine1: '1 40898U 98067GY  15305.82492873  .00034571  00000-0  47173-3 0  9991',
                    tleLine2: '2 40898  51.6406 116.6319 0007444  96.7092 263.4748 15.57127173  6944'
                },
                {
                    name: 'NOAA 15',
                    type: "weather",      
                    tleLine1: '1 25338U 98030A   15120.50133940  .00000181  00000-0  95272-4 0  9994',
                    tleLine2: '2 25338  98.7718 119.1083 0009683 311.6024  48.4325 14.25608869882046'
                },
                {
                    name: 'NOAA 18',
                    type: "weather",   
                    tleLine1: '1 28654U 05018A   15120.45078669  .00000138  00000-0  10028-3 0  9999',
                    tleLine2: '2 28654  99.1821 111.9351 0015379  94.2653 266.0275 14.12186249512332'
                },
                {
                    name: 'NOAA 19',
                    type: "weather",    
                    tleLine1: '1 33591U 09005A   15120.47475619  .00000166  00000-0  11521-3 0  9993',
                    tleLine2: '2 33591  98.9860  70.2496 0013223 308.0264  51.9713 14.11922134320756'
                }
                ];

// ============================================= INIT 
// Prepair leafleat and tangram
map = (function () {
    'use strict';

    var map_start_location = [0, 0, 3];
    /*** URL parsing ***/
    var url_hash = window.location.hash.slice(1).split('/');
    if (url_hash.length == 3) {
        map_start_location = [url_hash[1],url_hash[2], url_hash[0]];
        map_start_location = map_start_location.map(Number);
    }

    // Leaflet Map
    var map = L.map('map',{
        maxZoom: 20,
        trackResize: true,
        keyboard: false
    });

    // Tangram Layer
    var layer = Tangram.leafletLayer({
        scene: 'scene.yaml',
        attribution: '<a href="https://twitter.com/patriciogv" target="_blank">@patriciogv</a> | <a href="https://mapzen.com/tangram" target="_blank">Tangram</a> | &copy; OSM contributors | <a href="https://mapzen.com/" target="_blank">Mapzen</a>'
    });

    window.layer = layer;
    var scene = layer.scene;
    window.scene = scene;

    var keytext = "name";
    window.keytext = keytext;
    var valuetext = "ISS";
    window.valuetext = valuetext;

    function updateKey(value) {
        keytext = value;
        scene.config.layers["orbits"].properties.key_text = value;
        scene.rebuild();
        updateURL();
    }

    function updateValue(value) {
        valuetext = value;
        scene.config.layers["orbits"].properties.value_text = value;
        scene.rebuild();
        updateURL();
    }

    // var scene.picking = false;
    // Feature selection
    function initFeatureSelection () {
        // Selection info shown on hover
        var selection_info = document.createElement('div');
        selection_info.setAttribute('class', 'label');
        selection_info.style.display = 'block';
        selection_info.style.zindex = 1000;

        // Show selected feature on hover
        map.getContainer().addEventListener('mousemove', function (event) {
            var pixel = { x: event.clientX, y: event.clientY };

            scene.getFeatureAt(pixel).then(function(selection) {    
                if (!selection) {
                    return;
                }
                var feature = selection.feature;
                if (feature != null) {
                    // console.log("selection map: " + JSON.stringify(feature));

                    var label = '';
                    if (feature.properties != null) {
                        // console.log(feature.properties);
                        var obj = JSON.parse(JSON.stringify(feature.properties));
                        label = "";
                        for (var x in feature.properties) {
                            if (x === 'kind') continue;
                            var val = feature.properties[x]
                            label += "<span class='labelLine' key="+x+" value="+val+" onclick='setValuesFromSpan(this)'>"+x+" : "+val+"</span><br>"
                        }
                    }

                    if (label != '') {
                        selection_info.style.left = (pixel.x + 5) + 'px';
                        selection_info.style.top = (pixel.y + 15) + 'px';
                        selection_info.innerHTML = '<span class="labelInner">' + label + '</span>';
                        map.getContainer().appendChild(selection_info);
                    }
                    else if (selection_info.parentNode != null) {
                        selection_info.parentNode.removeChild(selection_info);
                    }
                }
                else if (selection_info.parentNode != null) {
                    selection_info.parentNode.removeChild(selection_info);
                }
            });

            // Don't show labels while panning
            if (scene.panning == true) {
                if (selection_info.parentNode != null) {
                    selection_info.parentNode.removeChild(selection_info);
                }
            }
        });
    
        // // capture popup clicks
        // // scene.labelLine.addEventListener('click', function (event) {
        // //     return true;
        // // });

        // // toggle popup picking state
        // map.getContainer().addEventListener('click', function (event) {
        //     picking = !picking;
        // });
        // // toggle popup picking state
        // map.getContainer().addEventListener('drag', function (event) {
        //     picking = false;
        // });
    }

    map.setView(map_start_location.slice(0, 2), map_start_location[2]);
    var hash = new L.Hash(map);

     // Resize map to window
    function resizeMap() {
        document.getElementById('map').style.width = window.innerWidth + 'px';
        document.getElementById('map').style.height = window.innerHeight + 'px';
        map.invalidateSize(false);
    }
    window.addEventListener('resize', resizeMap);
    resizeMap();

    /***** Render loop *****/
    window.addEventListener('load', function () {
        init();
        initFeatureSelection();
    });

    return map;
}());

function init() {
    // Scene initialized
    layer.on('init', function() {
        initOrbit();
    });
    layer.addTo(map);
}

function initOrbit() {
    addOrbitToTangramSource("orbits", satellites, samplesStep, samplesTotal, 120);
}

window.setTimeout( function() {
    var gl = scene.gl;
    var floatTextures = gl.getExtension('OES_texture_float');
    if (!floatTextures) {
        console.log('NO FLOATING POINT TEXTURE SUPPORT');
        return;
    } else {
        console.log('Floating point texture support');
    }

    var tracks = [];

    for (var sat of satellites) {
        // Generate the orbit for each satellite
        tracks.push(getOrbitTrack(sat,samplesStep,samplesTotal));
    }
    
    var width = samplesTotal;
    var height = satellites.length;

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
    // scene.styles.orbit.shaders.uniforms.u_data = canvas.toDataURL();
    // scene.rebuild();

    // // Using WebGL
    // Usefull resources: 
    //      - http://www.html5rocks.com/en/tutorials/webgl/typed_arrays/
    //      - http://stackoverflow.com/questions/22666556/webgl-texture-creation-trouble
    //      - http://nullprogram.com/blog/2014/06/29/
    
    var uniforms = {};
    uniforms.u_data = {};

    var pixels = new Float32Array(width*height*4);
    for (var y = 0; y < height; y++) {
        for (var x = 0; x < width; x++) {
            var index = (y*width+x)*4;
            var data = [ .5+(tracks[y][x].ln/180)*.5, .5+(tracks[y][x].lt/90)*.5];
            pixels[index] = data[0];
            pixels[index+1] = data[1];
            pixels[index+2] = 0;
            pixels[index+3] = 1;
        }
    }
    var texture = scene.styles.orbit.program.uniforms.u_data;
    scene.styles.orbit.shaders.uniforms.u_param = [samplesTotal,height,samplesStep];
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
},5000);
