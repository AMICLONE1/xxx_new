import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import Constants from 'expo-constants';

const { width, height } = Dimensions.get('window');

interface MapboxWebViewProps {
  accessToken: string;
  center: { lat: number; lng: number };
  zoom?: number;
  sellers?: Array<{
    id: string;
    name: string;
    location: { lat: number; lng: number };
    pricePerUnit: number;
    availableEnergy?: number;
    rating?: number;
    distance?: number;
    greenEnergy?: boolean;
  }>;
  userLocation?: { lat: number; lng: number };
  onMarkerClick?: (sellerId: string) => void;
  onMapReady?: () => void;
}

export const MapboxWebView: React.FC<MapboxWebViewProps> = ({
  accessToken,
  center,
  zoom = 12,
  sellers = [],
  userLocation,
  onMarkerClick,
  onMapReady,
}) => {
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    // Send sellers data to WebView when it changes
    if (webViewRef.current && sellers.length > 0) {
      const sellersData = sellers.map((seller) => ({
        id: seller.id,
        name: seller.name,
        lat: seller.location.lat,
        lng: seller.location.lng,
        price: seller.pricePerUnit,
        availableEnergy: seller.availableEnergy || 0,
        rating: seller.rating || 0,
        distance: seller.distance || 0,
        greenEnergy: seller.greenEnergy || false,
      }));

      webViewRef.current.postMessage(
        JSON.stringify({
          type: 'UPDATE_MARKERS',
          sellers: sellersData,
        })
      );
    }
  }, [sellers]);

  // Update user location when it changes
  useEffect(() => {
    if (webViewRef.current && userLocation) {
      webViewRef.current.postMessage(
        JSON.stringify({
          type: 'UPDATE_USER_LOCATION',
          lat: userLocation.lat,
          lng: userLocation.lng,
        })
      );
    }
  }, [userLocation]);

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Mapbox Map</title>
  <script src="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js"></script>
  <link href="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css" rel="stylesheet" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { width: 100%; height: 100vh; overflow: hidden; }
    #map { width: 100%; height: 100vh; }
    .mapboxgl-ctrl-logo { display: none !important; }
    .mapboxgl-ctrl-attrib { display: none !important; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const ACCESS_TOKEN = '${accessToken}';
    const CENTER = [${center.lng}, ${center.lat}];
    const ZOOM = ${zoom};
    let map;
    let markers = [];
    let userMarker = null;

    mapboxgl.accessToken = ACCESS_TOKEN;

    map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/streets-v12',
      center: CENTER,
      zoom: ZOOM,
      attributionControl: false,
    });

    map.on('load', () => {
      // Notify React Native that map is ready
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_READY' }));
      }
    });

    // Add user location marker
    function addUserMarker(lat, lng) {
      if (userMarker) {
        userMarker.remove();
      }
      
      const el = document.createElement('div');
      el.className = 'user-marker';
      el.style.width = '20px';
      el.style.height = '20px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = '#3b82f6';
      el.style.border = '3px solid #ffffff';
      el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
      
      userMarker = new mapboxgl.Marker(el)
        .setLngLat([lng, lat])
        .addTo(map);
    }

    // Add seller markers
    function addSellerMarkers(sellersData) {
      // Remove existing markers
      markers.forEach(marker => marker.remove());
      markers = [];

      sellersData.forEach(seller => {
        const el = document.createElement('div');
        el.className = 'seller-marker';
        el.style.width = '40px';
        el.style.height = '40px';
        el.style.borderRadius = '50%';
        el.style.backgroundColor = seller.greenEnergy ? '#10b981' : '#059669';
        el.style.border = '3px solid #ffffff';
        el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.cursor = 'pointer';
        el.style.transition = 'transform 0.2s';
        
        // Add icon (using Unicode or emoji)
        el.innerHTML = seller.greenEnergy ? '☀️' : '⚡';
        el.style.fontSize = '20px';
        
        // Hover effect
        el.addEventListener('mouseenter', () => {
          el.style.transform = 'scale(1.2)';
        });
        el.addEventListener('mouseleave', () => {
          el.style.transform = 'scale(1)';
        });
        
        // Create detailed popup
        const popupContent = \`
          <div style="font-family: system-ui, -apple-system, sans-serif; min-width: 200px;">
            <h3 style="margin: 0 0 8px 0; color: #111827; font-size: 16px; font-weight: 600;">
              \${seller.name}
            </h3>
            <div style="display: flex; flex-direction: column; gap: 6px; font-size: 14px;">
              <div style="display: flex; align-items: center; gap: 4px;">
                <span style="color: #6b7280;">💰 Price:</span>
                <span style="color: #111827; font-weight: 600;">₹\${seller.price}/kWh</span>
              </div>
              \${seller.availableEnergy ? \`
              <div style="display: flex; align-items: center; gap: 4px;">
                <span style="color: #6b7280;">⚡ Available:</span>
                <span style="color: #111827; font-weight: 600;">\${seller.availableEnergy} kWh</span>
              </div>
              \` : ''}
              \${seller.rating ? \`
              <div style="display: flex; align-items: center; gap: 4px;">
                <span style="color: #6b7280;">⭐ Rating:</span>
                <span style="color: #111827; font-weight: 600;">\${seller.rating.toFixed(1)}</span>
              </div>
              \` : ''}
              \${seller.distance ? \`
              <div style="display: flex; align-items: center; gap: 4px;">
                <span style="color: #6b7280;">📍 Distance:</span>
                <span style="color: #111827; font-weight: 600;">\${seller.distance.toFixed(1)} km</span>
              </div>
              \` : ''}
            </div>
            <button 
              onclick="window.ReactNativeWebView.postMessage(JSON.stringify({type: 'MARKER_CLICK', sellerId: '\${seller.id}'}))"
              style="
                margin-top: 12px;
                width: 100%;
                padding: 8px 16px;
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: white;
                border: none;
                border-radius: 8px;
                font-weight: 600;
                font-size: 14px;
                cursor: pointer;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              "
              onmouseover="this.style.opacity='0.9'"
              onmouseout="this.style.opacity='1'"
            >
              View Details
            </button>
          </div>
        \`;
        
        const popup = new mapboxgl.Popup({
          offset: 25,
          closeButton: true,
          closeOnClick: false,
          maxWidth: '300px',
        }).setHTML(popupContent);
        
        const marker = new mapboxgl.Marker(el)
          .setLngLat([seller.lng, seller.lat])
          .setPopup(popup)
          .addTo(map);

        el.addEventListener('click', () => {
          // Open popup on click
          popup.addTo(map);
          marker.togglePopup();
        });

        markers.push(marker);
      });

      // Fit map to show all markers
      if (sellersData.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        sellersData.forEach(seller => {
          bounds.extend([seller.lng, seller.lat]);
        });
        if (userMarker) {
          bounds.extend(userMarker.getLngLat());
        }
        map.fitBounds(bounds, {
          padding: 50,
          maxZoom: 15,
          duration: 1000,
        });
      }
    }

    // Listen for messages from React Native
    window.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'UPDATE_MARKERS') {
          addSellerMarkers(data.sellers);
        } else if (data.type === 'UPDATE_USER_LOCATION') {
          addUserMarker(data.lat, data.lng);
          map.setCenter([data.lng, data.lat]);
        } else if (data.type === 'SET_CENTER') {
          map.setCenter([data.lng, data.lat]);
          map.setZoom(data.zoom || ZOOM);
        }
      } catch (e) {
        console.error('Error parsing message:', e);
      }
    });

    // Initial markers
    const initialSellers = ${JSON.stringify(sellers.map(s => ({
      id: s.id,
      name: s.name,
      lat: s.location.lat,
      lng: s.location.lng,
      price: s.pricePerUnit,
      availableEnergy: s.availableEnergy || 0,
      rating: s.rating || 0,
      distance: s.distance || 0,
      greenEnergy: s.greenEnergy || false,
    })))};

    if (initialSellers.length > 0) {
      addSellerMarkers(initialSellers);
    }

    // Add user location if provided
    const userLoc = ${userLocation ? JSON.stringify({ lat: userLocation.lat, lng: userLocation.lng }) : 'null'};
    if (userLoc) {
      addUserMarker(userLoc.lat, userLoc.lng);
    }
  </script>
</body>
</html>
  `;

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      if (data.type === 'MAP_READY' && onMapReady) {
        onMapReady();
      } else if (data.type === 'MARKER_CLICK' && onMarkerClick) {
        onMarkerClick(data.sellerId);
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: htmlContent }}
        style={styles.webview}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  webview: {
    flex: 1,
    backgroundColor: '#f0fdf4',
  },
});

