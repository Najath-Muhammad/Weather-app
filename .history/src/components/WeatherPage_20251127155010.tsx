import React, { useState, useEffect, useRef } from 'react';
import { searchLocations, reverseGeocode } from '../api';
import { getWeather } from '../api/openmeteo';
import type { LocationSuggestion, WeatherData } from '../types/weather.types';

const getWeatherEmoji = (code: number): string => {
  const map: Record<number, string> = {
    0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
    45: '🌫️', 48: '🌫️',
    51: '🌦️', 53: '🌦️', 55: '🌦️',
    61: '🌧️', 63: '🌧️', 65: '🌧️',
    71: '❄️', 73: '❄️', 75: '❄️',
    95: '⛈️', 96: '⛈️', 99: '⛈️',
  };
  return map[code] || '🌤️';
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[date.getDay()];
};

export default function WeatherPage() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [selectedCity, setSelectedCity] = useState('');
  const [error, setError] = useState('');
  const [geoLoading, setGeoLoading] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Search locations with debounce
  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      setError('');
      try {
        const results = await searchLocations(query);
        setSuggestions(results);
        setShowDropdown(true);
      } catch (err) {
        setError('Location search failed');
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, [query]);

  const fetchWeatherData = async (lat: string, lon: string, cityName: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await getWeather(parseFloat(lat), parseFloat(lon));
      setWeather(data);
      setSelectedCity(cityName);
      setShowDropdown(false);
    } catch (err) {
      setError('Failed to load weather data');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (loc: LocationSuggestion) => {
    const city = loc.display_name.split(',')[0];
    setQuery(city);
    fetchWeatherData(loc.lat, loc.lon, loc.display_name);
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }

    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const data = await reverseGeocode(latitude, longitude);
          const name = data.address?.city || data.address?.town || data.address?.village || 'Your Location';
          setQuery(name);
          fetchWeatherData(latitude.toString(), longitude.toString(), data.display_name);
        } catch (err) {
          setError('Could not detect city name');
        } finally {
          setGeoLoading(false);
        }
      },
      () => {
        setError('Location access denied');
        setGeoLoading(false);
      }
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">Weather Forecast</h1>
          <p className="text-blue-100 text-lg">Search any city worldwide</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 mb-6">
          <div className="relative" ref={dropdownRef}>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
                  placeholder="Search for a city..."
                  className="w-full px-5 py-4 text-lg border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 transition-all"
                />
                {searching && (
                  <div className="absolute right-4 top-5">
                    <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>

              <button
                onClick={handleUseMyLocation}
                disabled={geoLoading}
                className="px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-70 flex items-center gap-2"
              >
                {geoLoading ? 'Detecting...' : '📍 Use My Location'}
              </button>
            </div>

            {/* Enhanced Suggestion Dropdown */}
            {showDropdown && suggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-top-2">
                {suggestions.map((loc) => (
                  <button
                    key={loc.place_id}
                    onClick={() => handleSelect(loc)}
                    className="w-full px-6 py-4 text-left hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-0 flex flex-col"
                  >
                    <span className="font-semibold text-gray-900">
                      {loc.display_name.split(',')[0]}
                    </span>
                    <span className="text-sm text-gray-500 mt-1">
                      {loc.display_name.split(',').slice(1).join(',')}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Loading & Weather Display */}
        {loading && (
          <div className="flex justify-center py-20">
            <div className="w-20 h-20 border-8 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {weather && !loading && (
          <>
            <div className="bg-white rounded-2xl shadow-2xl p-8 mb-6">
              <h2 className="text-3xl font-bold text-gray-800 mb-6">{selectedCity}</h2>
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="text-center">
                  <div className="text-9xl">{getWeatherEmoji(weather.current.weather_code)}</div>
                  <div className="text-7xl font-bold text-gray-800 mt-4">
                    {Math.round(weather.current.temperature_2m)}°C
                  </div>
                  <p className="text-xl text-gray-600 mt-2">
                    Feels like {Math.round(weather.current.apparent_temperature)}°C
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-6 text-center">
                  <div className="bg-blue-50 rounded-2xl p-6">
                    <p className="text-gray-600">Humidity</p>
                    <p className="text-3xl font-bold text-blue-700">
                      {weather.current.relative_humidity_2m}%
                    </p>
                  </div>
                  <div className="bg-blue-50 rounded-2xl p-6">
                    <p className="text-gray-600">Wind</p>
                    <p className="text-3xl font-bold text-blue-700">
                      {Math.round(weather.current.wind_speed_10m)} km/h
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-2xl p-8">
              <h3 className="text-2xl font-bold text-gray-800 mb-6">7-Day Forecast</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
                {weather.daily.time.map((date, i) => (
                  <div
                    key={date}
                    className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-5 text-center hover:shadow-xl transition-all"
                  >
                    <p className="font-bold text-gray-800">
                      {i === 0 ? 'Today' : formatDate(date)}
                    </p>
                    <div className="text-5xl my-3">{getWeatherEmoji(weather.daily.weather_code[i])}</div>
                    <p className="text-2xl font-bold text-gray-800">
                      {Math.round(weather.daily.temperature_2m_max[i])}°
                    </p>
                    <p className="text-gray-600">
                      {Math.round(weather.daily.temperature_2m_min[i])}°
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {!weather && !loading && !error && query === '' && (
          <div className="text-center py-20 text-white">
            <div className="text-8xl mb-6">🌍</div>
            <p className="text-2xl">Start by searching for a city</p>
          </div>
        )}
      </div>
    </div>
  );
}