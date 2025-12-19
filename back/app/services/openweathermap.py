from typing import Any
import httpx

from app.core.config import TOKEN_OpenWeatherMap


class OpenWeatherMapService:
    def __init__(self) -> None:
        self.api_key = TOKEN_OpenWeatherMap
        if not self.api_key:
            raise RuntimeError("TOKEN_OpenWeatherMap is not set")
        self.client = httpx.AsyncClient(timeout=10.0)

    async def get_5day_forecast(self, latitude: float, longitude: float) -> dict[str, Any]:
        url = "https://api.openweathermap.org/data/2.5/forecast"
        params = {
            "lat": latitude,
            "lon": longitude,
            "units": "metric",
            "APPID": self.api_key,
            "lang": "ru",
        }
        resp = await self.client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()
        timezone_offset = data.get("city", {}).get("timezone", 0)
        return {
            "timezone_offset": timezone_offset,
            "list": data.get("list", []),  # 3-hour forecast points (typically 40 items)
        }
