import React, { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polygon,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./CreateNHC.css";
import logo from "../assets/logo.png";

/* Leaflet needs explicit marker icon paths in this app bundle. */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

/* Collect polygon points from map clicks. */
const ClickableMap = ({ markers, setMarkers }) => {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setMarkers((prev) => [...prev, { lat, lng }]);
    },
  });
  return null;
};

/* Recenter the map after a search result is chosen. */
const MapController = ({ center }) => {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.flyTo(center, 16);
    }
  }, [center, map]);

  return null;
};

/* NHC drawing workspace. */
const CreateNHC = ({ onCreateNHC, onBack }) => {
  const [nhcName, setNhcName] = useState("");
  const [searchAddress, setSearchAddress] = useState("");
  const [markers, setMarkers] = useState([]);
  const [center, setCenter] = useState([33.5651, 73.0169]); // Default (Islamabad)

  const handleSearchAddress = async () => {
    if (!searchAddress) {
      alert("Please enter an address");
      return;
    }

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${searchAddress}`
      );
      const data = await res.json();

      if (data.length === 0) {
        alert("Address not found");
        return;
      }

      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);

      // Move the map to the searched location.
      setCenter([lat, lng]);

      // Seed the first marker at the searched location.
      setMarkers([{ lat, lng }]);
    } catch (error) {
      alert("Error searching address");
    }
  };

  const handleCreate = () => {
    if (!nhcName || markers.length < 3) {
      alert("Enter NHC name and draw at least 3 points");
      return;
    }

    onCreateNHC({
      name: nhcName,
      points: markers,
    });
  };

  const handleReset = () => {
    setNhcName("");
    setSearchAddress("");
    setMarkers([]);
  };

  return (
    <div className="create-nhc-container">
      {/* Logo */}
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <img src={logo} alt="Logo" style={{ height: "80px", width: "auto" }} />
      </div>

      {/* Header and navigation back to the previous admin screen. */}
      <div className="simple-header">
        <button className="back-btn" onClick={onBack}>
          ← Back
        </button>
        <h2>CREATE NHC</h2>
      </div>

      {/* NHC name input. */}
      <input
        className="nhc-input"
        placeholder="Enter NHC Name (e.g. 6th Road RWP)"
        value={nhcName}
        onChange={(e) => setNhcName(e.target.value)}
      />

      {/* Optional address search that also seeds the polygon. */}
      <input
        className="nhc-input"
        placeholder="Optional: Enter area/address"
        value={searchAddress}
        onChange={(e) => setSearchAddress(e.target.value)}
      />
      <button className="reset-btn" onClick={handleSearchAddress}>
        Search Area
      </button>

      {/* Interactive map for drawing the council boundary. */}
      <MapContainer
        center={center}
        zoom={16}
        className="map-box"
        style={{ height: "400px", width: "100%" }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        <MapController center={center} />
        <ClickableMap markers={markers} setMarkers={setMarkers} />

        {/* Boundary vertices. */}
        {markers.map((pos, idx) => (
          <Marker key={idx} position={[pos.lat, pos.lng]}>
            <Popup>Point {idx + 1}</Popup>
          </Marker>
        ))}

        {/* Filled polygon once at least three points are chosen. */}
        {markers.length >= 3 && (
          <Polygon
            positions={markers}
            pathOptions={{
              color: "green",
              fillColor: "green",
              fillOpacity: 0.4,
            }}
          />
        )}
      </MapContainer>

      {/* Reset and create actions. */}
      <div className="btn-row">
        <button className="reset-btn" onClick={handleReset}>
          Reset Points
        </button>
        <button className="create-btn" onClick={handleCreate}>
          CREATE NHC
        </button>
      </div>

      <p className="info-text">
        Search area → marker added → click map to complete boundary.
      </p>
    </div>
  );
};

export default CreateNHC;