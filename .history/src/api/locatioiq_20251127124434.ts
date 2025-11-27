import type { LocationSuggestion } from '../types/weather.types';
impo

const API_KEY = import.meta.env.VITE_LOCATIONIQ_KEY;

if (!API_KEY) {
  console.error('LocationIQ API key is missing! Add VITE_LOCATIONIQ_KEY to .env');
}

export const searchLocations = async (query: string): Promise<LocationSuggestion[]> => {
  const response = await fetch(
    `https://us1.locationiq.com/v1/autocomplete?key=${API_KEY}&q=${encodeURIComponent(query)}&limit=6&format=json`
  );

  if (!response.ok) throw new Error('Failed to search locations');
  return response.json();
};

export const reverseGeocode = async (lat: number, lon: number): Promise<any> => {
  const response = await fetch(
    `https://us1.locationiq.com/v1/reverse?key=${API_KEY}&lat=${lat}&lon=${lon}&format=json`
  );

  if (!response.ok) throw new Error('Reverse geocoding failed');
  return response.json();
};