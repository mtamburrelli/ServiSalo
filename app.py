from datetime import datetime, timezone

from flask import Flask, jsonify, redirect, render_template, request, url_for

from auth_routes import (
    get_current_user,
    login_required_api,
    login_required_page,
    register_auth_routes,
)
from config import Config
from emails import send_new_order_to_owner
from models import Address, Order, OrderItem, Product, db
from seed import seed_catalog

app = Flask(__name__)
app.config.from_object("config.DevConfig")

db.init_app(app)
register_auth_routes(app)


# ——— Páginas ———

@app.route("/")
def home():
    if get_current_user():
        return redirect(url_for("catalog_page"))
    return render_template("index.html")


@app.route("/login")
def login_page():
    if get_current_user():
        return redirect(url_for("catalog_page"))
    return render_template("login.html")


@app.route("/register")
def register_page():
    if get_current_user():
        return redirect(url_for("catalog_page"))
    return render_template("register.html")


@app.route("/catalog")
@login_required_page
def catalog_page():
    return render_template("catalog.html")


# ——— API (requieren sesión activa) ———

@app.route("/api/products")
@login_required_api
def api_products():
    products = Product.query.filter_by(is_active=True).order_by(Product.name).all()
    return jsonify([p.to_dict() for p in products])


@app.route("/api/orders", methods=["POST"])
@login_required_api
def api_create_order():
    user = get_current_user()
    data = request.get_json(silent=True) or {}

    payment_method = (data.get("payment_method") or "").strip().lower()
    items_data = data.get("items") or []
    notes = (data.get("notes") or "").strip()

    # ── Validaciones básicas ──
    if payment_method not in ("ach", "yappy"):
        return jsonify({"error": "Método de pago inválido. Usa 'ach' o 'yappy'."}), 400

    if not items_data:
        return jsonify({"error": "El carrito está vacío."}), 400

    # Dirección activa del usuario (la primera; en el futuro el cliente elegirá)
    address = Address.query.filter_by(user_id=user.id, is_active=True).first()
    if not address:
        return jsonify({"error": "No tienes una dirección de despacho registrada."}), 400

    # ── Construir líneas verificando precios en la BD ──
    order_items = []
    total = 0.0

    for item in items_data:
        product_id = item.get("product_id")
        unit_type = (item.get("unit_type") or "lb").lower()
        qty = item.get("quantity", 0)

        if unit_type not in ("unit", "lb"):
            return jsonify({"error": f"unit_type inválido: {unit_type}"}), 400
        if not isinstance(qty, (int, float)) or qty <= 0:
            return jsonify({"error": "La cantidad debe ser mayor a 0."}), 400

        product = db.session.get(Product, product_id)
        if not product or not product.is_active:
            return jsonify({"error": f"Producto id={product_id} no existe o está inactivo."}), 400

        unit_price = product.price_per_unit if unit_type == "unit" else product.price_per_lb
        subtotal = round(unit_price * qty, 2)
        total += subtotal

        order_items.append(OrderItem(
            product_id=product.id,
            product_name=product.name,   # snapshot: el nombre puede cambiar después
            unit_type=unit_type,
            unit_price=unit_price,
            quantity=qty,
            subtotal=subtotal,
        ))

    total = round(total, 2)

    # ── Crear la orden ──
    order = Order(
        user_id=user.id,
        address_id=address.id,
        payment_method=payment_method,
        status="pending",
        total_amount=total,
        notes=notes or None,
        created_at=datetime.now(timezone.utc),
    )

    for oi in order_items:
        oi.order = order

    db.session.add(order)
    db.session.commit()

    send_new_order_to_owner(order, user, address)

    return jsonify({
        "ok": True,
        "order": order.to_dict(),
    }), 201


@app.route("/api/orders")
@login_required_api
def api_list_orders():
    user = get_current_user()
    orders = (
        Order.query
        .filter_by(user_id=user.id)
        .order_by(Order.created_at.desc())
        .all()
    )
    return jsonify([o.to_dict() for o in orders])


# ── Perfil ───────────────────────────────────────────────────────────────────

@app.route("/api/profile/address")
@login_required_api
def api_get_address():
    user = get_current_user()
    address = Address.query.filter_by(user_id=user.id, is_active=True).first()
    if not address:
        return jsonify({"address": None})
    return jsonify({
        "address": {
            "id": address.id,
            "address_line": address.address_line,
            "corregimiento": address.corregimiento,
            "latitude": address.latitude,
            "longitude": address.longitude,
        }
    })


@app.route("/api/profile/address", methods=["PUT"])
@login_required_api
def api_update_address():
    user = get_current_user()
    data = request.get_json(silent=True) or {}

    address_line  = (data.get("address_line") or "").strip()
    corregimiento = (data.get("corregimiento") or "").strip()

    if not address_line:
        return jsonify({"error": "La dirección es obligatoria."}), 400
    if not corregimiento:
        return jsonify({"error": "El corregimiento es obligatorio."}), 400

    raw_lat = data.get("latitude")
    raw_lng = data.get("longitude")
    try:
        latitude  = float(raw_lat) if raw_lat is not None else None
        longitude = float(raw_lng) if raw_lng is not None else None
    except (TypeError, ValueError):
        latitude = longitude = None

    address = Address.query.filter_by(user_id=user.id, is_active=True).first()
    if not address:
        address = Address(user_id=user.id, is_active=True)
        db.session.add(address)

    address.address_line  = address_line
    address.corregimiento = corregimiento
    address.latitude      = latitude
    address.longitude     = longitude

    db.session.commit()
    return jsonify({"ok": True})


# ——— Inicialización ———

def init_db():
    db.create_all()
    seed_catalog()


if __name__ == "__main__":
    with app.app_context():
        init_db()
    app.run(debug=True, port=5000)
