// .env file required:
// VITE_LOCATIONIQ_KEY=your_locationiq_api_key_here

import React, { useState, useEffect, useRef } from 'react';

interface Location {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
}

interface WeatherData {
  current: {
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    weather_code: number;
  };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    weather_code: number[];
  };
}

const getWeatherEmoji = (code: number): string => {
  const weatherMap: { [key: number]: string } = {
    0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
    45: '🌫️', 48: '🌫️',
    51: '🌦️', 53: '🌦️', 55: '🌦️',
    56: '🌧️', 57: '🌧️',
    61: '🌧️', 63: '🌧️', 65: '🌧️',
    66: '🌨️', 67: '🌨️',
    71: '🌨️', 73: '🌨️', 75: '🌨️', 77: '🌨️',
    80: '🌦️', 81: '🌦️', 82: '🌦️',
    85: '🌨️', 86: '🌨️',
    95: '⛈️', 96: '⛈️', 99: '⛈️'
  };
  return weatherMap[code] || '🌤️';
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[date.getDay()];
};

function App() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Location[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchingLocation, setSearchingLocation] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [selectedCity, setSelectedCity] = useState('');
  const [error, setError] = useState('');
  const [geoLoading, setGeoLoading] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(async () => {
      setSearchingLocation(true);
      setError('');
      try {
        const apiKey = import.meta.env.VITE_LOCATIONIQ_KEY;
        if (!apiKey) {
          throw new Error('LocationIQ API key not found');
        }
        const response = await fetch(
          `https://us1.locationiq.com/v1/autocomplete?key=${apiKey}&q=${encodeURIComponent(query)}&limit=6&format=json`
        );
        if (!response.ok) throw new Error('Failed to fetch locations');
        const data = await response.json();
        setSuggestions(data);
        setShowDropdown(true);
      } catch (err) {
        setError('Failed to search locations. Please try again.');
        setSuggestions([]);
      } finally {
        setSearchingLocation(false);
      }
    }, 300);
  }, [query]);

  const fetchWeather = async (lat: string, lon: string, cityName: string) => {
    setLoading(true);
    setError('');
    setWeather(null);
    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto`
      );
      if (!response.ok) throw new Error('Failed to fetch weather data');
      const data = await response.json();
      setWeather(data);
      setSelectedCity(cityName);
      setShowDropdown(false);
    } catch (err) {
      setError('Failed to fetch weather data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSelect = (location: Location) => {
    const cityName = location.display_name.split(',')[0];
    setQuery(cityName);
    fetchWeather(location.lat, location.lon, location.display_name);
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setGeoLoading(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const apiKey = import.meta.env.VITE_LOCATIONIQ_KEY;
          if (!apiKey) {
            throw new Error('LocationIQ API key not found');
          }
          const response = await fetch(
            `https://us1.locationiq.com/v1/reverse?key=${apiKey}&lat=${latitude}&lon=${longitude}&format=json`
          );
          if (!response.ok) throw new Error('Failed to reverse geocode');
          const data = await response.json();
          const cityName = data.address.city || data.address.town || data.address.village || data.display_name.split(',')[0];
          setQuery(cityName);
          await fetchWeather(latitude.toString(), longitude.toString(), data.display_name);
        } catch (err) {
          setError('Failed to get location name. Please try searching manually.');
        } finally {
          setGeoLoading(false);
        }
      },
      (err) => {
        setGeoLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setError('Location access denied. Please enable location permissions.');
        } else {
          setError('Failed to get your location. Please try searching manually.');
        }
      }
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">Weather Forecast</h1>
          <p className="text-blue-100 text-lg">Search for any city to get the weather</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 mb-6">
          <div className="relative" ref={dropdownRef}>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search for a city..."
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                />
                {searchingLocation && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <button
                onClick={handleUseMyLocation}
                disabled={geoLoading}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap"
              >
                {geoLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Loading...</span>
                  </>
                ) : (
                  <>
                    <span>📍</span>
                    <span>Use My Location</span>
                  </>
                )}
              </button>
            </div>

            {showDropdown && suggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                {suggestions.map((location) => (
                  <button
                    key={location.place_id}
                    onClick={() => handleLocationSelect(location)}
                    className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
                  >
                    <div className="font-medium text-gray-900">{location.display_name.split(',')[0]}</div>
                    <div className="text-sm text-gray-500 truncate">{location.display_name}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
        </div>

        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {weather && !loading && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">{selectedCity}</h2>
              
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                <div className="text-center md:text-left">
                  <div className="text-7xl mb-2">{getWeatherEmoji(weather.current.weather_code)}</div>
                  <div className="text-6xl font-bold text-gray-800">{Math.round(weather.current.temperature_2m)}°C</div>
                  <div className="text-xl text-gray-600 mt-2">
                    Feels like {Math.round(weather.current.apparent_temperature)}°C
                  </div>
                </div>

                <div className="flex-1 grid grid-cols-2 gap-4 w-full">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">Humidity</div>
                    <div className="text-2xl font-semibold text-gray-800">
                      {weather.current.relative_humidity_2m}%
                    </div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">Wind Speed</div>
                    <div className="text-2xl font-semibold text-gray-800">
                      {Math.round(weather.current.wind_speed_10m)} km/h
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8">
              <h3 className="text-2xl font-bold text-gray-800 mb-6">7-Day Forecast</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
                {weather.daily.time.map((date, index) => (
                  <div
                    key={date}
                    className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 text-center hover:shadow-lg transition-shadow"
                  >
                    <div className="font-semibold text-gray-800 mb-2">
                      {index === 0 ? 'Today' : formatDate(date)}
                    </div>
                    <div className="text-4xl mb-2">{getWeatherEmoji(weather.daily.weather_code[index])}</div>
                    <div className="text-lg font-bold text-gray-800">
                      {Math.round(weather.daily.temperature_2m_max[index])}°
                    </div>
                    <div className="text-sm text-gray-600">
                      {Math.round(weather.daily.temperature_2m_min[index])}°
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {!weather && !loading && !error && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🌍</div>
            <p className="text-white text-xl">Search for a city to see the weather forecast</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;