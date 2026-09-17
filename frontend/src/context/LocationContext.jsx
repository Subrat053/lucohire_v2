import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import {
  getEffectiveUserLocation,
  saveUserLocationContext,
  getBrowserCurrentLocation,
  getApproxLocationFromGoogle
} from '../services/userLocationContextService';

const LocationContext = createContext(null);

export const useLocationContext = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error("useLocationContext must be used within a LocationProvider");
  }
  return context;
};

export const LocationProvider = ({ children }) => {
  const { user, profile } = useAuth();
  const [locationContext, setLocationContextState] = useState(null);
  const [locationPermissionStatus, setLocationPermissionStatus] = useState("prompt");

  // Determine browser permissions status on load
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' })
        .then((permissionStatus) => {
          setLocationPermissionStatus(permissionStatus.state);
          permissionStatus.onchange = () => {
            setLocationPermissionStatus(permissionStatus.state);
          };
        })
        .catch(() => {});
    }
  }, []);

  const refreshLocationContext = useCallback(async (forceGeolocation = false) => {
    if (forceGeolocation) {
      try {
        const coords = await getBrowserCurrentLocation();
        if (coords && coords.latitude) {
          const googleLoc = await getApproxLocationFromGoogle(coords.latitude, coords.longitude);
          if (googleLoc) {
            const fullLoc = {
              source: "browser",
              radiusMeters: 30000,
              ...googleLoc,
            };
            setLocationContextState(fullLoc);
            saveUserLocationContext(fullLoc);
            setLocationPermissionStatus("granted");
            return fullLoc;
          }
        }
      } catch (err) {
        setLocationPermissionStatus("denied");
      }
    }

    const effective = await getEffectiveUserLocation(user, profile);
    setLocationContextState(effective);
    if (effective.source === "browser") {
      setLocationPermissionStatus("granted");
    }
    return effective;
  }, [user, profile]);

  const setManualLocationContext = useCallback((locationData) => {
    if (!locationData) return;
    const structuredLoc = {
      ...locationData,
      source: "localStorage",
      radiusMeters: locationData.radiusMeters || 30000,
    };
    setLocationContextState(structuredLoc);
    saveUserLocationContext(structuredLoc);
  }, []);

  // Update effective location context when user session or profile changes
  useEffect(() => {
    refreshLocationContext();
  }, [user, profile, refreshLocationContext]);

  const value = {
    locationContext,
    refreshLocationContext,
    setManualLocationContext,
    locationPermissionStatus,
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};

export default LocationContext;
