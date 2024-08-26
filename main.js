document.getElementById('upload').addEventListener('change', handleFileSelect, false);

var map = L.map('map').setView([0, 0], 2); // Centered on the world

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
}).addTo(map);

function handleFileSelect(evt) {
    var file = evt.target.files[0];
    var reader = new FileReader();

    reader.onload = function(e) {
        var zip = new JSZip();
        zip.loadAsync(e.target.result)
            .then(function(zip) {
                // Extract .prj file
                return zip.file(/\.prj$/i)[0].async("text");
            })
            .then(function(prjContent) {
                // Parse the .prj file to get the projection info
                var crs = proj4.Proj(proj4.defs('EPSG:4326'));
                
                if (prjContent) {
                    // Use prj2epsg to get the EPSG code from the .prj content
                    var epsg = prj2epsg.fromPRJ(prjContent).code;
                    if (epsg) {
                        crs = proj4.Proj(proj4.defs('EPSG:' + epsg));
                    }
                }
                
                // Extract the .shp file
                return zip.file(/\.shp$/i)[0].async("arraybuffer").then(function(shpBuffer) {
                    return { shpBuffer: shpBuffer, crs: crs };
                });
            })
            .then(function(result) {
                // Load the shapefile using Shapefile.js
                shapefile.open(result.shpBuffer)
                    .then(source => source.read()
                        .then(function log(result) {
                            if (result.done) return;

                            // Reproject the geometry if necessary
                            var geojson = result.value;
                            if (result.crs) {
                                geojson = reprojectGeoJson(geojson, result.crs);
                            }
                            
                            // Display the GeoJSON on the map
                            L.geoJSON(geojson, {
                                onEachFeature: function (feature, layer) {
                                    layer.on('click', function () {
                                        alert('Polygon clicked: ' + JSON.stringify(feature.properties));
                                    });
                                }
                            }).addTo(map);

                            map.fitBounds(L.geoJSON(geojson).getBounds());

                            return source.read().then(log);
                        })
                    )
                    .catch(error => console.error(error.stack));
            })
            .catch(function(error) {
                console.error("Error reading shapefile:", error);
            });
    };

    reader.readAsArrayBuffer(file);
}


function reprojectGeoJson(geojson, sourceCrs) {
    return {
        type: "FeatureCollection",
        features: geojson.features.map(function (feature) {
            return {
                type: "Feature",
                properties: feature.properties,
                geometry: {
                    type: feature.geometry.type,
                    coordinates: reprojectCoordinates(feature.geometry.coordinates, sourceCrs)
                }
            };
        })
    };
}

function reprojectCoordinates(coordinates, sourceCrs) {
    return coordinates.map(function (coord) {
        if (Array.isArray(coord[0])) {
            return reprojectCoordinates(coord, sourceCrs);
        }
        return proj4(sourceCrs, proj4('EPSG:4326'), coord);
    });
}
