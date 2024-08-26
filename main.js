

document.getElementById('upload').addEventListener('change', handleFileSelect, false);

var map = L.map('map').setView([54.775, 9.45], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(map);

function handleFileSelect(evt) {
    var file = evt.target.files[0];
    var reader = new FileReader();

    reader.onload = function(e) {
        console.log('File loaded, processing ZIP...');
        var zip = new JSZip();
        zip.loadAsync(e.target.result)
            .then(function(zip) {
                console.log('ZIP processed:', zip);

                // Extract .prj file
                var prjFile = zip.file(/\.prj$/i);
                if (!prjFile.length) {
                    console.warn('No .prj file found, defaulting to EPSG:4326');
                    return { prjContent: null };
                }
                return prjFile[0].async("text");
            })
            .then(function(prjContent) {
                console.log('.prj content:', prjContent);
                var sourceCrs = proj4.Proj(proj4.defs('EPSG:4326')); // Default CRS

                if (prjContent) {
                    // Basic handling: check if the .prj content matches common EPSG codes
                    var crsMapping = {
                        'GEOGCS["WGS 84"': 'EPSG:4326',
                        'PROJCS["WGS 84 / UTM zone 33N"': 'EPSG:32633',
                        'PROJCS["WGS 84 / UTM zone 11N"': 'EPSG:32611'
                        // Add more mappings as needed
                    };

                    for (var key in crsMapping) {
                        if (prjContent.includes(key)) {
                            sourceCrs = proj4.Proj(proj4.defs(crsMapping[key]));
                            break;
                        }
                    }
                }

                // Extract the .shp file
                var shpFile = zip.file(/\.shp$/i);
                if (!shpFile.length) {
                    console.error('No .shp file found in ZIP');
                    return;
                }
                return shpFile[0].async("arraybuffer").then(function(shpBuffer) {
                    return { shpBuffer: shpBuffer, crs: sourceCrs };
                });
            })
            .then(function(result) {
                if (!result || !result.shpBuffer) {
                    console.error('Failed to process shapefile');
                    return;
                }

                // Load the shapefile using Shapefile.js
                shapefile.open(result.shpBuffer)
                    .then(source => source.read()
                        .then(function log(result) {
                            if (result.done) return;

                            console.log('Shapefile result:', result);
                            var geojson = result.value;
                            if (result.crs) {
                                geojson = reprojectGeoJson(geojson, result.crs);
                            }

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
                    .catch(error => console.error('Error loading shapefile:', error.stack));
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
