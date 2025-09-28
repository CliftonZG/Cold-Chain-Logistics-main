import React, { useState, useEffect } from 'react';
import { GoogleMap, LoadScript, Marker, Polyline, InfoWindow } from '@react-google-maps/api';
import apiService from '../services/apiService';

const LogisticsOptimizer = () => {
  // State management
  const [optimizationResult, setOptimizationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [activeRoutes, setActiveRoutes] = useState([]);
  
  // Form state
  const [formData, setFormData] = useState({
    startLocation: '1.3521,103.8198', // Singapore coordinates
    endLocation: '1.3644,103.9915',
    waypoints: [],
    numVehicles: 2,
    optimizationType: 'time'
  });

  // Google Maps state
  const [mapCenter, setMapCenter] = useState({ lat: 1.3521, lng: 103.8198 });
  const [mapZoom, setMapZoom] = useState(12);
  const [markers, setMarkers] = useState([]);
  const [polylines, setPolylines] = useState([]);
  const [infoWindow, setInfoWindow] = useState(null);

  // Google Maps libraries
  const libraries = ['places'];

  // Load active routes on component mount
  useEffect(() => {
    loadActiveRoutes();
  }, []);

  // Load active routes
  const loadActiveRoutes = async () => {
    try {
      const result = await apiService.getActiveRoutes();
      setActiveRoutes(result.active_routes || []);
    } catch (err) {
      console.error('Error loading active routes:', err);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Add waypoint
  const addWaypoint = () => {
    const newWaypoint = prompt('Enter waypoint coordinates (lat,lng):');
    if (newWaypoint && validateCoordinates(newWaypoint)) {
      setFormData(prev => ({
        ...prev,
        waypoints: [...prev.waypoints, newWaypoint]
      }));
    } else {
      alert('Invalid coordinates format. Use: lat,lng');
    }
  };

  // Remove waypoint
  const removeWaypoint = (index) => {
    setFormData(prev => ({
      ...prev,
      waypoints: prev.waypoints.filter((_, i) => i !== index)
    }));
  };

  // Validate coordinates
  const validateCoordinates = (coordinates) => {
    const coordRegex = /^-?\d+\.?\d*,-?\d+\.?\d*$/;
    return coordRegex.test(coordinates);
  };

  // Optimize routes
  const handleOptimize = async () => {
    setLoading(true);
    setError(null);

    try {
      // Prepare locations array
      const locations = [
        formData.startLocation,
        ...formData.waypoints,
        formData.endLocation
      ].filter(Boolean);

      // Validate request
      if (locations.length < 2) {
        throw new Error('At least 2 locations required');
      }

      // Create optimization request
      const optimizationRequest = {
        locations,
        num_vehicles: parseInt(formData.numVehicles),
        optimization_type: formData.optimizationType,
        demands: [0, ...formData.waypoints.map(() => 1), 1], // 1 package per waypoint
        time_windows: [
          [0, 86400], // Depot: 24 hours
          ...formData.waypoints.map(() => [28800, 64800]), // 8am-6pm
          [28800, 64800] // End: 8am-6pm
        ]
      };

      // Call optimization API
      const result = await apiService.optimizeRoutes(optimizationRequest);
      
      if (result.success) {
        setOptimizationResult(result);
        displayRoutesOnMap(result.routes);
      } else {
        throw new Error(result.message || 'Optimization failed');
      }

    } catch (err) {
      setError(err.message);
      console.error('Optimization error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Display routes on Google Maps
  const displayRoutesOnMap = (routes) => {
    const allMarkers = [];
    const allPolylines = [];

    routes.forEach((route, index) => {
      if (route.google_maps_route) {
        // Create markers for stops
        const stopMarkers = createStopMarkers(route.stops, route.vehicle_id);
        allMarkers.push(...stopMarkers);

        // Create polylines for route
        const routePolylines = createRoutePolylines(route.google_maps_route, route.vehicle_id);
        allPolylines.push(...routePolylines);

        // Set map bounds
        const bounds = createBoundsFromRoute(route.google_maps_route);
        if (bounds) {
          // Update map center and zoom
          setMapCenter({
            lat: (bounds.northeast.lat + bounds.southwest.lat) / 2,
            lng: (bounds.northeast.lng + bounds.southwest.lng) / 2
          });
          setMapZoom(10);
        }
      }
    });

    setMarkers(allMarkers);
    setPolylines(allPolylines);
  };

  // Create markers for route stops
  const createStopMarkers = (stops, vehicleId) => {
    return stops.map((stop, index) => ({
      id: `stop_${vehicleId}_${stop.location_index}`,
      position: {
        lat: parseFloat(stop.coordinates.split(',')[0]),
        lng: parseFloat(stop.coordinates.split(',')[1])
      },
      title: `Stop ${stop.location_index}`,
      label: `${index + 1}`,
      info: {
        arrivalTime: stop.arrival_time_formatted,
        load: stop.load,
        timeWindow: stop.time_window
      }
    }));
  };

  // Create polylines for route
  const createRoutePolylines = (googleMapsRoute, vehicleId) => {
    if (!googleMapsRoute || !googleMapsRoute.overview_polyline) {
      return [];
    }

    const decodedPath = decodePolyline(googleMapsRoute.overview_polyline);
    
    return [{
      id: `route_${vehicleId}`,
      path: decodedPath,
      options: {
        strokeColor: getRouteColor(vehicleId),
        strokeWeight: 4,
        strokeOpacity: 0.8
      }
    }];
  };

  // Create bounds from route
  const createBoundsFromRoute = (googleMapsRoute) => {
    if (!googleMapsRoute || !googleMapsRoute.bounds) {
      return null;
    }
    return googleMapsRoute.bounds;
  };

  // Decode polyline
  const decodePolyline = (encoded) => {
    const poly = [];
    let index = 0;
    const len = encoded.length;
    let lat = 0;
    let lng = 0;

    while (index < len) {
      let b;
      let shift = 0;
      let result = 0;
      do {
        b = encoded.charAt(index++).charCodeAt(0) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charAt(index++).charCodeAt(0) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      poly.push({ lat: lat / 1e5, lng: lng / 1e5 });
    }
    return poly;
  };

  // Get route color
  const getRouteColor = (vehicleId) => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
    return colors[vehicleId % colors.length];
  };

  // Handle marker click
  const handleMarkerClick = (marker) => {
    setInfoWindow({
      position: marker.position,
      content: {
        title: marker.title,
        arrivalTime: marker.info.arrivalTime,
        load: marker.info.load
      }
    });
  };

  // Start route tracking
  const startRouteTracking = async (route) => {
    try {
      const routeId = `route_${Date.now()}`;
      await apiService.startRouteTracking(routeId, route.vehicle_id, route);
      alert(`Route tracking started for Vehicle ${route.vehicle_id}`);
      loadActiveRoutes(); // Refresh active routes
    } catch (err) {
      console.error('Error starting route tracking:', err);
      alert('Failed to start route tracking');
    }
  };

  return (
    <div className="logistics-optimizer">
      <div className="container">
        <h1>AI-Powered Logistics Optimization</h1>
        
        {/* Form Section */}
        <div className="form-section">
          <h2>Route Configuration</h2>
          
          <div className="form-group">
            <label>Start Location (lat,lng):</label>
            <input
              type="text"
              name="startLocation"
              value={formData.startLocation}
              onChange={handleInputChange}
              placeholder="1.3521,103.8198"
            />
          </div>

          <div className="form-group">
            <label>End Location (lat,lng):</label>
            <input
              type="text"
              name="endLocation"
              value={formData.endLocation}
              onChange={handleInputChange}
              placeholder="1.3644,103.9915"
            />
          </div>

          <div className="form-group">
            <label>Waypoints:</label>
            <div className="waypoints-list">
              {formData.waypoints.map((waypoint, index) => (
                <div key={index} className="waypoint-item">
                  <span>{waypoint}</span>
                  <button onClick={() => removeWaypoint(index)}>Remove</button>
                </div>
              ))}
            </div>
            <button onClick={addWaypoint}>Add Waypoint</button>
          </div>

          <div className="form-group">
            <label>Number of Vehicles:</label>
            <input
              type="number"
              name="numVehicles"
              value={formData.numVehicles}
              onChange={handleInputChange}
              min="1"
              max="10"
            />
          </div>

          <div className="form-group">
            <label>Optimization Type:</label>
            <select
              name="optimizationType"
              value={formData.optimizationType}
              onChange={handleInputChange}
            >
              <option value="time">Time Optimization</option>
              <option value="cost">Cost Optimization</option>
              <option value="balanced">Balanced</option>
            </select>
          </div>

          <div className="form-actions">
            <button 
              onClick={handleOptimize} 
              disabled={loading}
              className="optimize-btn"
            >
              {loading ? 'Optimizing...' : 'Optimize Routes'}
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="error-message">
            <h3>Error:</h3>
            <p>{error}</p>
          </div>
        )}

        {/* Results Section */}
        {optimizationResult && (
          <div className="results-section">
            <h2>Optimization Results</h2>
            
            <div className="summary">
              <h3>Summary</h3>
              <p>Total Cost: ${optimizationResult.summary.total_cost}</p>
              <p>Total Time: {optimizationResult.summary.total_time_hours} hours</p>
              <p>Vehicles Used: {optimizationResult.summary.num_vehicles_used}</p>
            </div>

            <div className="routes-list">
              {optimizationResult.routes.map((route, index) => (
                <div key={index} className="route-card">
                  <h4>Vehicle {route.vehicle_id}</h4>
                  <p>Cost: ${route.total_cost}</p>
                  <p>Time: {route.total_time_hours} hours</p>
                  <p>Load: {route.total_load} packages</p>
                  <button onClick={() => startRouteTracking(route)}>
                    Start Tracking
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Google Maps */}
        <div className="map-section">
          <h2>Route Visualization</h2>
          <div className="map-container">
            <LoadScript
              googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}
              libraries={libraries}
            >
              <GoogleMap
                mapContainerStyle={{ width: '100%', height: '500px' }}
                center={mapCenter}
                zoom={mapZoom}
              >
                {/* Markers */}
                {markers.map((marker, index) => (
                  <Marker
                    key={index}
                    position={marker.position}
                    title={marker.title}
                    label={marker.label}
                    onClick={() => handleMarkerClick(marker)}
                  />
                ))}

                {/* Polylines */}
                {polylines.map((polyline, index) => (
                  <Polyline
                    key={index}
                    path={polyline.path}
                    options={polyline.options}
                  />
                ))}

                {/* Info Window */}
                {infoWindow && (
                  <InfoWindow
                    position={infoWindow.position}
                    onCloseClick={() => setInfoWindow(null)}
                  >
                    <div>
                      <h4>{infoWindow.content.title}</h4>
                      <p>Arrival: {infoWindow.content.arrivalTime}</p>
                      <p>Load: {infoWindow.content.load} packages</p>
                    </div>
                  </InfoWindow>
                )}
              </GoogleMap>
            </LoadScript>
          </div>
        </div>

        {/* Active Routes */}
        {activeRoutes.length > 0 && (
          <div className="active-routes">
            <h2>Active Routes</h2>
            <div className="routes-grid">
              {activeRoutes.map((route) => (
                <div key={route.id} className="active-route-card">
                  <h4>Route {route.id}</h4>
                  <p>Vehicle: {route.vehicle_id}</p>
                  <p>Status: {route.status}</p>
                  <p>Started: {new Date(route.start_time).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LogisticsOptimizer;
