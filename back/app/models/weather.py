from pydantic import BaseModel


class ForecastItem(BaseModel):
    date: str  # ISO date string, ex: "2025-12-15"
    avg_temp: float
    avg_hum: float
    avg_feels: float
    avg_wind: float
    weather_code: int
    icon_url: str


class WeatherResponse(BaseModel):
    timezone_difference: int
    forecasts: list[ForecastItem]
