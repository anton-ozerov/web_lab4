import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.weather import router as weather_router


app = FastAPI(
	title="Weather API"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# routers
app.include_router(
	weather_router,
	prefix="/weather",
)


if __name__ == "__main__":
	uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
