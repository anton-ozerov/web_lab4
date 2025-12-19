from datetime import datetime
from collections import defaultdict, Counter
from fastapi import APIRouter, Query

from app.services.openweathermap import OpenWeatherMapService
from app.models.weather import WeatherResponse, ForecastItem

router = APIRouter(
    tags=["Погода"],
)

weather_service = OpenWeatherMapService()


@router.get("", response_model=WeatherResponse)
async def get_weather(
    latitude: float = Query(..., description="Широта"),
    longitude: float = Query(..., description="Долгота"),
):
    response = await weather_service.get_5day_forecast(latitude, longitude)
    timezone_diff = int(response["timezone_offset"])

    groups = defaultdict(list)
    for point in response["list"]:
        ts = int(point.get("dt", 0)) + timezone_diff
        date_iso = datetime.utcfromtimestamp(ts).date().isoformat()
        groups[date_iso].append(point)

    sorted_dates = sorted(groups.keys())[:5]

    forecasts: list[ForecastItem] = []
    for date in sorted_dates:
        points = groups[date]
        if not points:
            continue

        temp_sum = 0.0
        hum_sum = 0.0
        feels_sum = 0.0
        wind_sum = 0.0
        count = 0
        codes = []
        icons = []

        for p in points:
            main = p.get("main", {})
            temp_sum += float(main.get("temp", 0.0))
            hum_sum += float(main.get("humidity", 0.0))
            feels_sum += float(main.get("feels_like", main.get("temp", 0.0)))
            wind_sum += float(p.get("wind", {}).get("speed", p.get("wind_speed", 0.0)))
            count += 1
            weather_info = p.get("weather", [{}])[0]
            codes.append(int(weather_info.get("id", 0)))
            icon = weather_info.get("icon")
            if icon:
                icons.append(icon)

        avg_temp = temp_sum / count if count else 0.0
        avg_hum = hum_sum / count if count else 0.0
        avg_feels = feels_sum / count if count else avg_temp
        avg_wind = wind_sum / count if count else 0.0

        most_common_code = int(Counter(codes).most_common(1)[0][0]) if codes else 0
        most_common_icon = Counter(icons).most_common(1)[0][0] if icons else None
        icon_url = f"https://openweathermap.org/img/wn/{most_common_icon}@2x.png" if most_common_icon else ""

        forecasts.append(
            ForecastItem(
                date=date,
                avg_temp=avg_temp,
                avg_hum=avg_hum,
                avg_feels=avg_feels,
                avg_wind=avg_wind,
                weather_code=most_common_code,
                icon_url=icon_url,
            )
        )

    return WeatherResponse(timezone_difference=timezone_diff, forecasts=forecasts)
