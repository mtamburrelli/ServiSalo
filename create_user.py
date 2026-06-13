"""
Crear un usuario desde la terminal (con hash de contraseña).

Uso:
  python create_user.py
  python create_user.py --name Miguel --email miguel@test.com --password 123456 --role admin
"""
import argparse

from app import app
from auth_utils import hash_password, verify_password
from models import User, db


def main():
    parser = argparse.ArgumentParser(description="Crear usuario en ServiSalo")
    parser.add_argument("--name", default="Miguel")
    parser.add_argument("--email", default="miguel@test.com")
    parser.add_argument("--password", default="123456")
    parser.add_argument("--phone", default="1234567890")
    parser.add_argument("--role", default="admin")
    args = parser.parse_args()

    with app.app_context():
        existing = User.query.filter_by(email=args.email).first()
        if existing:
            print(f"Ya existe: id={existing.id} email={existing.email}")
            print(f"password_hash:\n{existing.password_hash}")
            ok = verify_password(existing.password_hash, args.password)
            print(f"verify_password('{args.password}'): {ok}")
            return

        hashed = hash_password(args.password)
        user = User(
            name=args.name,
            email=args.email,
            password_hash=hashed,
            phone=args.phone,
            role=args.role,
            is_active=True,
        )
        db.session.add(user)
        db.session.commit()

        print(f"Creado: id={user.id} name={user.name} email={user.email}")
        print(f"password_hash:\n{user.password_hash}")
        print(f"verify_password('{args.password}'): {verify_password(user.password_hash, args.password)}")


if __name__ == "__main__":
    main()
