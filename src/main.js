// Author: @patriciogv 2015

// GLOBAL PARAMETERS
//==========================
var samplesTotal = 300;
var samplesStep = 20;
var timeOffset = 120;
var startTime = 0;

var library, satellites, types;

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

    var query = parseQuery(window.location.search.slice(1));
    library = query['load'] ? query['load'] : 'curated';

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

    var keytext = 'name';
    window.keytext = keytext;
    var valuetext = 'ISS';
    window.valuetext = valuetext;

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
                        var obj = JSON.parse(JSON.stringify(feature.properties));
                        label = '';
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
        // Get the geoJSON to add the orbit to
        getHttp('data/'+library+'-satellites.json', function (err, res) {
            if (err) {
                console.error(err);
            }
            // Parse the geoJSON
            satellites = JSON.parse(res);
            initOrbit();
        });
        getHttp('data/'+library+'-types.json', function (err, res) {
            if (err) {
                console.error(err);
            }
            // Parse the geoJSON
            types = JSON.parse(res);
            initHUD();
        });
    });
    layer.addTo(map);
}

function initOrbit() {
    startTime = new Date();
    addOrbitToTangramSource('orbits', satellites, samplesStep, samplesTotal, timeOffset);

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
        reloadTangram();
    },3000);
}

function initHUD() {
    var typesDOM = document.getElementById('types');
    typesDOM.innerHTML = '<p id="types-title" >Types</p> <div class="hr"><hr /></div>'

    for (var type of types) {
        var stt = '';
        if (type.visible === true) {
            stt = 'checked';
        }
        typesDOM.innerHTML = typesDOM.innerHTML+ '<input type="checkbox" name="checkbox-option" id="checkbox-'+type.name+'" class="hide-checkbox" value="'+type.name+'" '+stt+'><label for="checkbox-'+type.name+'">'+type.label+'</label>';
    }

    document.getElementById('types').addEventListener('click', function( event ) {
        var checks = document.getElementById('types').getElementsByClassName('hide-checkbox');
        var active_types = '';
        for (var check in checks) {
            if ( check !== 'checkbox-option' && check.indexOf('checkbox-')>-1) {
                if (checks[check].checked) {
                    active_types = checks[check].value + " " + active_types;
                }   
            }
        }
        scene.config.layers.orbit.properties.active_types = active_types;
        reloadTangram();
    }, false);
}

function reloadTangram() {
    var now = new Date();
    var delta = now.getTime() - startTime.getTime();
    scene.styles.orbit.shaders.uniforms.u_param = [samplesTotal, satellites.length, samplesStep, timeOffset + delta/1000];
    scene.rebuild();
}

// ============================================= Helpers
function parseQuery (qstr) {
    var query = {};
    var a = qstr.split('&');
    for (var i in a) {
        var b = a[i].split('=');
        query[decodeURIComponent(b[0])] = decodeURIComponent(b[1]);
    }
    return query;
}
