// Depends on satellite.min.js
// https://github.com/shashwatak/satellite-js

var createObjectURL = (window.URL && window.URL.createObjectURL) || (window.webkitURL && window.webkitURL.createObjectURL);
var idCounter = -1;

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

function getEmptyFeature(sat) {
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
        // console.log("Computing orbit for",sat.name,"(",sat.type,"): ");
        sat.satrec = satellite.twoline2satrec(sat.tleLine1, sat.tleLine2);
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
        track.push(getSatellitePositionAt(sat.satrec,t));
        t.setSeconds(t.getSeconds() + samplesStep); 
    }
    return track;
}

function getOrbitFeatures(sat, features, samplesStep, samplesTotal, timeOffset) {

    if (sat.track === undefined) {
        // Generate the orbit;
        sat.track = getOrbitTrack(sat, samplesStep, samplesTotal, timeOffset);
    } 

    // Generate a random id number
    idCounter++;

    // Add coordinates of the orbit to a feature on the JSON
    var featureA = getEmptyFeature(sat);
    featureA.properties.height = sat.track[0].h; 
    var i = 0;
    var prevLon = sat.track[0].ln;
    while (i < sat.track.length) {
        if ( Math.abs(sat.track[i].ln - prevLon) > 180.0 ){
            // If pass the day change make another feature
            var next = sat.track[i].ln - prevLon > 0 ? -360 : 360;
            featureA.geometry.coordinates.push([sat.track[i].ln+next, sat.track[i].lt]);
            break;
        }
        featureA.geometry.coordinates.push([sat.track[i].ln, sat.track[i].lt]);
        prevLon = sat.track[i].ln;
        i++;
    }
    features.push(featureA);

    if (i < sat.track.length) {
        var featureB = getEmptyFeature(sat);
        featureB.properties.height = sat.track[i].h;
        while (i < sat.track.length) {
            featureB.geometry.coordinates.push([sat.track[i].ln+360, sat.track[i].lt]);
            i++;
        }
        features.push(featureB);
    }
    return features;
}

// Add a orbit to a geoJSON file
function addOrbitToTangramSource(sourceName, sat, samplesStep, samplesTotal, timeOffset) {
    var features = [];
    if (Array.isArray(sat)){
        for (s of sat){
            getOrbitFeatures(s, features, samplesStep, samplesTotal, timeOffset);
        }
    } else {
        getOrbitFeatures(sat, features, samplesStep, samplesTotal, timeOffset);
    }

    // Get the geoJSON to add the orbit to
    getHttp(scene.config.sources[sourceName].url, function (err, res) {
        if (err) {
            console.error(err);
        }
   		// Parse the geoJSON
        var geoJSON = JSON.parse(res);

	    // Precompute features
        for (var feature of features) {
             geoJSON.features.push(feature);
        }

        // Make it a blob and return the url
        var content = JSON.stringify(geoJSON);
        scene.config.sources[sourceName].url = createObjectURL(new Blob([content]));
        scene.rebuild();
    });
}