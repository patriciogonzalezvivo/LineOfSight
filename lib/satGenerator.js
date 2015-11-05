// Depends on satellite.min.js
// https://github.com/shashwatak/satellite-js

var createObjectURL = (window.URL && window.URL.createObjectURL) || (window.webkitURL && window.webkitURL.createObjectURL);

function getEmptyFeature(name) {
    var obj = {};
    obj.type = "Feature";
    obj.geometry = {};
    obj.geometry.type = "LineString";
    obj.geometry.coordinates = [];
    obj.properties = {};
    obj.properties.kind = "orbit";
    obj.properties.name = name;
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

// Add a orbit to a geoJSON file
function addOrbitToTangramSource(sourceName, sat) {
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

    // Get the geoJSON to add the orbit to
    getHttp(scene.config.sources[sourceName].url, function (err, res) {
        if (err) {
            console.error(err);
        }
   		// Parse the geoJSON
        var geoJSON = JSON.parse(res);

	    // Add coordinates of the orbit to a feature on the JSON
        var featureA = getEmptyFeature(sat.name);
        var i = 0;
        var prevLon = track[0].ln;
        while (i < track.length) {
            if (prevLon > 0.0 && track[i].ln < 0.0){
            	// If pass the day change make another feature
                break;
            }
            featureA.geometry.coordinates.push([track[i].ln, track[i].lt]);
            prevLon = track[i].ln;
            i++;
        }
        geoJSON.features.push(featureA);

        if (i < track.length) {
        	var featureB = getEmptyFeature(sat.name);
        	while (i < track.length) {
	            featureB.geometry.coordinates.push([track[i].ln+360, track[i].lt]);
	            i++;
	        }
	        console.log("Adding second feature", featureB);
	        geoJSON.features.push(featureB);
        }

        // Make it a blob and return the url
        var content = JSON.stringify(geoJSON);
        scene.config.sources[sourceName].url = createObjectURL(new Blob([content]));
        scene.rebuild();
    });
}