// Depends on satellite.min.js
// https://github.com/shashwatak/satellite-js

var createObjectURL = (window.URL && window.URL.createObjectURL) || (window.webkitURL && window.webkitURL.createObjectURL);
var idCounter = Math.round(Math.random()*10000);

function getEmptyFeature(name) {
    var obj = {};
    obj.type = "Feature";
    obj.geometry = {};
    obj.geometry.type = "LineString";
    obj.geometry.coordinates = [];
    obj.properties = {};
    obj.properties.kind = "orbit";
    obj.properties.name = name;
    obj.properties.id = idCounter;
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
    var position_gd    = satellite.eciToGeodetic(position_eci, gmst);

    // Geodetic coords are accessed via "longitude", "latitude".
    var lon = satellite.degreesLong(position_gd["longitude"]);
    var lat = satellite.degreesLat(position_gd["latitude"]);
    return { t: Math.round(date.getTime()/1000), ln: lon, lt: lat };
}

function getOrbitTrack(sat, samplesStep, samplesTotal) {
    samplesStep = samplesStep ? samplesStep : 60;
    samplesTotal = samplesTotal ? samplesTotal : 98;

    // Generate the orbit;
    var track = [];
    var satrec = satellite.twoline2satrec(sat.tleLine1, sat.tleLine2);
    var t = new Date();

    // t.setMinutes(t.getSeconds() - 180);
    for (var i = 0; i < samplesTotal; i++) {
        track.push(getSatellitePositionAt(satrec,t));
        t.setSeconds(t.getSeconds() + samplesStep); 
    }
    return track;
}

function getOrbitFeatures(sat, features) {

    // Generate the orbit;
    var track = getOrbitTrack(sat);

    // Generate a random id number
    idCounter = Math.round(Math.random()*10000);

    // Add coordinates of the orbit to a feature on the JSON
    var featureA = getEmptyFeature(sat.name);
    var i = 0;
    var prevLon = track[0].ln;
    while (i < track.length) {
        if (prevLon > 0.0 && track[i].ln < 0.0){
            // If pass the day change make another feature
            featureA.geometry.coordinates.push([track[i].ln+360, track[i].lt]);
            break;
        }
        featureA.geometry.coordinates.push([track[i].ln, track[i].lt]);
        prevLon = track[i].ln;
        i++;
    }
    features.push(featureA);

    if (i < track.length) {
        var featureB = getEmptyFeature(sat.name);
        while (i < track.length) {
            featureB.geometry.coordinates.push([track[i].ln+360, track[i].lt]);
            i++;
        }
        features.push(featureB);
    }
    return features;
}

// Add a orbit to a geoJSON file
function addOrbitToTangramSource(sourceName, sat) {
    var features = [];
    if (Array.isArray(sat)){
        for (s of sat){
            getOrbitFeatures(s, features);
        }
    } else {
        getOrbitFeatures(sat, features);
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