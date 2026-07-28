# Catálogo de Autos — Panel de Administración

Panel para agregar/editar/eliminar autos del catálogo desde un navegador,
que actualiza automáticamente:
1. El repositorio de GitHub (`data/autos.json` + fotos en `/fotos`)
2. El sitio publicado (Netlify)
3. (Opcional) La publicación en MercadoLibre

---

## 1. Sube este proyecto a GitHub

1. Crea un repositorio nuevo en GitHub (público o privado).
2. Sube toda esta carpeta (`catalogo-autos/`) a ese repositorio.
3. Invita a tu compañero como colaborador (Settings → Collaborators).

## 2. Conecta el repo a Netlify (hosting + funciones + login)

1. Crea cuenta gratis en https://netlify.com
2. "Add new site" → "Import an existing project" → conecta tu cuenta de GitHub → elige el repo.
3. Build settings: déjalos vacíos (no hay build, es HTML estático). Publish directory: `.`
4. Click "Deploy site". En 1-2 minutos tendrás una URL tipo `random-name.netlify.app`.

## 3. Activa Netlify Identity (el login del panel)

1. En el sitio dentro de Netlify: **Site configuration → Identity → Enable Identity**.
2. En "Registration preferences" elige **Invite only** (para que nadie más se registre solo).
3. Ve a **Identity → Invite users** y agrégate a ti mismo (y a quien más vaya a usar el panel) con tu correo.
4. Te llegará un correo para poner tu contraseña.

## 4. Genera el token de GitHub (para que las funciones puedan escribir en el repo)

1. Ve a GitHub → tu foto de perfil → **Settings → Developer settings → Personal access tokens → Fine-grained tokens**.
2. **Generate new token**.
3. Repository access: **Only select repositories** → elige tu repo del catálogo.
4. Permissions → Repository permissions → **Contents: Read and write**.
5. Genera el token y **cópialo ya** (solo se muestra una vez).

## 5. Configura las variables de entorno en Netlify

En Netlify: **Site configuration → Environment variables → Add a variable**. Agrega:

| Variable | Valor |
|---|---|
| `GITHUB_TOKEN` | el token que generaste en el paso 4 |
| `GITHUB_OWNER` | tu usuario de GitHub (ej. `juanperez`) |
| `GITHUB_REPO` | nombre del repo (ej. `catalogo-autos`) |
| `GITHUB_BRANCH` | `main` |

Después de guardarlas, ve a **Deploys → Trigger deploy → Deploy site** para que tomen efecto.

**Prueba en este punto:** entra a `https://tu-sitio.netlify.app/admin.html`, inicia sesión, agrega un auto de prueba con foto. Deberías ver en tu repo de GitHub que se creó/actualizó `data/autos.json` y la foto en `/fotos` automáticamente. Si funciona, ve al paso 6. Si no, revisa el error que aparece en el panel (usualmente falta alguna variable de entorno).

## 6. (Opcional) Conecta MercadoLibre

Esta parte requiere crear una "aplicación" en MercadoLibre y obtener credenciales. Es un poco más largo:

1. Entra a https://developers.mercadolibre.com.mx con tu cuenta de MercadoLibre (debe ser cuenta vendedora).
2. **Mis aplicaciones → Crear aplicación**. Ponle nombre, y como "Redirect URI" usa temporalmente `https://tu-sitio.netlify.app`.
3. Anota el **Client ID** y **Client Secret** que te da.
4. **Autoriza tu app** (paso manual, solo una vez): abre en el navegador:
   ```
   https://auth.mercadolibre.com.mx/authorization?response_type=code&client_id=TU_CLIENT_ID&redirect_uri=https://tu-sitio.netlify.app
   ```
   Inicia sesión con tu cuenta vendedora → te redirige con un `?code=XXXX` en la URL. Copia ese código.
5. Intercambia ese código por un `refresh_token` (solo se hace una vez), por ejemplo desde tu terminal o Postman:
   ```bash
   curl -X POST https://api.mercadolibre.com/oauth/token \
     -d "grant_type=authorization_code" \
     -d "client_id=TU_CLIENT_ID" \
     -d "client_secret=TU_CLIENT_SECRET" \
     -d "code=EL_CODIGO_DEL_PASO_4" \
     -d "redirect_uri=https://tu-sitio.netlify.app"
   ```
   La respuesta trae `access_token` y, más importante, `refresh_token` (este último no expira tan rápido).
6. En Netlify, agrega estas variables de entorno adicionales:

| Variable | Valor |
|---|---|
| `ML_CLIENT_ID` | tu Client ID |
| `ML_CLIENT_SECRET` | tu Client Secret |
| `ML_REFRESH_TOKEN` | el refresh_token del paso 5 |
| `ML_CATEGORY_ID_AUTOS` | el category_id de "Autos y Camionetas" en tu país (ej. MLM1744 en México) |
| `ML_CURRENCY_ID` | `MXN` |
| `ML_LISTING_TYPE` | `gold` (o el paquete que tengas contratado) |

7. Importante: para publicar vehículos necesitas tener asignado un **paquete de publicación de vehículos** en tu cuenta de MercadoLibre — esto se activa contactando soporte de MercadoLibre, no es automático solo con la API.

## 7. Conecta tu dominio de Hostinger

1. En Netlify: **Site configuration → Domain management → Add a domain** → escribe tu dominio.
2. En Hostinger (hPanel → DNS/Zona DNS), agrega los registros que Netlify te indique (usualmente un registro `A` apuntando a la IP de Netlify, o un `CNAME`).
3. Espera la propagación (10 min a unas horas).
4. Activa HTTPS automático en Netlify (Let's Encrypt, gratis, un clic).

---

## Flujo de trabajo diario

- **Tú**: entras a `tudominio.com/admin.html`, agregas/editas autos, das clic en "Publicar en ML" cuando quieras sincronizar con MercadoLibre.
- **Tu compañero**: edita `index.html`, `catalogo.html`, `css/` directamente en GitHub (sube su HTML, hace commit).
- El sitio se actualiza solo cada vez que hay un cambio en el repo (Netlify redeploya automático).

## Estructura del proyecto

```
catalogo-autos/
├── admin.html              ← Panel de administración (tú lo usas)
├── catalogo.html            ← Catálogo público de ejemplo (tu compañero lo rediseña)
├── index.html                ← Página principal (tu compañero la arma)
├── data/
│   └── autos.json            ← Se actualiza automático desde el panel
├── fotos/                     ← Fotos subidas desde el panel
├── netlify/functions/
│   ├── save-auto.js          ← Crea/edita autos (GitHub API)
│   ├── delete-auto.js        ← Elimina autos
│   ├── publish-mercadolibre.js ← Publica en MercadoLibre
│   └── utils/
│       ├── github.js
│       └── auth.js
└── netlify.toml               ← Configuración de Netlify
```
