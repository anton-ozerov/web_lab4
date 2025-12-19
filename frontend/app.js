class WeatherApp {
    constructor() {
        this.API_BASE_URL = "https://web-lab-4-seerb.amvera.io/weather";
        this.current_location = null;
        this.locations = [];
        this.current_tab = null;
        this.is_loading = false;

        this.elements = {
            loading_state: document.getElementById("loadingState"),
            error_state: document.getElementById("errorState"),
            error_message: document.getElementById("errorMessage"),
            weather_container: document.getElementById("weatherContainer"),
            forecast_grid: document.getElementById("forecastGrid"),
            current_location_title: document.getElementById("currentLocationTitle"),
            locations_tabs: document.getElementById("locationsTabs"),
            refresh_btn: document.getElementById("refreshBtn"),
            retry_btn: document.getElementById("retryBtn"),
            add_city_button: document.getElementById("addCityButton"),
            add_city_modal: document.getElementById("addCityModal"),
            city_input: document.getElementById("cityInput"),
            city_suggestions: document.getElementById("citySuggestions"),
            city_error: document.getElementById("cityError"),
            add_city_btn: document.getElementById("addCityBtn"),
            cancel_btn: document.getElementById("cancelBtn"),
            close_modal_btn: document.getElementById("closeModalBtn"),
            geo_permission_info: document.getElementById("geoPermissionInfo"),
            allow_geo_btn: document.getElementById("allowGeoBtn"),
            deny_geo_btn: document.getElementById("denyGeoBtn"),
        };

        this.city_list = [];
        this.selected_city = null;

        this.init();
    }

    async init() {
        this.bind_events();
        await this.load_city_list();
        this.load_from_storage();

        if (this.locations.length === 0) {
            this.show_geo_permission();
        } else {
            this.show_weather_container();
            this.load_weather_for_all_locations();
        }
        this.render_location_tabs();
    }

    bind_events() {
        this.elements.refresh_btn.addEventListener("click", () =>
            this.refresh_weather()
        );
        this.elements.retry_btn.addEventListener("click", () =>
            this.retry_loading()
        );
        this.elements.add_city_button.addEventListener("click", () =>
            this.show_add_city_modal()
        );
        this.elements.add_city_btn.addEventListener("click", () =>
            this.get_add_city()
        );
        this.elements.cancel_btn.addEventListener("click", () =>
            this.hide_add_city_modal()
        );
        this.elements.close_modal_btn.addEventListener("click", () =>
            this.hide_add_city_modal()
        );
        this.elements.allow_geo_btn.addEventListener("click", () =>
            this.request_geo_location(true)
        );
        this.elements.deny_geo_btn.addEventListener("click", () =>
            this.request_geo_location(false)
        );

        this.elements.city_input.addEventListener("input", (e) =>
            this.get_city_input(e.target.value)
        );
        this.elements.city_input.addEventListener("keypress", (e) => {
            if (e.key === "Enter") this.get_add_city();
        });
    }

    show_geo_permission() {
        this.elements.geo_permission_info.classList.remove("hidden");
    }

    hide_geo_permission() {
        this.elements.geo_permission_info.classList.add("hidden");
    }

    async request_geo_location(allowed) {
        this.hide_geo_permission();

        if (allowed) {
            this.show_loading();
            try {
                const position = await this.get_current_position();
                const location = {
                    id: "current",
                    name: "Текущее местоположение",
                    type: "geolocation",
                    coords: {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                    },
                };

                this.current_location = location;
                this.locations = [location];
                this.current_tab = "current";
                this.save_to_storage();
                await this.load_weather_for_location(location);
                this.show_weather_container();
                this.render_location_tabs();
            } catch (error) {
                this.show_error("Не удалось получить ваше местоположение");
                this.show_add_city_modal();
            }
        } else {
            this.show_add_city_modal();
        }
    }

    get_current_position() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error("Geolocation не поддерживается"));
                return;
            }

            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            });
        });
    }

    async load_city_list() {
        try {
            const response = await fetch("frontend/cities.json");
            this.city_list = await response.json();
        } catch (error) {
            console.error("Ошибка загрузки списка городов:", error);
            this.city_list = [
                {
                    name: "Москва",
                    country: "Россия",
                    lat: 55.7558,
                    lon: 37.6173
                },
                {
                    name: "Санкт-Петербург",
                    country: "Россия",
                    lat: 59.9343,
                    lon: 30.3351,
                },
            ];
        }
    }

    get_city_input(value) {
        this.elements.city_error.textContent = "";
        this.selected_city = null;

        if (value.length < 2) {
            this.elements.city_suggestions.classList.remove("show");
            return;
        }

        const suggestions = this.city_list
            .filter((city) => city.name.toLowerCase().includes(value.toLowerCase()))
            .slice(0, 10);

        this.render_city_suggestions(suggestions);
    }

    render_city_suggestions(suggestions) {
        if (suggestions.length === 0) {
            this.elements.city_suggestions.classList.remove("show");
            return;
        }

        this.elements.city_suggestions.innerHTML = suggestions
            .map(
                (city) => `
                <div class="suggestion-item" data-lat="${city.lat}" data-lon="${city.lon}">
                    ${city.name}, ${city.country}
                </div>
            `
            )
            .join("");

        this.elements.city_suggestions.classList.add("show");

        this.elements.city_suggestions
            .querySelectorAll(".suggestion-item")
            .forEach((item) => {
                item.addEventListener("click", () => {
                    this.elements.city_input.value = item.textContent;
                    this.selected_city = {
                        name: item.textContent.split(",")[0].trim(),
                        coords: {
                            latitude: parseFloat(item.dataset.lat),
                            longitude: parseFloat(item.dataset.lon),
                        },
                    };
                    this.elements.city_suggestions.classList.remove("show");
                });
            });
    }

    show_add_city_modal() {
        this.elements.add_city_modal.classList.remove("hidden");
        this.elements.city_input.focus();
    }

    hide_add_city_modal() {
        this.elements.add_city_modal.classList.add("hidden");
        this.elements.city_input.value = "";
        this.elements.city_error.textContent = "";
        this.elements.city_suggestions.classList.remove("show");
        this.selected_city = null;
    }

    async get_add_city() {
        const input_value = this.elements.city_input.value.trim();

        if (!input_value) {
            this.elements.city_error.textContent = "Введите название города";
            return;
        }

        if (!this.selected_city) {
            const city = this.city_list.find(
                (c) =>
                    c.name.toLowerCase() === input_value.toLowerCase() ||
                    `${c.name}, ${c.country}`.toLowerCase() === input_value.toLowerCase()
            );

            if (!city) {
                this.elements.city_error.textContent = "Город не найден";
                return;
            }

            this.selected_city = {
                name: city.name,
                coords: {
                    latitude: city.lat,
                    longitude: city.lon,
                },
            };
        }

        if (
            this.locations.some(
                (loc) =>
                    loc.type === "city" &&
                    loc.name.toLowerCase() === this.selected_city.name.toLowerCase()
            )
        ) {
            this.elements.city_error.textContent = "Этот город уже добавлен";
            return;
        }

        const user_cities = this.locations.filter((loc) => loc.type === "city");
        if (user_cities.length >= 4) {
            this.elements.city_error.textContent = "Можно добавить не более 4 городов";
            return;
        }

        const new_location = {
            id: `city_${Date.now()}`,
            name: this.selected_city.name,
            type: "city",
            coords: this.selected_city.coords,
        };

        this.locations.push(new_location);
        this.save_to_storage();

        this.hide_add_city_modal();
        this.render_location_tabs();
        await this.load_weather_for_location(new_location);
        this.switch_tab(new_location.id);
    }

    async load_weather_for_location(location) {
        this.show_loading();

        try {
            const url = `${this.API_BASE_URL}?latitude=${location.coords.latitude}&longitude=${location.coords.longitude}`;
            const resp = await fetch(url);

            const resp_data = await resp.json();

            location.weatherData = resp_data;
            this.save_to_storage();

            if (this.current_tab === location.id) {
                this.render_weather(resp_data, location.name);
            }

            this.show_weather_container();
        } catch (error) {
            console.error("Ошибка загрузки погоды:", error);
            this.show_error("Не удалось загрузить прогноз погоды");
        }
    }

    async load_weather_for_all_locations() {
        this.show_loading();

        try {
            const promises = this.locations.map((location) =>
                this.load_weather_for_location(location)
            );

            await Promise.all(promises);

            if (this.current_tab) {
                const current_loc = this.locations.find(
                    (loc) => loc.id === this.current_tab
                );
                if (current_loc && current_loc.weatherData) {
                    this.render_weather(current_loc.weatherData, current_loc.name);
                }
            }

            this.show_weather_container();
        } catch (error) {
            console.error("Ошибка загрузки погоды:", error);
            this.show_error("Не удалось загрузить прогноз погоды");
        }
    }

    async refresh_weather() {
        await this.load_weather_for_all_locations();
    }

    render_location_tabs() {
        if (this.locations.length === 0) return;

        const tabs_html = this.locations
            .map(
                (location) => `
            <div class="location-tab ${this.current_tab === location.id ? "active" : ""
                    }" 
                 data-id="${location.id}">
                ${location.name}
                ${location.id !== "current"
                        ? `<button class="remove-btn" data-id="${location.id}">&times;</button>`
                        : ""
                    }
            </div>
        `
            )
            .join("");

        this.elements.locations_tabs.innerHTML = tabs_html;

        this.elements.locations_tabs
            .querySelectorAll(".location-tab")
            .forEach((tab) => {
                tab.addEventListener("click", (e) => {
                    if (e.target.classList.contains("remove-btn")) return;

                    const location_id = tab.dataset.id;
                    this.switch_tab(location_id);
                });
            });

        this.elements.locations_tabs
            .querySelectorAll(".remove-btn")
            .forEach((btn) => {
                btn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    const location_id = btn.dataset.id;
                    this.remove_location(location_id);
                });
            });
    }

    switch_tab(location_id) {
        this.current_tab = location_id;
        const location = this.locations.find((loc) => loc.id === location_id);

        if (location) {
            this.elements.current_location_title.textContent = location.name;

            if (location.weatherData) {
                this.render_weather(location.weatherData, location.name);
            } else {
                this.load_weather_for_location(location);
            }

            this.render_location_tabs();
        }
    }

    remove_location(location_id) {
        if (location_id === "current") return;

        this.locations = this.locations.filter((loc) => loc.id !== location_id);

        if (this.current_tab === location_id) {
            this.current_tab = this.locations[0]?.id || null;
            if (this.current_tab) {
                const new_location = this.locations.find(
                    (loc) => loc.id === this.current_tab
                );
                this.switch_tab(this.current_tab);
            }
        }

        this.save_to_storage();
        this.render_location_tabs();

        if (this.locations.length === 0) {
            this.show_add_city_modal();
        }
    }

    render_weather(weather_data, location_name) {
        const forecasts_to_show = weather_data.forecasts.slice(0, 4);

        const forecast_html = forecasts_to_show
            .map(
                (forecast) => `
            <div class="forecast-card">
                <div class="forecast-date">
                    ${this.format_date(forecast.date)}
                </div>
                <div class="weather-icon">
                    <img src="${forecast.icon_url}" alt="Погода">
                    <div class="weather-desc">
                        ${this.getWeatherDescription(forecast.weather_code)}
                    </div>
                </div>
                <div class="forecast-details">
                    <div class="detail-item">
                        <span class="label">Температура:</span>
                        <span class="value">${Math.round(
                    forecast.avg_temp
                )}°C</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Ощущается как:</span>
                        <span class="value">${Math.round(
                    forecast.avg_feels
                )}°C</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Влажность:</span>
                        <span class="value">${Math.round(
                    forecast.avg_hum
                )}%</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Ветер:</span>
                        <span class="value">${forecast.avg_wind.toFixed(
                    1
                )} м/с</span>
                    </div>
                </div>
            </div>
        `
            )
            .join("");

        this.elements.forecast_grid.innerHTML = forecast_html;
        this.elements.current_location_title.textContent = location_name;
    }

    format_date(date_string) {
        const date = new Date(date_string);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const options = {
            day: "numeric",
            month: "long",
        };
        const is_today = date.toDateString() === today.toDateString();
        const is_tomorrow = date.toDateString() === tomorrow.toDateString();

        if (is_today || is_tomorrow) {
            const label_day = is_today ? "Сегодня" : "Завтра";
            options.weekday = "short";
            return `${label_day} (${date.toLocaleDateString("ru-RU", options)})`;
        }

        options.weekday = "long";
        return date.toLocaleDateString("ru-RU", options);
    }

    getWeatherDescription(code) {
        const descriptions = {
            800: "Ясно",

            801: "Малооблачно",
            802: "Переменная облачность",
            803: "Облачно",
            804: "Пасмурно",

            701: "Туман",
            711: "Дым",
            721: "Дымка",
            731: "Пыль",
            741: "Туман",
            751: "Песок",
            761: "Пыль",
            762: "Пепел",
            771: "Шквал",
            781: "Торнадо",

            600: "Небольшой снег",
            601: "Снег",
            602: "Сильный снег",
            611: "Мокрый снег",
            612: "Небольшой мокрый снег",
            613: "Мокрый снег",
            615: "Дождь со снегом",
            616: "Дождь со снегом",
            620: "Небольшой снегопад",
            621: "Снегопад",
            622: "Сильный снегопад",

            500: "Небольшой дождь",
            501: "Дождь",
            502: "Сильный дождь",
            503: "Ливень",
            504: "Очень сильный дождь",
            511: "Ледяной дождь",
            520: "Небольшой ливень",
            521: "Ливень",
            522: "Сильный ливень",
            531: "Переменный дождь",

            300: "Небольшая морось",
            301: "Морось",
            302: "Сильная морось",
            310: "Небольшой моросящий дождь",
            311: "Моросящий дождь",
            312: "Сильный моросящий дождь",
            313: "Ливневая морось",
            314: "Сильная ливневая морось",
            321: "Морось",

            200: "Легкая гроза",
            201: "Гроза",
            202: "Сильная гроза",
            210: "Легкая гроза",
            211: "Гроза",
            212: "Сильная гроза",
            221: "Переменная гроза",
            230: "Легкая гроза с моросью",
            231: "Гроза с моросью",
            232: "Сильная гроза с моросью",
        };

        return descriptions[code] || "Облачно";
    }

    show_loading() {
        this.elements.loading_state.classList.remove("hidden");
        this.elements.error_state.classList.add("hidden");
        this.elements.weather_container.classList.add("hidden");
    }

    show_weather_container() {
        this.elements.loading_state.classList.add("hidden");
        this.elements.error_state.classList.add("hidden");
        this.elements.weather_container.classList.remove("hidden");
    }

    show_error(message) {
        this.elements.error_message.textContent = message;
        this.elements.loading_state.classList.add("hidden");
        this.elements.weather_container.classList.add("hidden");
        this.elements.error_state.classList.remove("hidden");
    }

    retry_loading() {
        if (this.locations.length > 0) {
            this.refresh_weather();
        } else {
            this.request_geo_location(true);
        }
    }

    save_to_storage() {
        localStorage.setItem(
            "weatherApp_locations",
            JSON.stringify(this.locations)
        );
        localStorage.setItem("weatherApp_currentTab", this.current_tab);
    }

    load_from_storage() {
        try {
            const savedLocations = localStorage.getItem("weatherApp_locations");
            const savedTab = localStorage.getItem("weatherApp_currentTab");

            if (savedLocations) {
                this.locations = JSON.parse(savedLocations);
                this.current_tab = savedTab || this.locations[0]?.id || null;
            }
        } catch (error) {
            console.error("Ошибка загрузки из localStorage:", error);
            this.locations = [];
            this.current_tab = null;
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    new WeatherApp();
});
