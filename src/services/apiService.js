// API Service for communicating with the logistics optimization backend
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

class ApiService {
  // Optimize routes using the backend API
  async optimizeRoutes(routeData) {
    try {
      const response = await fetch(`${API_BASE_URL}/optimize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(routeData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error optimizing routes:', error);
      throw error;
    }
  }

  // Get fleet information
  async getFleetInfo() {
    try {
      const response = await fetch(`${API_BASE_URL}/fleet`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching fleet info:', error);
      throw error;
    }
  }

  // Get weather data for a location
  async getWeatherData(lat, lng) {
    try {
      const response = await fetch(`${API_BASE_URL}/weather/${lat}/${lng}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching weather data:', error);
      throw error;
    }
  }

  // Start route tracking
  async startRouteTracking(routeId, vehicleId, routeData) {
    try {
      const response = await fetch(`${API_BASE_URL}/routes/${routeId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vehicle_id: vehicleId,
          route_data: routeData
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error starting route tracking:', error);
      throw error;
    }
  }

  // Update route progress
  async updateRouteProgress(routeId, currentStop, location) {
    try {
      const response = await fetch(`${API_BASE_URL}/routes/${routeId}/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_stop: currentStop,
          location: location
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating route progress:', error);
      throw error;
    }
  }

  // Complete route
  async completeRoute(routeId) {
    try {
      const response = await fetch(`${API_BASE_URL}/routes/${routeId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error completing route:', error);
      throw error;
    }
  }

  // Get active routes
  async getActiveRoutes() {
    try {
      const response = await fetch(`${API_BASE_URL}/routes/active`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching active routes:', error);
      throw error;
    }
  }

  // Health check
  async healthCheck() {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error checking health:', error);
      throw error;
    }
  }
}

// Create and export service instance
const apiService = new ApiService();
export default apiService;
