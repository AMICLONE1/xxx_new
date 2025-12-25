import { Seller } from '@/types';

/**
 * Mock sellers data for development/testing when backend is unavailable
 */
export const generateMockSellers = (userLocation: { lat: number; lng: number }): Seller[] => {
  // Generate sellers around Pune area
  const baseLat = userLocation.lat;
  const baseLng = userLocation.lng;

  const mockSellers: Seller[] = [
    {
      id: 'seller_1',
      name: 'Green Acres Society',
      location: {
        lat: baseLat + 0.01,
        lng: baseLng + 0.01,
      },
      pricePerUnit: 6.50,
      availableEnergy: 150,
      rating: 4.8,
      greenEnergy: true,
    },
    {
      id: 'seller_2',
      name: 'Solar Power Solutions',
      location: {
        lat: baseLat - 0.008,
        lng: baseLng + 0.015,
      },
      pricePerUnit: 7.20,
      availableEnergy: 200,
      rating: 4.6,
      greenEnergy: true,
    },
    {
      id: 'seller_3',
      name: 'Eco Energy Hub',
      location: {
        lat: baseLat + 0.012,
        lng: baseLng - 0.01,
      },
      pricePerUnit: 8.00,
      availableEnergy: 120,
      rating: 4.9,
      greenEnergy: true,
    },
    {
      id: 'seller_4',
      name: 'Kothrud Solar Farm',
      location: {
        lat: baseLat - 0.015,
        lng: baseLng - 0.008,
      },
      pricePerUnit: 5.80,
      availableEnergy: 300,
      rating: 4.7,
      greenEnergy: true,
    },
    {
      id: 'seller_5',
      name: 'Renewable Energy Co.',
      location: {
        lat: baseLat + 0.02,
        lng: baseLng + 0.02,
      },
      pricePerUnit: 7.50,
      availableEnergy: 180,
      rating: 4.5,
      greenEnergy: true,
    },
    {
      id: 'seller_6',
      name: 'Sunshine Apartments',
      location: {
        lat: baseLat - 0.01,
        lng: baseLng + 0.025,
      },
      pricePerUnit: 6.90,
      availableEnergy: 100,
      rating: 4.4,
      greenEnergy: true,
    },
  ];

  return mockSellers;
};

