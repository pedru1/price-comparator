# Comparador de Precios

PWA instalable (Android) para comparar precios. React + Vite + TypeScript.

## Requisitos

- Node.js 18+

## Correr en local

```bash
npm install
npm run dev
```

Abrir `http://localhost:5173`.

## Build de producción

```bash
npm run build
```

Genera la carpeta `dist/` con la PWA lista (manifest + service worker incluidos).

## Deploy a GitHub Pages

1. Creá un repo en GitHub llamado **`price-comparator`** (el `base` del build está
   fijado a `/price-comparator/` en `vite.config.ts`; si lo llamás distinto,
   cambiá la constante `REPO` ahí antes de deployar).
2. Subí el proyecto:

   ```bash
   git init
   git add .
   git commit -m "Inicial"
   git remote add origin https://github.com/<usuario>/price-comparator.git
   git push -u origin main
   ```

3. Deployá la app:

   ```bash
   npm run deploy
   ```

   Esto builda y sube `dist/` a la rama `gh-pages`.
4. En GitHub → repo → **Settings → Pages**: en *Source* elegí
   **Deploy from a branch** → rama `gh-pages` → carpeta `/ (root)`. (Solo la primera vez.)

La app queda en `https://<usuario>.github.io/price-comparator/`.

## Instalar la PWA en Android (Chrome)

1. Abrí la URL del deploy en Chrome para Android.
2. Tocá el menú (⋮) arriba a la derecha.
3. Tocá **"Instalar app"** (o **"Agregar a pantalla de inicio"**).

La app se instala con ícono y nombre, se abre en modo **standalone**
(sin barra de navegador) y funciona offline (los assets estáticos quedan cacheados
por el service worker).

## Estructura

```
src/
  components/   # Componentes compartidos (Layout, bottom nav)
  pages/        # Una página por ruta: Productos, Comparar, Resumen
  db/           # Capa de datos (IndexedDB/localStorage)
  services/     # Lógica de negocio (búsqueda de precios, etc.)
```

Los íconos en `public/pwa-192x192.png` y `public/pwa-512x512.png` son placeholders
generados; reemplazalos cuando tengas los definitivos.
