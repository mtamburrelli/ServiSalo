from datetime import datetime, timezone
from functools import wraps

from flask import abort, jsonify, redirect, render_template, request, session, url_for
from sqlalchemy.exc import IntegrityError

from auth_utils import (
    RESET_TOKEN_HOURS,
    VERIFY_TOKEN_HOURS,
    generate_url_token,
    hash_password,
    hash_token,
    token_is_expired,
    verify_password,
)
from emails import send_email_verification, send_password_reset
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


def admin_required_page(view):
    """Protege páginas del panel admin: exige sesión + role == admin."""
    @wraps(view)
    def wrapped(*args, **kwargs):
        user = get_current_user()
        if not user:
            return redirect(url_for("login_page"))
        if not user.is_admin:
            abort(403)
        return view(*args, **kwargs)

    return wrapped


def admin_required_api(view):
    """Protege endpoints /api/admin/*: exige sesión + role == admin."""
    @wraps(view)
    def wrapped(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({"error": "No autenticado"}), 401
        if not user.is_admin:
            return jsonify({"error": "No autorizado"}), 403
        return view(*args, **kwargs)

    return wrapped


def _issue_email_verification(user: User) -> bool:
    raw, digest = generate_url_token()
    user.email_verify_token = digest
    user.email_verify_sent_at = datetime.now(timezone.utc)
    db.session.commit()
    return send_email_verification(user, raw)


def _issue_password_reset(user: User) -> bool:
    raw, digest = generate_url_token()
    user.password_reset_token = digest
    user.password_reset_sent_at = datetime.now(timezone.utc)
    db.session.commit()
    return send_password_reset(user, raw)


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
        raw_ruc = data.get("ruc")
        raw_ruc_dv = data.get("ruc_dv")
        try:
            ruc = int(raw_ruc) if raw_ruc is not None else None
        except (TypeError, ValueError):
            ruc = None
        try:
            ruc_dv = int(raw_ruc_dv) if raw_ruc_dv is not None else None
            if ruc_dv is not None and not (0 <= ruc_dv <= 99):
                ruc_dv = None
        except (TypeError, ValueError):
            ruc_dv = None

        address_line = (data.get("address_line") or "").strip()
        corregimiento = (data.get("corregimiento") or "").strip()

        raw_lat = data.get("latitude")
        raw_lng = data.get("longitude")
        try:
            latitude = float(raw_lat) if raw_lat is not None else None
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
            ruc=ruc if account_type == "empresa" else None,
            ruc_dv=ruc_dv if account_type == "empresa" else None,
            password_hash=hash_password(password),
            role="customer",
            is_active=True,
            email_verified=False,
            created_at=datetime.now(timezone.utc),
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

        # No iniciar sesión hasta verificar el correo
        session.clear()
        emailed = _issue_email_verification(user)

        return jsonify(
            {
                "ok": True,
                "needs_verification": True,
                "email_sent": emailed,
                "email": user.email,
                "message": (
                    "Te enviamos un correo para verificar tu cuenta. "
                    "Revisa tu bandeja (y spam) antes de iniciar sesión."
                ),
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

        if not user.email_verified and not user.is_admin:
            return jsonify({
                "error": (
                    "Debes verificar tu correo antes de ingresar. "
                    "Revisa tu bandeja o solicita un nuevo enlace."
                ),
                "code": "email_not_verified",
                "email": user.email,
            }), 403

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

    @app.route("/verify-email")
    def verify_email_page():
        raw = (request.args.get("token") or "").strip()
        if not raw:
            return render_template(
                "auth_message.html",
                title="Enlace inválido",
                message="Falta el token de verificación.",
                ok=False,
            )

        digest = hash_token(raw)
        user = User.query.filter_by(email_verify_token=digest).first()
        if not user or token_is_expired(user.email_verify_sent_at, VERIFY_TOKEN_HOURS):
            return render_template(
                "auth_message.html",
                title="Enlace inválido o vencido",
                message=(
                    "Este enlace ya no es válido. Inicia el registro de nuevo "
                    "o solicita otro correo de verificación desde el login."
                ),
                ok=False,
                show_resend=True,
            )

        user.email_verified = True
        user.email_verify_token = None
        user.email_verify_sent_at = None
        db.session.commit()

        return render_template(
            "auth_message.html",
            title="Correo verificado",
            message="Tu cuenta ya está activa. Ya puedes iniciar sesión.",
            ok=True,
            cta_href=url_for("login_page"),
            cta_label="Ir a iniciar sesión",
        )

    @app.route("/api/auth/resend-verification", methods=["POST"])
    def api_resend_verification():
        data = request.get_json(silent=True) or {}
        email = (data.get("email") or "").strip().lower()
        # Respuesta genérica para no filtrar si el correo existe
        generic = {
            "ok": True,
            "message": "Si la cuenta existe y no está verificada, enviamos un nuevo correo.",
        }
        if not email or "@" not in email:
            return jsonify(generic)

        user = User.query.filter_by(email=email, is_active=True).first()
        if user and not user.email_verified and not user.is_admin:
            _issue_email_verification(user)
        return jsonify(generic)

    @app.route("/api/auth/forgot-password", methods=["POST"])
    def api_forgot_password():
        data = request.get_json(silent=True) or {}
        email = (data.get("email") or "").strip().lower()
        generic = {
            "ok": True,
            "message": (
                "Si existe una cuenta con ese correo, te enviamos un enlace "
                "para restablecer la contraseña."
            ),
        }
        if not email or "@" not in email:
            return jsonify(generic)

        user = User.query.filter_by(email=email, is_active=True).first()
        if user:
            _issue_password_reset(user)
        return jsonify(generic)

    @app.route("/api/auth/reset-password", methods=["POST"])
    def api_reset_password():
        data = request.get_json(silent=True) or {}
        raw = (data.get("token") or "").strip()
        password = data.get("password") or ""
        password_confirm = data.get("password_confirm") or ""

        if not raw:
            return jsonify({"error": "Token inválido."}), 400
        if len(password) < 6:
            return jsonify({"error": "La contraseña debe tener al menos 6 caracteres."}), 400
        if password != password_confirm:
            return jsonify({"error": "Las contraseñas no coinciden."}), 400

        digest = hash_token(raw)
        user = User.query.filter_by(password_reset_token=digest).first()
        if not user or token_is_expired(user.password_reset_sent_at, RESET_TOKEN_HOURS):
            return jsonify({
                "error": "Este enlace ya no es válido. Solicita uno nuevo.",
            }), 400

        user.password_hash = hash_password(password)
        user.password_reset_token = None
        user.password_reset_sent_at = None
        # Si aún no había verificado el correo, al resetear desde su inbox lo damos por bueno
        if not user.email_verified:
            user.email_verified = True
            user.email_verify_token = None
            user.email_verify_sent_at = None
        db.session.commit()
        session.clear()

        return jsonify({
            "ok": True,
            "message": "Contraseña actualizada. Ya puedes iniciar sesión.",
        })
