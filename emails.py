import logging

import resend
from flask import current_app

logger = logging.getLogger(__name__)


def _init_resend():
    resend.api_key = current_app.config["RESEND_API_KEY"]


def _fmt_payment(method: str) -> str:
    return {"ach": "ACH (transferencia bancaria)", "yappy": "Yappy"}.get(method, method)


def _fmt_unit(unit_type: str) -> str:
    return "unidad" if unit_type == "unit" else "libra"


def _items_html(items) -> str:
    rows = ""
    for item in items:
        rows += f"""
        <tr>
          <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;">{item.product_name}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">{item.quantity} {_fmt_unit(item.unit_type)}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">B/. {item.unit_price:.2f}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">B/. {item.subtotal:.2f}</td>
        </tr>"""
    return rows


# ── Links de mapa para el email ───────────────────────────────────────────────

def _map_links_html(address) -> str:
    """Devuelve botones de Google Maps y Waze si hay coordenadas, vacío si no."""
    if not address.latitude or not address.longitude:
        return ""

    lat, lng = address.latitude, address.longitude
    gmaps = f"https://www.google.com/maps?q={lat},{lng}"
    waze  = f"https://waze.com/ul?ll={lat},{lng}&navigate=yes"

    return f"""
    <p style="margin:12px 0 4px;"><strong>Abrir ubicación:</strong></p>
    <div style="display:flex;gap:10px;flex-wrap:wrap;">
      <a href="{gmaps}" target="_blank"
         style="display:inline-block;background:#4285F4;color:#fff;padding:8px 16px;
                border-radius:6px;text-decoration:none;font-weight:bold;font-size:13px;">
        📍 Google Maps
      </a>
      <a href="{waze}" target="_blank"
         style="display:inline-block;background:#33CCFF;color:#000;padding:8px 16px;
                border-radius:6px;text-decoration:none;font-weight:bold;font-size:13px;">
        🚗 Waze
      </a>
    </div>
    <p style="margin:4px 0 0;font-size:11px;color:#9ca3af;">
      Coordenadas: {lat:.6f}, {lng:.6f}
    </p>"""


# ── Email al dueño cuando llega una orden nueva ───────────────────────────────

def send_new_order_to_owner(order, user, address) -> bool:
    """
    Envía al dueño los detalles completos de la orden nueva
    con un link directo al panel para confirmarla o rechazarla.
    """
    try:
        _init_resend()

        base_url  = current_app.config["APP_BASE_URL"].rstrip("/")
        owner_email = current_app.config["OWNER_EMAIL"]

        if not owner_email:
            logger.warning("OWNER_EMAIL no configurado — email al dueño omitido.")
            return False

        admin_link = f"{base_url}/admin/orders/{order.id}"

        html = f"""
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">
          <h2 style="background:#0d9488;color:#fff;padding:16px 20px;margin:0;border-radius:6px 6px 0 0;">
            Nueva orden #{order.id} — ServiSalo
          </h2>

          <div style="padding:20px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 6px 6px;">

            <h3 style="margin-top:0;">Cliente</h3>
            <p style="margin:4px 0;"><strong>Nombre:</strong> {user.name}</p>
            <p style="margin:4px 0;"><strong>Correo:</strong> {user.email}</p>
            <p style="margin:4px 0;"><strong>Teléfono:</strong> {user.phone or "—"}</p>
            <p style="margin:4px 0;"><strong>Tipo de cuenta:</strong> {user.account_type}</p>

            <h3>Ubicación de despacho</h3>
            <p style="margin:4px 0;"><strong>Dirección:</strong> {address.address_line}</p>
            <p style="margin:4px 0;"><strong>Corregimiento:</strong> {address.corregimiento or "—"}</p>
            {_map_links_html(address)}

            <h3>Productos solicitados</h3>
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <thead>
                <tr style="background:#f3f4f6;">
                  <th style="padding:8px 12px;text-align:left;">Producto</th>
                  <th style="padding:8px 12px;text-align:center;">Cantidad</th>
                  <th style="padding:8px 12px;text-align:right;">Precio unit.</th>
                  <th style="padding:8px 12px;text-align:right;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {_items_html(order.items)}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="3" style="padding:10px 12px;text-align:right;font-weight:bold;">Total</td>
                  <td style="padding:10px 12px;text-align:right;font-weight:bold;">B/. {order.total_amount:.2f}</td>
                </tr>
              </tfoot>
            </table>

            <p style="margin-top:16px;">
              <strong>Método de pago:</strong> {_fmt_payment(order.payment_method)}
            </p>
            {"<p><strong>Notas del cliente:</strong> " + order.notes + "</p>" if order.notes else ""}

            <div style="text-align:center;margin-top:28px;">
              <a href="{admin_link}"
                 style="background:#0d9488;color:#fff;padding:12px 28px;border-radius:6px;
                        text-decoration:none;font-weight:bold;font-size:15px;">
                Ver orden en el panel →
              </a>
            </div>

          </div>
        </div>
        """

        resend.Emails.send({
            "from": "ServiSalo <onboarding@resend.dev>",
            "to": [owner_email],
            "subject": f"🛒 Nueva orden #{order.id} de {user.name}",
            "html": html,
        })

        logger.info("Email de nueva orden #%s enviado al dueño.", order.id)
        return True

    except Exception:
        logger.exception("Error enviando email de nueva orden #%s al dueño.", order.id)
        return False


# ── Email al cliente cuando su orden es confirmada ───────────────────────────

def send_order_confirmed_to_customer(order, user) -> bool:
    try:
        _init_resend()

        html = f"""
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">
          <h2 style="background:#0d9488;color:#fff;padding:16px 20px;margin:0;border-radius:6px 6px 0 0;">
            ¡Tu orden fue confirmada! — ServiSalo
          </h2>
          <div style="padding:20px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 6px 6px;">
            <p>Hola <strong>{user.name}</strong>,</p>
            <p>Tu orden <strong>#{order.id}</strong> por un total de
               <strong>B/. {order.total_amount:.2f}</strong> ha sido <strong>confirmada</strong>.</p>
            <p>Nos pondremos en contacto contigo pronto para coordinar la entrega.</p>
            <p style="color:#6b7280;font-size:13px;margin-top:24px;">
              Método de pago: {_fmt_payment(order.payment_method)}
            </p>
          </div>
        </div>
        """

        resend.Emails.send({
            "from": "ServiSalo <onboarding@resend.dev>",
            "to": [user.email],
            "subject": f"✅ Orden #{order.id} confirmada — ServiSalo",
            "html": html,
        })

        logger.info("Email de confirmación de orden #%s enviado a %s.", order.id, user.email)
        return True

    except Exception:
        logger.exception("Error enviando confirmación de orden #%s.", order.id)
        return False


# ── Email al cliente cuando su orden es rechazada ────────────────────────────

def send_order_rejected_to_customer(order, user) -> bool:
    try:
        _init_resend()

        reason_html = (
            f"<p><strong>Motivo:</strong> {order.rejection_reason}</p>"
            if order.rejection_reason
            else ""
        )

        html = f"""
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">
          <h2 style="background:#dc2626;color:#fff;padding:16px 20px;margin:0;border-radius:6px 6px 0 0;">
            Orden no procesada — ServiSalo
          </h2>
          <div style="padding:20px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 6px 6px;">
            <p>Hola <strong>{user.name}</strong>,</p>
            <p>Lamentamos informarte que tu orden <strong>#{order.id}</strong>
               no pudo ser procesada en esta ocasión.</p>
            {reason_html}
            <p>Si tienes alguna duda, contáctanos directamente.</p>
          </div>
        </div>
        """

        resend.Emails.send({
            "from": "ServiSalo <onboarding@resend.dev>",
            "to": [user.email],
            "subject": f"❌ Orden #{order.id} no procesada — ServiSalo",
            "html": html,
        })

        logger.info("Email de rechazo de orden #%s enviado a %s.", order.id, user.email)
        return True

    except Exception:
        logger.exception("Error enviando rechazo de orden #%s.", order.id)
        return False
