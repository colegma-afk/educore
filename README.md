# EduCore — Plataforma de Capacitación Docente

App React (Vite) de la plataforma EduCore.

## Requisitos
- Node.js 18+ (instalar desde https://nodejs.org — versión LTS)

## Puesta en marcha

```bash
cd educore-vite
npm install        # instala dependencias (solo la primera vez)
npm run dev        # servidor de desarrollo con hot-reload → http://localhost:5173
```

## Build de producción

```bash
npm run build      # genera la carpeta dist/ optimizada
npm run preview    # sirve el build para revisarlo localmente
```

## Estructura

```
educore-vite/
├── index.html          # punto de entrada HTML
├── package.json        # dependencias y scripts
├── vite.config.js      # configuración de Vite
└── src/
    ├── main.jsx        # monta la app React
    ├── App.jsx         # aplicación completa EduCore
    └── index.css       # variables de tema y estilos base
```

## Roles de demostración
En la pantalla de login se elige uno de cuatro roles de demo:
Superadmin · Administrador · Profesor · Alumno.
