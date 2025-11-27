// Shared types
export interface LocationSuggestion {
    place_id: string;
    display_name: string;
    lat: string;
    lon: string;
  }
  
  export interface WeatherData {
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