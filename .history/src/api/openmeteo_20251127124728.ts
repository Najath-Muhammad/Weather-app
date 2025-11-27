import type { WeatherData } from '../types/weather.types';

export const getWeather = async (lat: number, lon: number): Promise<WeatherData> => {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  const params = {
    latitude: lat.toString(),
    longitude: lon.toString(),
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code',
    daily: 'temperature_2m_max,temperature_2m_min,weather_code',
    timezone: 'auto',
  };

  Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));

  const response = await a(url);
  if (!response.ok) throw new Error('Failed to fetch weather');
  return response.json();
};