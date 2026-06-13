import os

from dotenv import load_dotenv

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

# Carga .env si existe (desarrollo local)
load_dotenv(os.path.join(BASE_DIR, ".env"))


class Config:
    SQLALCHEMY_DATABASE_URI = "sqlite:///" + os.path.join(BASE_DIR, "database.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    SECRET_KEY = os.environ.get("SECRET_KEY")
    if not SECRET_KEY:
        raise RuntimeError(
            "SECRET_KEY no está definida. "
            "Crea el archivo .env con: SECRET_KEY=<clave aleatoria>"
        )

    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"

    RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
    OWNER_EMAIL    = os.environ.get("OWNER_EMAIL", "")
    APP_BASE_URL   = os.environ.get("APP_BASE_URL", "http://localhost:5000")


class DevConfig(Config):
    DEBUG = True


class ProdConfig(Config):
    DEBUG = False