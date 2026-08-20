import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple

from werkzeug.security import check_password_hash, generate_password_hash

# Ventanas de validez de los links enviados por correo
VERIFY_TOKEN_HOURS = 48
RESET_TOKEN_HOURS = 1


def hash_password(plain_password: str) -> str:
    return generate_password_hash(plain_password)


def verify_password(password_hash: Optional[str], plain_password: str) -> bool:
    if not password_hash:
        return False
    return check_password_hash(password_hash, plain_password)


def generate_url_token() -> Tuple[str, str]:
    """Devuelve (token_crudo_para_email, hash_sha256_para_guardar_en_bd)."""
    raw = secrets.token_urlsafe(32)
    digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()
    return raw, digest


def hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def token_is_expired(sent_at: Optional[datetime], hours: int) -> bool:
    if not sent_at:
        return True
    if sent_at.tzinfo is None:
        sent_at = sent_at.replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc) > sent_at + timedelta(hours=hours)
