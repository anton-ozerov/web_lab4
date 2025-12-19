import os

from dotenv import load_dotenv


load_dotenv()


TOKEN_OpenWeatherMap = str(os.getenv("TOKEN_OpenWeatherMap"))
