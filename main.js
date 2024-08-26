document.getElementById('upload').addEventListener('change', handleFileSelect, false);

var map = L.map('map').setView([0, 0], 2); // Centered on the world

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
}).addTo(map);

function handleFileSelect(evt) {
    var file = evt.target.files[0];
    var reader = new FileReader();

    reader.onload = function(e) {
        var buffer = e.target.result;

        shapefile.open(buffer)
            .then(source => source.read()
                .then(function log(result) {
                    if (result.done) return;

                    var geojson = result.value;
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
    };

    reader.readAsArrayBuffer(file);
}
