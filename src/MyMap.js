import React from "react";
import { GoogleMap, LoadScript, Marker, DirectionsService, DirectionsRenderer } from "@react-google-maps/api";

const containerStyle = { width: "100%", height: "500px" };
const center = { lat: 1.3521, lng: 103.8198 }; // Singapore coordinates

export default function MyMap() {
  const [directions, setDirections] = React.useState(null);

  // Example: set up a route (optional)
  const origin = { lat: 1.3521, lng: 103.8198 };
  const destination = { lat: 1.3644, lng: 103.9915 }; // example destination

  return (
    <LoadScript googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}>
      <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={12}>
        <Marker position={center} title="Delivery Hub" />

        {/* Optional: show directions */}
        <DirectionsService
          options={{
            origin: origin,
            destination: destination,
            travelMode: "DRIVING",
          }}
          callback={res => {
            if (res !== null && res.status === "OK") {
              setDirections(res);
            }
          }}
        />

        {directions && <DirectionsRenderer directions={directions} />}
      </GoogleMap>
    </LoadScript>
  );
}
