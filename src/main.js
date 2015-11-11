// Author: @patriciogv 2015

// GLOBAL PARAMETERS
//==========================
var samplesTotal = 300;
var samplesStep = 20; // seconds
var timeOffset = 120; // seconds
var startTime = 0;

// Const
var EARTH_RADIUS = 6378137.0;

// SOURCES holders
var library, satellites, types;

// Dynamimc Content
var selection_info, last_selected;
var mapCenter = {lat: 0, lng: 0, elevation: 0};
var place = "Select a place on the world and hover over the visible satellites";
var placeCounter = 0;

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
    samplesStep = query['step'] ? query['step'] : samplesStep;
    samplesTotal = query['sec'] ? query['sec']/samplesStep : 6000/samplesStep;
    timeOffset = query['offset'] ? query['offset'] : timeOffset;

    // Leaflet Map
    var map = L.map('map',{
        minZoom: 4,
        maxZoom: 11,
        trackResize: true,
        keyboard: false,
        scrollWheelZoom: 'center'
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

    map.on('dragend', function () {
        updatePosition();
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
    updatePosition();
    updateLocation("");
}

function initOrbit() {
    startTime = new Date();
    addOrbitsToTangramSource('orbits', satellites, samplesStep, samplesTotal, timeOffset);
    addOrbitsToTangramImage('orbit', 'u_data', satellites, samplesTotal);
        reloadTangram();
}

function initHUD() {
    var typesDOM = document.getElementById('types');
    typesDOM.innerHTML = '<div id="coorner-top-left" class="coorner"></div><div id="coorner-top-right" class="coorner"></div><div id="coorner-bottom-left" class="coorner"></div><div id="coorner-bottom-right" class="coorner"></div><p class="title" >Types</p> <div class="hr"><hr /></div>'

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

function initFeatureSelection () {
    // Selection info shown on hover
    selection_info = document.createElement('div');
    selection_info.setAttribute('class', 'label');
    selection_info.style.display = 'block';
    selection_info.style.zindex = 1000;

    // Show selected feature on hover
    map.getContainer().addEventListener('mousemove', function (event) {
        var pixel = { x: event.clientX, y: event.clientY };

        scene.getFeatureAt(pixel).then( function(selection) { 
            // Return if there is no selection   
            if (!selection) {
                return;
            }

            var feature = selection.feature;
            if (feature != null) {
                var label = '';
                if (feature.properties != null) {
                    var obj = JSON.parse(JSON.stringify(feature.properties));
                    label = "<span class='title'>"+feature.properties.name+"</span><br><div class='hr'><hr />";
                    for (var key in feature.properties) {
                        // Ignore the kind and id
                        if (key === 'kind' || key === 'id' || key === 'name') continue;

                        var val = feature.properties[key]
                        label += "<span class='labelLine' key="+key+" value="+val+">"+key+" : "+val+"</span><br>"
                    }
                    label += "<div class='hr'><hr /><span class='labelLine'>Click for Look Angles and doopler factor</span><br>";
                }

                if (label != '') {
                    selection_info.style.left = (pixel.x + 5) + 'px';
                    selection_info.style.top = (pixel.y + 15) + 'px';
                    selection_info.innerHTML = '<div id="coorner-top-left" class="coorner"></div><div id="coorner-top-right" class="coorner"></div><div id="coorner-bottom-left" class="coorner"></div><div id="coorner-bottom-right" class="coorner"></div><span class="labelInner">' + label + '</span>';
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

    map.getContainer().addEventListener('click', function (event) {
        var pixel = { x: event.clientX, y: event.clientY };

        scene.getFeatureAt(pixel).then( function(selection) { 
            // Return if there is no selection   
            if (!selection) {
                return;
            }

            var feature = selection.feature;
            if (feature != null) {
                var label = '';
                if (feature.properties != null) {
                    var obj = JSON.parse(JSON.stringify(feature.properties));
                    label = "<span class='title'>"+feature.properties.name+"</span><br><div class='hr'><hr />";
                    for (var key in feature.properties) {
                        // Ignore the kind and id
                        if (key === 'kind' || key === 'id' || key === 'name') continue;
                        label += "<span class='labelLine' key="+key+" value="+feature.properties[key]+">"+key+" : "+feature.properties[key]+"</span><br>";
                    }
                    label += "<div class='hr'><hr />";
                    mapCenter = map.getCenter();
                    var moreInfo = getObserveCoords(satellites[feature.properties.id], mapCenter.lng, mapCenter.lat);
                    for (var key in moreInfo.angles) {
                        label += "<span class='labelLine' key="+key+" value="+moreInfo.angles[key]+">"+key+" : "+moreInfo.angles[key]+"</span><br>";
                    }
                    label += "<span class='labelLine' key=doopler value="+moreInfo.doopler+">doopler factor: "+moreInfo.doopler+"</span><br>";               
                }

                if (label != '') {
                    selection_info.style.left = (pixel.x + 5) + 'px';
                    selection_info.style.top = (pixel.y + 15) + 'px';
                    selection_info.innerHTML = '<div id="coorner-top-left" class="coorner"></div><div id="coorner-top-right" class="coorner"></div><div id="coorner-bottom-left" class="coorner"></div><div id="coorner-bottom-right" class="coorner"></div><span class="labelInner">' + label + '</span>';
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

function updatePosition() {
    var pos = map.getCenter();
    mapCenter.lat = pos.lat;
    mapCenter.lng = pos.lng;

    // This is my API Key for this project. 
    // They are free! get one at https://mapzen.com/developers/sign_in
    var ELEVATION_KEY = 'elevation-vaNyriU';
    getHttp('http://elevation.mapzen.com/height?json={"shape":[{"lat":'+mapCenter.lat+',"lon":'+mapCenter.lng+'}]}&api_key='+ELEVATION_KEY, function (err,res) {
        if (err) console.error(err);

        var elevation = JSON.parse(res);
        if (elevation !== undefined &&
            elevation.height !== undefined &&
            elevation.height.length >= 0) {
            mapCenter.elevation = elevation.height[0];
            document.getElementById('left-lat').innerHTML = "LAT " + mapCenter.lat.toFixed(4);
            document.getElementById('left-lng').innerHTML = "LNG " + mapCenter.lng.toFixed(4);
            document.getElementById('left-elv').innerHTML = "ELV " + mapCenter.elevation.toFixed(1);
        }
    });
}

function updateLocation(text) {
    if (placeCounter > text.length || place === "") {
        placeCounter = 0;
        text = "";
        updateGeocode(mapCenter.lat, mapCenter.lng);
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
    var PELIAS_KEY = 'search-SrJ-888';
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
