import random

from models import Product, db

LEGUMES_SEED = [
    "Alubias blancas",
    "Arvejas partidas",
    "Frijoles negros",
    "Frijoles rojos",
    "Garbanzos",
    "Lentejas rojas",
    "Lentejas verdes",
    "Habas secas",
]


def seed_catalog():
    """Puebla el catálogo con legumbres de prueba si está vacío."""
    if Product.query.count() > 0:
        return

    for name in LEGUMES_SEED:
        price_lb = round(random.uniform(2.4, 3.5), 2)
        price_unit = round(random.uniform(0.55, 1.25), 2)
        db.session.add(
            Product(
                name=name,
                price_per_lb=price_lb,
                price_per_unit=price_unit,
                is_active=True,
            )
        )

    db.session.commit()
