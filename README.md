# ServiSalo (maqueta web)

App para vender legumbres a clientes registrados. Paleta: **turquesa**, **dorado** y **negro**.

## Flujo actual

1. **Inicio** (`index.html`) — nombre de la app, botones INGRESAR y CREAR CUENTA
2. **Ingresar** (`login.html`) — acepta cualquier credencial → catálogo
3. **Crear cuenta** (`register.html`) — placeholder (registro real después)
4. **Catálogo** (`catalog.html`) — legumbres y carrito (requiere sesión)

## Cómo ver la maqueta

```bash
cd SaloFinal
python3 -m http.server 8080
```

Abre **http://localhost:8080** (no abras los HTML directamente: los módulos ES necesitan HTTP).

## Stack

| Capa | Tecnología |
|------|------------|
| UI | HTML, CSS, JavaScript (módulos ES) |
| Sesión (maqueta) | `sessionStorage` |
| Datos | `js/data/legumes.js` → luego API + BD |

## Desktop

- Home, login y registro: contenido centrado con ancho máximo cómodo
- Catálogo: panel centrado con borde y sombra; en pantallas ≥900px el catálogo usa **2 columnas**

## Próximos pasos

1. Registro real en CREAR CUENTA
2. Login que valide solo cuentas creadas
3. Ubicación de despacho
4. API + base de datos y pagos ACH / Yappy
