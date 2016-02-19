// Depends on satellite.min.js
// https://github.com/shashwatak/satellite-js

var createObjectURL =  (window.URL && window.URL.createObjectURL) || (window.webkitURL && window.webkitURL.createObjectURL);
var idCounter = -1;
var glslData;

function makeFeature(sat) {
    sat.type = sat.type ? sat.type : "---";
    sat.state = sat.state ? sat.state: "operational"
    var obj = {
        type: "Feature",
        geometry: { 
            type:"LineString", 
            coordinates:[]
        },
        properties: { 
            kind: "orbit",
            name: sat.name,
            norad_id: sat.norad_id,
            transmitters: sat.transmitters,
            id: idCounter 
        }
    };
    if (sat.type) {
        obj.properties.type = sat.type;
    }
    if (sat.state) {
        obj.properties.state = sat.state;
    }
    return obj;
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
    var position_gd = satellite.eciToGeodetic(position_eci, gmst);

    // Geodetic coords are accessed via "longitude", "latitude".
    return { 
                t:  Math.round(date.getTime()/1000), 
                ln: satellite.degreesLong(position_gd["longitude"]), 
                lt: satellite.degreesLat(position_gd["latitude"]),
                h:  position_gd.height
            };
}

function getOrbitTrack(sat, samplesStep, samplesTotal, timeOffset) {
    if (sat.satrec === undefined) {
        try {
            sat.satrec = satellite.twoline2satrec(sat.tleLine1, sat.tleLine2);
        }
        catch(err) {
            console.log("getOrbitTrack: satrec ", err, sat)
            return []
        }
    }

    samplesStep = samplesStep ? samplesStep : 60;       // seconds
    samplesTotal = samplesTotal ? samplesTotal : 98;    // samples * step = total_tracked_time (seconds)
    timeOffset = timeOffset ? timeOffset : 0;           // secs

    // Generate the orbit;
    var track = [];
    var t = new Date();
    if (timeOffset !== 0 ) {
        t.setSeconds ( t.getSeconds() - timeOffset );
    }
    // t.setMinutes(t.getSeconds() - 180);
    for (var i = 0; i < samplesTotal; i++) {
        var pos = [];
        try {
            pos = getSatellitePositionAt(sat.satrec,t);
        }
        catch(err) {
            console.log("getOrbitTrack: ", err, t, sat);
            break;
        }
        track.push(pos);
        t.setSeconds(t.getSeconds() + samplesStep); 
    }
    return track;
}

function getOrbitFeatures(sat, features, samplesStep, samplesTotal, timeOffset) {

    if (sat.track === undefined) {
        // Generate the orbit;
        sat.track = getOrbitTrack(sat, samplesStep, samplesTotal, timeOffset);
    } 

    // Generate unique id number
    idCounter++;

    if (sat.track.length > 2) {
        // Add coordinates of the orbit to a feature on the JSON        
        var i = 0;
        var prevLon = sat.track[0].ln;
        while (i < sat.track.length) {
            var featureA = makeFeature(sat);
            featureA.properties.height = sat.track[0].h; 
            while (i < sat.track.length) {
                if ( Math.abs(sat.track[i].ln - prevLon) > 180.0 ){
                    // If pass the day change make another feature
                    var next = sat.track[i].ln - prevLon > 0 ? -360 : 360;
                    featureA.geometry.coordinates.push([sat.track[i].ln+next, sat.track[i].lt]);
                    prevLon = sat.track[i].ln;
                    break;
                }
                featureA.geometry.coordinates.push([sat.track[i].ln, sat.track[i].lt]);
                prevLon = sat.track[i].ln;
                i++;
            }
            features.push(featureA);
        }
    }
    
    return features;
}

function getObserveCoords(sat, lon, lat) {
 
    var now = new Date();
    // NOTE: while Javascript Date returns months in range 0-11, all satellite.js methods require
    // months in range 1-12.
    var positionAndVelocity = satellite.propagate(
        sat.satrec,
        now.getUTCFullYear(),
        now.getUTCMonth() + 1, // Note, this function requires months in range 1-12.
        now.getUTCDate(),
        now.getUTCHours(),
        now.getUTCMinutes(),
        now.getUTCSeconds()
    );

    // The position_velocity result is a key-value pair of ECI coordinates.
    // These are the base results from which all other coordinates are derived.
    var positionEci = positionAndVelocity.position,
        velocityEci = positionAndVelocity.velocity;

    // You will need GMST for some of the coordinate transforms.
    // http://en.wikipedia.org/wiki/Sidereal_time#Definition
    // NOTE: GMST, though a measure of time, is defined as an angle in radians.
    // Also, be aware that the month range is 1-12, not 0-11.
    var gmst = satellite.gstimeFromDate(
        now.getUTCFullYear(),
        now.getUTCMonth() + 1, // Note, this function requires months in range 1-12.
        now.getUTCDate(),
        now.getUTCHours(),
        now.getUTCMinutes(),
        now.getUTCSeconds()
    );

    // Set the Observer at 122.03 West by 36.96 North, in RADIANS
    var observerGd = {
        longitude: lon * .017453292519943295,
        latitude: lat * .017453292519943295,
        height: 0.370
    };

    var positionEcf   = satellite.eciToEcf(positionEci, gmst),
        velocityEcf   = satellite.eciToEcf(velocityEci, gmst),
        observerEcf   = satellite.geodeticToEcf(observerGd),
        positionGd    = satellite.eciToGeodetic(positionEci, gmst),
        lookAngles    = satellite.ecfToLookAngles(observerGd, positionEcf),
        dopplerFactor = satellite.dopplerFactor(observerEcf, positionEcf, velocityEcf);

    return { angles: lookAngles, doopler: dopplerFactor }
}
// ==================================================

// Add a orbit to a geoJSON file
function addOrbitsToTangramSource(sourceName, satData, samplesStep, samplesTotal, timeOffset) {
    var features = [];
    if (Array.isArray(satData)){
        for (sat of satData){
            getOrbitFeatures(sat, features, samplesStep, samplesTotal, timeOffset);
        }
    } else {
        getOrbitFeatures(satData, features, samplesStep, samplesTotal, timeOffset);
    }

    // Get the geoJSON to add the orbit to
    scene.setDataSource("orbits", {type: 'GeoJSON', data: {
        "type": "FeatureCollection",
        "features": features
    }});
}

function addOrbitsToTangramImage(styleName, imageName, satData, samplesTotal) {
    data = new Data2Image();
    data.setTotalInstances(samplesTotal*2);
    window.satData = satData;

    for (var i = 0; i < satData.length; i++) {
        data.addElement(satData[i].name, 'ufloat', (instance, element) => {
            var sat = satellites[element.id];
            if (instance < samplesTotal) {
                return ((180+sat.track[instance].ln)/360);
            } else {
                return (.5+(lat2y(sat.track[instance-samplesTotal].lt)/180)*.5);
            }
        });
    }

    scene.config.textures.orbit.url = data.getUrl();
    scene.updateConfig({ rebuild: true });
}

// ============================================= Helpers
function lat2y(a) { return 180/Math.PI * Math.log(Math.tan(Math.PI/4+a*(Math.PI/180)/2)); }

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