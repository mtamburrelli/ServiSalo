from functools import wraps

from flask import jsonify, redirect, request, session, url_for
from sqlalchemy.exc import IntegrityError

from auth_utils import hash_password, verify_password
from models import Address, User, db


def get_current_user():
    user_id = session.get("user_id")
    if not user_id:
        return None
    return db.session.get(User, user_id)


def login_required_page(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not get_current_user():
            return redirect(url_for("login_page"))
        return view(*args, **kwargs)

    return wrapped


def login_required_api(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not get_current_user():
            return jsonify({"error": "No autenticado"}), 401
        return view(*args, **kwargs)

    return wrapped


def register_auth_routes(app):
    @app.route("/api/auth/register", methods=["POST"])
    def api_register():
        data = request.get_json(silent=True) or {}

        name = (data.get("name") or "").strip()
        email = (data.get("email") or "").strip().lower()
        phone = (data.get("phone") or "").strip()
        account_type = (data.get("account_type") or "persona").strip()
        password = data.get("password") or ""
        password_confirm = data.get("password_confirm") or ""

        address_line  = (data.get("address_line") or "").strip()
        corregimiento = (data.get("corregimiento") or "").strip()

        # Coordenadas opcionales del mapa (None si el usuario no movió el pin)
        raw_lat = data.get("latitude")
        raw_lng = data.get("longitude")
        try:
            latitude  = float(raw_lat) if raw_lat is not None else None
            longitude = float(raw_lng) if raw_lng is not None else None
        except (TypeError, ValueError):
            latitude = longitude = None

        errors = []
        if not name:
            errors.append("El nombre es obligatorio.")
        if not email or "@" not in email:
            errors.append("Ingresa un correo válido.")
        if not phone:
            errors.append("El celular es obligatorio.")
        if account_type not in ("persona", "empresa"):
            errors.append("Tipo de cuenta inválido.")
        if len(password) < 6:
            errors.append("La contraseña debe tener al menos 6 caracteres.")
        if password != password_confirm:
            errors.append("Las contraseñas no coinciden.")
        if not address_line:
            errors.append("La dirección de despacho es obligatoria.")
        if not corregimiento:
            errors.append("El corregimiento es obligatorio.")

        if errors:
            return jsonify({"error": errors[0], "errors": errors}), 400

        if User.query.filter_by(email=email).first():
            return jsonify({"error": "Ya existe una cuenta con ese correo."}), 409

        user = User(
            name=name,
            email=email,
            phone=phone,
            account_type=account_type,
            password_hash=hash_password(password),
            role="customer",
            is_active=True,
        )
        address = Address(
            user=user,
            address_line=address_line,
            corregimiento=corregimiento,
            latitude=latitude,
            longitude=longitude,
            is_active=True,
        )

        try:
            db.session.add(user)
            db.session.add(address)
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            return jsonify({"error": "Ya existe una cuenta con ese correo."}), 409

        session.clear()
        session["user_id"] = user.id
        session.permanent = True

        return jsonify(
            {
                "ok": True,
                "user": {
                    "id": user.id,
                    "name": user.name,
                    "email": user.email,
                },
            }
        ), 201

    @app.route("/api/auth/login", methods=["POST"])
    def api_login():
        data = request.get_json(silent=True) or {}
        email = (data.get("email") or "").strip().lower()
        password = data.get("password") or ""

        if not email or not password:
            return jsonify({"error": "Correo y contraseña son obligatorios."}), 400

        user = User.query.filter_by(email=email, is_active=True).first()
        if not user or not verify_password(user.password_hash, password):
            return jsonify({"error": "Correo o contraseña incorrectos."}), 401

        session.clear()
        session["user_id"] = user.id
        session.permanent = True

        return jsonify(
            {
                "ok": True,
                "user": {
                    "id": user.id,
                    "name": user.name,
                    "email": user.email,
                },
            }
        )

    @app.route("/api/auth/logout", methods=["POST"])
    def api_logout():
        session.clear()
        return jsonify({"ok": True})

    @app.route("/api/auth/me")
    def api_me():
        user = get_current_user()
        if not user:
            return jsonify({"authenticated": False}), 401
        return jsonify(
            {
                "authenticated": True,
                "user": {
                    "id": user.id,
                    "name": user.name,
                    "email": user.email,
                    "role": user.role,
                },
            }
        )
