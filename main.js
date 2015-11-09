// Author: @patriciogv 2015
var samplesTotal = 300;
var samplesStep = 20;
var samplesOffset = 120;
var loadAll = true;

var types = { 
                amateur: false, 
                classfd: false,
                cubesat: false,
                dmc: false,
                education: false,
                engineering: false,
                galileo: false,
                geo: false,
                geodetic: false,
                'glo-ops': false,
                globalstar: false,
                goes: false,
                gorizont: false,
                'gps-ops': false,
                intelsat: false,
                iridium: false,
                military: false,
                molniya: false,
                musson: false,
                nnss: false,
                noaa: false,
                orbcomm: false,
                'other-comm': false,
                other: false,
                radar: false,
                raduga: false,
                resource: false,
                sarsat: false,
                sbas: false,
                science: false,
                stations: false,
                tdrss: false,
                'tle-new': false,
                visual: true,
                weather: false,
                'x-comm': false
            }

var satellites = [
                {     
                    name: "ISS (ZARYA)", 
                    type: "visual, tdrss, stations, amateur",
                    state: "operational", 
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
                    state: "operational", 
                    type: "weather",      
                    tleLine1: '1 25338U 98030A   15120.50133940  .00000181  00000-0  95272-4 0  9994',
                    tleLine2: '2 25338  98.7718 119.1083 0009683 311.6024  48.4325 14.25608869882046'
                },
                {
                    name: 'NOAA 18',
                    state: "operational", 
                    type: "weather",   
                    tleLine1: '1 28654U 05018A   15120.45078669  .00000138  00000-0  10028-3 0  9999',
                    tleLine2: '2 28654  99.1821 111.9351 0015379  94.2653 266.0275 14.12186249512332'
                },
                {
                    name: 'NOAA 19',
                    state: "operational", 
                    type: "weather",    
                    tleLine1: '1 33591U 09005A   15120.47475619  .00000166  00000-0  11521-3 0  9993',
                    tleLine2: '2 33591  98.9860  70.2496 0013223 308.0264  51.9713 14.11922134320756'
                },
                {
                    state: "operational", 
                    type: "education", 
                    name: "SAUDISAT 2", 
                    tleLine1: "1 28371U 04025F   15120.86324450  .00000363  00000-0  95978-4 0  9997", 
                    tleLine2: "2 28371  98.0249  91.1935 0024780 230.3750 129.5284 14.54021196574723"
                }, 
                {
                    state: "operational", 
                    type: "education", 
                    name: "SAUDISAT 3", 
                    tleLine1: "1 31118U 07012B   15120.78597718  .00000346  00000-0  66965-4 0  9994",
                    tleLine2: "2 31118  97.7359 145.6219 0013799 241.0365 118.9441 14.68865295430733"
                }, 
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
                    var label = '';
                    if (feature.properties != null) {
                        // console.log(feature.properties);
                        var obj = JSON.parse(JSON.stringify(feature.properties));
                        label = "";
                        for (var key in feature.properties) {
                            if (key === 'kind' || key === 'id') continue;
                            var val = feature.properties[key]
                            label += "<span class='labelLine' key="+key+" value="+val+" onclick='setValuesFromSpan(this)'>"+key+" : "+val+"</span><br>"
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
        if (loadAll) {
            // Get the geoJSON to add the orbit to
            getHttp("data/satellites.json", function (err, res) {
                if (err) {
                    console.error(err);
                }
                // Parse the geoJSON
                satellites = JSON.parse(res);;
                initOrbit();
            });
        } else {
            initOrbit();    
        }
    });
    layer.addTo(map);
}

function initOrbit() {
    addOrbitToTangramSource("orbits", satellites, samplesStep, samplesTotal, samplesOffset);

    var typesDOM = document.getElementById("types");
    var typesNames = Object.keys(types);

    typesDOM.innerHTML = '<p id="types-title" >Types</p> <div class="hr"><hr /></div>'
    for (var typeName of typesNames) {
        var stt = '';
        if (types[typeName]) {
            stt = 'checked';
        }
        typesDOM.innerHTML = typesDOM.innerHTML+ '<input type="checkbox" name="checkbox-option" id="checkbox-'+typeName+'" class="hide-checkbox" value="'+typeName+'" '+stt+'><label for="checkbox-'+typeName+'">'+typeName+'</label>';
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
        
        var width = samplesTotal;
        var height = satellites.length;

        // Usefull documentation: 
        //      - http://www.html5rocks.com/en/tutorials/webgl/typed_arrays/
        //      - http://stackoverflow.com/questions/22666556/webgl-texture-creation-trouble
        //      - http://nullprogram.com/blog/2014/06/29/
        
        var uniforms = {};
        uniforms.u_data = {};

        var pixels = new Float32Array(width*height*4);
        for (var y = 0; y < height; y++) {
            for (var x = 0; x < width; x++) {
                var index = (y*width+x)*4;
                pixels[index] = .5+(satellites[y].track[x].ln/180)*.5;
                pixels[index+1] = .5+(satellites[y].track[x].lt/90)*.5;
                pixels[index+2] = satellites[y].track[x].h/1000;
                pixels[index+3] = 1;
            }
        }
        var texture = scene.styles.orbit.program.uniforms.u_data;
        scene.styles.orbit.shaders.uniforms.u_param = [samplesTotal, height, samplesStep, samplesOffset];
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

        window.setTimeout( function() {
            // scene.config.layers["orbit-labels"].draw.text.visible = true;
            // scene.rebuild();

            document.getElementById("types").addEventListener("click", function( event ) {
                var checks = document.getElementById('types').getElementsByClassName('hide-checkbox');
                var active_types = "";
                for (var check in checks) {
                    if (check.indexOf('checkbox-')>-1) {
                        if (checks[check].checked) {
                            active_types = checks[check].value + " " + active_types;
                        }   
                    }
                }
                scene.config.layers.orbit.properties.active_types = active_types;
                scene.rebuild();
            }, false);
        }, 5000);
    },3000);
}

// [].forEach.call( document.querySelectorAll('.hide-checkbox'), function(element) {
//     console.log(element);
//     element.style.display = 'none';
// });
