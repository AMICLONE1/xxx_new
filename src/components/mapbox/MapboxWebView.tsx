import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import Constants from 'expo-constants';

const { width, height } = Dimensions.get('window');

// Default location (Pune, India) for fallback
const DEFAULT_LOCATION = { lat: 18.5204, lng: 73.8567 };

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
  buyers?: Array<{
    id: string;
    name: string;
    location: { lat: number; lng: number };
    maxPricePerUnit: number;
    energyNeeded: number;
    rating?: number;
    distance?: number;
    preferredDeliveryWindow?: string;
  }>;
  userLocation?: { lat: number; lng: number };
  onMarkerClick?: (id: string, type: 'seller' | 'buyer') => void;
  onMapReady?: () => void;
  showBuyers?: boolean;
  showSellers?: boolean;
}

export const MapboxWebView: React.FC<MapboxWebViewProps> = ({
  accessToken,
  center,
  zoom = 12,
  sellers = [],
  buyers = [],
  userLocation,
  onMarkerClick,
  onMapReady,
  showBuyers = false,
  showSellers = true,
}) => {
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    // Send markers data to WebView when it changes
    if (webViewRef.current) {
      const sellersData = (showSellers ? sellers : []).map((seller) => ({
        id: seller.id,
        name: seller.name,
        lat: seller.location?.lat || DEFAULT_LOCATION.lat,
        lng: seller.location?.lng || DEFAULT_LOCATION.lng,
        price: seller.pricePerUnit,
        availableEnergy: seller.availableEnergy || 0,
        rating: seller.rating || 0,
        distance: seller.distance || 0,
        greenEnergy: seller.greenEnergy || false,
        type: 'seller',
      }));

      const buyersData = (showBuyers ? buyers : []).map((buyer) => ({
        id: buyer.id,
        name: buyer.name,
        lat: buyer.location?.lat || DEFAULT_LOCATION.lat,
        lng: buyer.location?.lng || DEFAULT_LOCATION.lng,
        maxPrice: buyer.maxPricePerUnit,
        energyNeeded: buyer.energyNeeded,
        rating: buyer.rating || 0,
        distance: buyer.distance || 0,
        preferredDeliveryWindow: buyer.preferredDeliveryWindow || '',
        type: 'buyer',
      }));

      webViewRef.current.postMessage(
        JSON.stringify({
          type: 'UPDATE_MARKERS',
          sellers: sellersData,
          buyers: buyersData,
        })
      );
    }
  }, [sellers, buyers, showBuyers, showSellers]);

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
    .mapboxgl-popup-content {
      background: transparent !important;
      padding: 0 !important;
      box-shadow: none !important;
      border-radius: 16px !important;
    }
    .mapboxgl-popup-tip {
      display: none !important;
    }
    .mapboxgl-popup-close-button {
      color: #94a3b8 !important;
      font-size: 20px !important;
      right: 8px !important;
      top: 8px !important;
    }
    .mapboxgl-popup-close-button:hover {
      color: #f8fafc !important;
      background: rgba(255,255,255,0.1) !important;
      border-radius: 50%;
    }
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
      el.style.backgroundColor = '#0062ff7a';
      el.style.border = '3px solid #ffffff';
      el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
      
      userMarker = new mapboxgl.Marker(el)
        .setLngLat([lng, lat])
        .addTo(map);
    }

    // Add markers (sellers and buyers)
    function addMarkers(sellersData, buyersData) {
      // Remove existing markers
      markers.forEach(marker => marker.remove());
      markers = [];

      // Helper to hash string to number for stable positioning
      function hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
          const char = str.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash;
        }
        return Math.abs(hash);
      }

      // Apply offset to markers based on their ID for stable, spread-out positioning
      const OFFSET_DIST = 0.004; // ~400 meters
      function applyOffset(items) {
        return items.map((item, index) => {
          const idHash = hashString(item.id);
          const angle = ((idHash % 360) * Math.PI) / 180;
          const radius = OFFSET_DIST * (0.5 + (index % 5) * 0.3);
          return {
            ...item,
            lat: item.lat + radius * Math.cos(angle),
            lng: item.lng + radius * Math.sin(angle),
          };
        });
      }

      // Apply offset to prevent overlapping
      const offsetSellers = applyOffset(sellersData || []);
      const offsetBuyers = applyOffset(buyersData || []);

      // Add seller markers
      offsetSellers.forEach(seller => {
        const el = document.createElement('div');
        el.className = 'seller-marker';
        el.style.width = '40px';
        el.style.height = '40px';
        el.style.borderRadius = '50%';
        el.style.backgroundColor = seller.greenEnergy ? '#3b82f6' : '#1d4ed8';
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
        
        // Create detailed popup with dark theme
        const popupContent = \`
          <div style="font-family: system-ui, -apple-system, sans-serif; width: 140px; background: #64748b; padding: 8px; border-radius: 8px; border: 1px solid #94a3b8;">
            <h3 style="margin: 0 0 6px 0; color: #f8fafc; font-size: 12px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              \${seller.name}
            </h3>
            <div style="display: flex; flex-direction: column; gap: 4px; font-size: 11px;">
              <div style="display: flex; align-items: center; gap: 6px; background: rgba(255, 255, 255, 0.15); padding: 5px 6px; border-radius: 6px;">
                <span style="font-size: 10px;">💰</span>
                <span style="color: #f1f5f9; font-weight: 600;">₹\${seller.price}/kWh</span>
              </div>
              \${seller.availableEnergy ? \`
              <div style="display: flex; align-items: center; gap: 6px; background: rgba(255, 255, 255, 0.15); padding: 5px 6px; border-radius: 6px;">
                <span style="font-size: 10px;">⚡</span>
                <span style="color: #f1f5f9; font-weight: 600;">\${seller.availableEnergy} kWh</span>
              </div>
              \` : ''}
              \${seller.rating ? \`
              <div style="display: flex; align-items: center; gap: 6px; background: rgba(255, 255, 255, 0.15); padding: 5px 6px; border-radius: 6px;">
                <span style="font-size: 10px;">⭐</span>
                <span style="color: #f1f5f9; font-weight: 600;">\${seller.rating.toFixed(1)}</span>
              </div>
              \` : ''}
            </div>
            <button 
              onclick="window.ReactNativeWebView.postMessage(JSON.stringify({type: 'MARKER_CLICK', id: '\${seller.id}', markerType: 'seller'}))"
              style="
                margin-top: 6px;
                width: 100%;
                padding: 6px 8px;
                background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                color: white;
                border: none;
                border-radius: 6px;
                font-weight: 600;
                font-size: 10px;
                cursor: pointer;
              "
            >
              View
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
          popup.addTo(map);
          marker.togglePopup();
        });

        markers.push(marker);
      });

      // Add buyer markers
      offsetBuyers.forEach(buyer => {
        const el = document.createElement('div');
        el.className = 'buyer-marker';
        el.style.width = '40px';
        el.style.height = '40px';
        el.style.borderRadius = '50%';
        el.style.backgroundColor = '#f59e0b';
        el.style.border = '3px solid #ffffff';
        el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.cursor = 'pointer';
        el.style.transition = 'transform 0.2s';
        
        // Add icon (downward arrow for buyers)
        el.innerHTML = '⬇️';
        el.style.fontSize = '20px';
        
        // Hover effect
        el.addEventListener('mouseenter', () => {
          el.style.transform = 'scale(1.2)';
        });
        el.addEventListener('mouseleave', () => {
          el.style.transform = 'scale(1)';
        });
        
        // Create detailed popup with dark theme
        const popupContent = \`
          <div style="font-family: system-ui, -apple-system, sans-serif; width: 140px; background: #64748b; padding: 8px; border-radius: 8px; border: 1px solid #94a3b8;">
            <h3 style="margin: 0 0 6px 0; color: #f8fafc; font-size: 12px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              \${buyer.name}
            </h3>
            <div style="display: flex; flex-direction: column; gap: 4px; font-size: 11px;">
              <div style="display: flex; align-items: center; gap: 6px; background: rgba(255, 255, 255, 0.15); padding: 5px 6px; border-radius: 6px;">
                <span style="font-size: 10px;">💰</span>
                <span style="color: #f1f5f9; font-weight: 600;">₹\${buyer.maxPrice}/kWh</span>
              </div>
              <div style="display: flex; align-items: center; gap: 6px; background: rgba(255, 255, 255, 0.15); padding: 5px 6px; border-radius: 6px;">
                <span style="font-size: 10px;">⚡</span>
                <span style="color: #f1f5f9; font-weight: 600;">\${buyer.energyNeeded} kWh</span>
              </div>
              \${buyer.rating ? \`
              <div style="display: flex; align-items: center; gap: 6px; background: rgba(255, 255, 255, 0.15); padding: 5px 6px; border-radius: 6px;">
                <span style="font-size: 10px;">⭐</span>
                <span style="color: #f1f5f9; font-weight: 600;">\${buyer.rating.toFixed(1)}</span>
              </div>
              \` : ''}
            </div>
            <button 
              onclick="window.ReactNativeWebView.postMessage(JSON.stringify({type: 'MARKER_CLICK', id: '\${buyer.id}', markerType: 'buyer'}))"
              style="
                margin-top: 6px;
                width: 100%;
                padding: 6px 8px;
                background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                color: white;
                border: none;
                border-radius: 6px;
                font-weight: 600;
                font-size: 10px;
                cursor: pointer;
              "
            >
              View
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
          .setLngLat([buyer.lng, buyer.lat])
          .setPopup(popup)
          .addTo(map);

        el.addEventListener('click', () => {
          popup.addTo(map);
          marker.togglePopup();
        });

        markers.push(marker);
      });

      // Fit map to show all markers
      const allMarkers = [...(sellersData || []), ...(buyersData || [])];
      if (allMarkers.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        allMarkers.forEach(item => {
          bounds.extend([item.lng, item.lat]);
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
          addMarkers(data.sellers || [], data.buyers || []);
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
    const initialSellers = ${JSON.stringify((sellers || []).map(s => ({
    id: s.id,
    name: s.name,
    lat: s.location?.lat || DEFAULT_LOCATION.lat,
    lng: s.location?.lng || DEFAULT_LOCATION.lng,
    price: s.pricePerUnit,
    availableEnergy: s.availableEnergy || 0,
    rating: s.rating || 0,
    distance: s.distance || 0,
    greenEnergy: s.greenEnergy || false,
  })))};
    
    const initialBuyers = ${JSON.stringify((buyers || []).map(b => ({
    id: b.id,
    name: b.name,
    lat: b.location?.lat || DEFAULT_LOCATION.lat,
    lng: b.location?.lng || DEFAULT_LOCATION.lng,
    maxPrice: b.maxPricePerUnit,
    energyNeeded: b.energyNeeded,
    rating: b.rating || 0,
    distance: b.distance || 0,
    preferredDeliveryWindow: b.preferredDeliveryWindow || '',
  })))};

    if (initialSellers.length > 0 || initialBuyers.length > 0) {
      addMarkers(initialSellers, initialBuyers);
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
        onMarkerClick(data.id, data.markerType || 'seller');
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

