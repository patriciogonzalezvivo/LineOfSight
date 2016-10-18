// Author: @patriciogv 2015

// GLOBAL PARAMETERS
//==========================
var defaultTime = 3600; // seconds -> 1 hr
var samplesTotal = 300; // n of samples
var samplesStep = 20; // seconds
var timeOffset = 120; // seconds
var startTime;

// Const
var EARTH_RADIUS = 6378137.0;

// SOURCES holders
var library, satellites, types, active_types, active_names;

// Dynamimc Content
var selection_info, last_selected;
var mapCenter = {lat: 0, lng: 0, elevation: 0};
var place = "Select a place on the world and hover over the visible satellites";
var placeCounter = 0;
var picking = false;

var PELIAS_KEY = 'search-ReWCLH4';

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
    if (query['name']) {
        active_names = query['name'] || '';
        active_types = '';
    } else {
        active_types = query['type'] ? query['type'] : 'visible';
        active_names = '';
    }

    samplesStep = query['step'] ? query['step'] : samplesStep;
    timeOffset = query['offset'] ? query['offset'] : timeOffset;
    samplesTotal = query['sec'] ? query['sec']/samplesStep+timeOffset : defaultTime/samplesStep+timeOffset;

    // Leaflet Map
    var map = L.map('map',{
        minZoom: 3,
        maxZoom: 11,
        trackResize: true,
        keyboard: false,
        scrollWheelZoom: (window.self === window.top) ? 'center' : false,
        dragging: (window.self !== window.top && L.Browser.touch) ? false : true,
        tap: (window.self !== window.top && L.Browser.touch) ? false : true,
    });
    L.control.geocoder(PELIAS_KEY,{pointIcon: false, markers: false}).addTo(map);

    // Tangram Layer
    var layer = Tangram.leafletLayer({
        scene: 'scene.yaml',
        attribution: '<a href="https://twitter.com/patriciogv" target="_blank">@patriciogv</a> | <a href="https://mapzen.com/tangram" target="_blank">Tangram</a> | &copy; OSM contributors | <a href="https://mapzen.com/" target="_blank">Mapzen</a> | <a href="https://satnogs.com/" target="_blank">SatNOGS</a>'
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

    /***** Render loop *****/
    window.addEventListener('load', function () {
        init();
    });
    return map;
}());

function init() {

    // On resize
    window.addEventListener('resize', resizeMap);

    // On drag
    map.on('moveend', function () {
        updatePosition();
    });

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

            if (active_names !== "") {
                updateNameQuerry();
            } else {
                updateType();
            }

        });
        initFeatureSelection();
    });
    layer.addTo(map);
    resizeMap();
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
    typesDOM.innerHTML = '<div id="coorner-top-left" class="coorner"></div><div id="coorner-top-right" class="coorner"></div><div id="coorner-bottom-left" class="coorner"></div><div id="coorner-bottom-right" class="coorner"></div>';
    typesDOM.innerHTML += '<span class="title" >Types</span><hr/>';

    for (var type of types) {
        var stt = '';
        if (type.visible === true) {
            stt = 'checked';
        }
        typesDOM.innerHTML += '<input type="checkbox" name="checkbox-option" id="checkbox-'+type.name+'" class="hide-checkbox" value="'+type.name+'" '+stt+'><label for="checkbox-'+type.name+'">'+type.label+'</label>';
    }

    if ( library === 'curated') {
        typesDOM.innerHTML += '<hr/>';
        typesDOM.innerHTML += '<hr/><a style="color: white; text-decoration: none;" href="http://patriciogonzalezvivo.github.io/LineOfSight/?load=all"><span style="color: white; text-decoration: none;">load more...</span></a>';
    }

    document.getElementById('types').addEventListener('click', function( event ) {
        active_names = '';
        updateNameQuerry();

        var checks = document.getElementById('types').getElementsByClassName('hide-checkbox');
        active_types = '';
        for (var check in checks) {
            if ( check !== 'checkbox-option' && check.indexOf('checkbox-')>-1) {
                if (checks[check].checked) {
                    active_types = checks[check].value + "," + active_types;
                }
            }
        }
        updateType();
    }, false);
}

function initFeatureSelection () {
    // Selection info shown on hover
    selection_info = document.createElement('div');
    selection_info.setAttribute('class', 'label');
    selection_info.style.display = 'block';
    selection_info.style.zindex = 1000;

    layer.setSelectionEvents({
        hover: function(selection) {
            if (picking) return;
            updateSelectedFeature(selection,false);
            stopMovement(selection);
        },
        click: function(selection) {
            // Don't show labels while panning
            if (scene.panning == true) {
                if (selection_info.parentNode != null) {
                    selection_info.parentNode.removeChild(selection_info);
                }
            } else {
                updateSelectedFeature(selection,true);
            }
        }
    });

    // toggle popup picking state
    map.getContainer().addEventListener('drag', function (event) {
        picking = false;
    });
}

//=========================================================== Update

function updateType() {
    // Search for active_type
    scene.config.global.active_types = active_types;

    // Update state
    var activeTypesArrag = active_types.split(',');
    var typesDOM = document.getElementsByClassName('hide-checkbox');
    for (var dom in typesDOM) {
        typesDOM[dom].checked = false;
    }

    for (var type of activeTypesArrag) {
        for (var dom in typesDOM){
            if (typesDOM[dom].value === type) {
                typesDOM[dom].checked = true;
                break;
            }
        }
    }
    reloadTangram();
    updateSearchPath();
}

function updateNameQuerry() {
    // Search for active_type
    scene.config.global.active_names = active_names;

    reloadTangram();
    updateSearchPath();
}

function updateSearchPath() {
    var path = "";
    // samplesTotal = query['sec'] ? query['sec']/samplesStep+timeOffset : defaultTime/samplesStep+timeOffset;
    path += "?";
    if (library === "all") {
       path += "load=all&";
    }

    if (active_names !== ''){
        path += "name="+active_names;
    } else {
        path += "type="+active_types;
    }
    // path += "&step="+samplesStep;
    // path += "&offset="+timeOffset;

    path += window.location.hash;
    window.history.pushState(null,null,path);
}

// Resize map to window
function resizeMap() {
    // document.getElementById('map').style.width = window.innerWidth + 'px';
    // document.getElementById('map').style.height = window.innerHeight + 'px';
    // map.invalidateSize(false);
}

var stopMovement = debounce(function(selection) {
    updateSelectedFeature(selection, true);
}, 500);

function updateSelectedFeature(selection, moreInfo) {
    // Return if there is no selection
    if (!selection) { return; }

    var feature = selection.feature;

    if (feature != null ) {
        var label = '';
        if (feature.properties != null) {
            var obj = JSON.parse(JSON.stringify(feature.properties));
            label = "<span class='title'>&nbsp;&nbsp;"+feature.properties.name+"</span><br><div class='hr'><hr />";
            for (var key in feature.properties) {
                // Ignore the kind, id, name and norad_id
                if (key === 'kind' || key === 'id' || key === 'name' || key === 'norad_id') {
                    continue;
                }
                else if (key === 'transmitters') {
                    if (feature.properties[key].length > 0) {
                        label += "<span class='labelLine'>&nbsp;&nbsp;&nbsp;&nbsp;"+key+" :</span><br>";
                        for (var t in feature.properties[key]) {
                            var trans = feature.properties[key][t];
                            label += "<span class='labelLine'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"+trans['description']+"</span> (";
                            for (var elem in trans) {
                                if (elem !== 'description' && elem !== 'invert' && elem !== 'mode') {
                                    label += "<span class='labelLine'>&nbsp;"+elem+" : "+(trans[elem]/1000000).toFixed(3)+"MHz&nbsp;</span>";
                                }
                            }
                            label += ")&nbsp;&nbsp;<br>";
                        }
                    }
                }
                else if (key === 'height') {
                    label += "<span class='labelLine'>&nbsp;&nbsp;&nbsp;&nbsp;"+key+" : "+feature.properties[key].toFixed(2)+"km&nbsp;&nbsp;&nbsp;&nbsp;</span><br>";
                }
                else {
                    label += "<span class='labelLine'>&nbsp;&nbsp;&nbsp;&nbsp;"+key+" : "+feature.properties[key]+"&nbsp;&nbsp;&nbsp;&nbsp;</span><br>";
                }
            }

            if (last_selected !== feature.properties.id) {
                scene.config.global.hovered = feature.properties.id;
                reloadTangram();
                last_selected = feature.properties.id;
            }

            if (moreInfo){
                label += "<div class='hr'><hr />";
                updatePosition();
                var moreInfo = getObserveCoords(satellites[feature.properties.id], mapCenter.lng, mapCenter.lat);
                
                if ( moreInfo.angles['elevation'] > 0) {
                    label += "<span class='labelLine'>&nbsp;&nbsp;Look angles:</span><br>";
                    for (var key in moreInfo.angles) {
                        if (key === 'azimuth' || key === 'elevation') {
                            label += "<span class='labelLine'>&nbsp;&nbsp;&nbsp;&nbsp;"+key+" : "+(moreInfo.angles[key]*(180/Math.PI)).toFixed(4)+" deg&nbsp;&nbsp;&nbsp;&nbsp;</span><br>";
                        } else {
                             label += "<span class='labelLine' key="+key+" value="+moreInfo.angles[key]+">&nbsp;&nbsp;&nbsp;&nbsp;"+key+" : "+moreInfo.angles[key].toFixed(4)+"&nbsp;&nbsp;&nbsp;&nbsp;</span><br>";
                        }
                       
                    }
                    label += "<span class='labelLine'>&nbsp;&nbsp;&nbsp;&nbsp;doppler factor: "+moreInfo.doopler+"&nbsp;&nbsp;&nbsp;&nbsp;</span><br>";
                    label += "<span class='labelLine'>&nbsp;&nbsp;at:</span><br>";
                    label += "<span class='labelLine'>&nbsp;&nbsp;&nbsp;&nbsp;lat: "+mapCenter.lat.toFixed(4)+"&nbsp;&nbsp;</span><br>";
                    label += "<span class='labelLine'>&nbsp;&nbsp;&nbsp;&nbsp;lng: "+mapCenter.lng.toFixed(4)+"&nbsp;&nbsp;</span><br>";

                    if (mapCenter.elevation) {
                        label += "<span class='labelLine'>&nbsp;&nbsp;&nbsp;&nbsp;elevation: "+mapCenter.elevation.toFixed(1)+"m&nbsp;&nbsp;</span><br>";
                    }
                } else {
                    label += "<span class='labelLine'>&nbsp;&nbsp;Not in line of sight&nbsp;&nbsp;</span><br>";
                }
                
            }
        }

        if (label !== '') {
            selection_info.style.left = (selection.pixel.x + 5) + 'px';
            selection_info.style.top = (selection.pixel.y + 15) + 'px';
            selection_info.innerHTML = '<div id="coorner-top-left" class="coorner"></div><div id="coorner-top-right" class="coorner"></div><div id="coorner-bottom-left" class="coorner"></div><div id="coorner-bottom-right" class="coorner"></div><span class="labelInner">' + label + '</span>';
            map.getContainer().appendChild(selection_info);
        } else if (selection_info.parentNode != null) {
            selection_info.parentNode.removeChild(selection_info);
        }
    }
    else if (selection_info.parentNode != null) {
        selection_info.parentNode.removeChild(selection_info);
    }
}

function updatePosition() {
    var pos = map.getCenter();
    mapCenter.lat = pos.lat;
    mapCenter.lng = pos.lng;

    document.getElementById('left-lat').innerHTML = 'LAT ' + mapCenter.lat.toFixed(4);
    document.getElementById('left-lng').innerHTML = 'LNG ' + mapCenter.lng.toFixed(4);
    if (scene.camera && scene.camera.position_meters) {
        document.getElementById('left-alt').innerHTML = 'ALT ' + (scene.camera.position_meters[2]*0.001).toFixed(1)+'km';
    }

    // This is my API Key for this project.
    // They are free! get one at https://mapzen.com/developers/sign_in
    var ELEVATION_KEY = 'elevation-m_o3bOc';
    getHttp('https://elevation.mapzen.com/height?json={"shape":[{"lat":'+mapCenter.lat+',"lon":'+mapCenter.lng+'}]}&api_key='+ELEVATION_KEY, function (err,res) {
        if (err) console.error(err);

        var elevation = JSON.parse(res);
        if (elevation.height !== undefined) {
            mapCenter.elevation = elevation.height[0];
            document.getElementById('left-elv').innerHTML = 'ELV ' + mapCenter.elevation.toFixed(1)+'m';
        }
    });
}

function updateLocation(text) {
    if (placeCounter > text.length || place === '') {
        placeCounter = 0;
        text = '';
        updateGeocode(mapCenter.lat, mapCenter.lng);
        setTimeout(function(){
            updateLocation('');
        }, 3000);
    } else {
        setTimeout( function(){
            document.getElementById('loc').innerHTML = text + '<span>|</span>';
            updateLocation(text+place.charAt(placeCounter++));
        }, 100);
    }
}

function updateGeocode (lat, lng) {

    // This is my API Key for this project.
    // They are free! get one at https://mapzen.com/developers/sign_in
    var endpoint = '//search.mapzen.com/v1/reverse?point.lat=' + lat + '&point.lon=' + lng + '&size=1&layers=coarse&api_key=' + PELIAS_KEY;

    getHttp(endpoint, function(err, res){
        if (err) {
            console.error(err);
        }

        // TODO: Much more clever viewport/zoom based determination of current location
        var response = JSON.parse(res);
        if (!response.features || response.features.length === 0) {
            // Sometimes reverse geocoding returns no results

            place = 'Observer at Unknown location';
            // var pixel = { x: window.screen.width/2, y: window.screen.height/2 };
            // scene.getFeatureAt(pixel).then(function(selection){
            //     if (selection.feature && selection.feature.properties && selection.feature.properties.kind) {
            //         place = 'Observer over ' + selection.feature.properties.kind;
            //     } else {
            //         place = 'Observer at Unknown location';
            //     }
            // });
        }
        else {
            place = 'Observer at '  + response.features[0].properties.label;
        }
    });
}

function reloadTangram() {
    if (startTime) {
        // Update the offset time to when the style is rebuild
        var now = new Date();
        var delta = now.getTime() - startTime.getTime();
        scene.styles.orbit.shaders.uniforms.u_param = [samplesTotal, satellites.length, samplesStep, timeOffset + delta/1000];
        scene.rebuild();
    }
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

function debounce(func, wait, immediate) {
    var timeout;
    return function() {
        var context = this, args = arguments;
        var later = function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        var callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
};
