// Initialize the map
var map = L.map('map').setView([54.775, 9.45], 12); // Change coordinates and zoom level as needed

// Add OpenStreetMap tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
}).addTo(map);

// Define GeoJSON layers
var geojsonLayer1, geojsonLayer2;

// Function to load GeoJSON files
function loadGeoJSON(url) {
    return fetch(url)
        .then(response => response.json())
        .then(data => {
            return L.geoJSON(data, {
                onEachFeature: function(feature, layer) {
                    if (feature.properties && feature.properties.name) {
                        layer.bindPopup(feature.properties.name);
                    }
                }
            });
        });
}

// Load GeoJSON files into layers
loadGeoJSON('path/to/your/geojson1.geojson').then(layer => {
    geojsonLayer1 = layer;
    geojsonLayer1.addTo(map);
});

loadGeoJSON('path/to/your/geojson2.geojson').then(layer => {
    geojsonLayer2 = layer;
    geojsonLayer2.addTo(map);
});

// Toggle layer visibility
document.getElementById('layer1').addEventListener('change', function() {
    if (this.checked) {
        geojsonLayer1.addTo(map);
    } else {
        map.removeLayer(geojsonLayer1);
    }
});

document.getElementById('layer2').addEventListener('change', function() {
    if (this.checked) {
        geojsonLayer2.addTo(map);
    } else {
        map.removeLayer(geojsonLayer2);
    }
});

// Add more layer toggle functionalities as needed
