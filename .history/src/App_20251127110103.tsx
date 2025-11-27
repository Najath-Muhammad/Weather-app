import { useState, useEffect, useRef } from "react";

const LOCATIONIQ_KEY = "pk.your_key_here_replace_it"; // Get free at https://locationiq.com

interface Location {
  lat: string;
  lon: string;
  display_name: string;
  address: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
  };
}

interface WeatherData {
  current: {
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    weather_code: number;
    wind_speed_10m: number;
  };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    weather_code: number[];
    precipitation_probability_max: number[];
  };
}

export default function WeatherAppWithSuggestions() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce timer
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Fetch suggestions as user types (debounced 300ms)
  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://api.locationiq.com/v1/autocomplete?key=pk.1cc19c1133e12ddf24f6250673b115cb&q=${encodeURIComponent(
            query
          )}&limit=6&dedupe=1&format=json`
        );
        const data = await res.json();
        setSuggestions(data);
        setShowSuggestions(true);
      } catch (err) {
        console.error("Autocomplete failed", err);
      }
    }, 300);
  }, [query]);

  // Fetch weather when a suggestion is selected
  const fetchWeather = async (loc: Location) => {
    setLoading(true);
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max&temperature_unit=celsius&wind_speed_unit=kmh&timezone=auto`
      );
      const data = await res.json();
      setWeather(data);
      setSelectedLocation(loc);
      setShowSuggestions(false);
      setQuery(formatDisplayName(loc)); // Optional: show nice name in input
    } catch (err) {
      alert("Failed to load weather");
    }
    setLoading(false);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Helper: make nice display name
  const formatDisplayName = (loc: Location) => {
    const parts = [];
    const a = loc.address;
    if (a.city) parts.push(a.city);
    else if (a.town) parts.push(a.town);
    else if (a.village) parts.push(a.village);
    if (a.state) parts.push(a.state);
    if (a.country) parts.push(a.country);
    return parts.join(", ");
  };

  const getWeatherIcon = (code: number) => {
    const map: Record<number, string> = {
      0: "☀️", 1: "🌤️", 2: "⛅", 3: "☁️",
      45: "🌫", 48: "🌫",
      51: "🌦", 53: "🌦", 55: "🌧",
      61: "🌧", 63: "🌧", 65: "🌧",
      71: "❄️", 73: "❄️", 75: "❄️",
      95: "⛈", 96: "⛈", 99: "⛈"
    };
    return map[code] || "🌤️";
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "system-ui", maxWidth: "800px", margin: "0 auto" }}>
      <h1>Weather App with Autocomplete</h1>

      {/* Search Input with Dropdown */}
      <div style={{ position: "relative" }}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          placeholder="Search for a city or place..."
          style={{
            width: "100%",
            padding: "12px 16px",
            fontSize: "1.1rem",
            borderRadius: "12px",
            border: "2px solid #ddd",
            outline: "none",
          }}
        />

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <ul
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              background: "white",
              border: "1px solid #ddd",
              borderRadius: "0 0 12px 12px",
              margin: 0,
              padding: 0,
              listStyle: "none",
              maxHeight: "300px",
              overflowY: "auto",
              boxShadow: "0 10px 20px rgba(0,0,0,0.1)",
              zIndex: 10,
            }}
          >
            {suggestions.map((loc, i) => (
              <li
                key={i}
                onClick={() => fetchWeather(loc)}
                style={{
                  padding: "12px 16px",
                  cursor: "pointer",
                  borderBottom: i !== suggestions.length - 1 ? "1px solid #eee" : "none",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f0f8ff")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "white")}
              >
                <strong>{formatDisplayName(loc)}</strong>
                <br />
                <small style={{ color: "#666" }}>{loc.display_name.split(", ").slice(1).join(", ")}</small>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Loading */}
      {loading && <p style={{ marginTop: "1rem" }}>Loading weather...</p>}

      {/* Weather Result */}
      {weather && selectedLocation && (
        <div style={{ marginTop: "2rem", padding: "1.5rem", background: "#f9f9f9", borderRadius: "16px" }}>
          <h2 style={{ margin: "0 0 1rem 0" }}>
            {getWeatherIcon(weather.current.weather_code)} {formatDisplayName(selectedLocation)}
          </h2>
          <div style={{ fontSize: "3rem", fontWeight: "bold" }}>
            {Math.round(weather.current.temperature_2m)}°C
          </div>
          <p>Feels like {Math.round(weather.current.apparent_temperature)}°C • {weather.current.relative_humidity_2m}% humidity</p>

          <h3 style={{ marginTop: "2rem" }}>7-Day Forecast</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: "1rem" }}>
            {weather.daily.time.slice(0, 7).map((day, i) => (
              <div key={day} style={{ textAlign: "center", background: "white", padding: "1rem", borderRadius: "12px" }}>
                <p><strong>{new Date(day).toLocaleDateString("en", { weekday: "short" })}</strong></p>
                <div style={{ fontSize: "2rem" }}>{getWeatherIcon(weather.daily.weather_code[i])}</div>
                <p>{Math.round(weather.daily.temperature_2m_max[i])}°</p>
                <p style={{ color: "#666" }}>{Math.round(weather.daily.temperature_2m_min[i])}°</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}