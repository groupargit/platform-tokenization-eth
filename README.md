# Casa Color - Secure Access

Sistema de gestión de edificios inteligentes con integración IoT, autenticación segura y diseño basado en psicología del color.

## 🏗️ Sobre el Proyecto

Casa Color es una plataforma web moderna para la gestión de apartamentos inteligentes que integra:
- **Autenticación segura** con Auth0
- **Base de datos en tiempo real** con Firebase
- **Dispositivos IoT** (ESP32, sensores, actuadores)
- **Diseño cromático** basado en psicología del color
- **Automatización** de rutinas inteligentes

## 🚀 Inicio Rápido

### Requisitos Previos

- Node.js 18+ instalado ([instalar con nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- npm o yarn

### Instalación

```sh
# Paso 1: Clonar el repositorio
git clone <YOUR_GIT_URL>

# Paso 2: Navegar al directorio del proyecto
cd casa-color-secure-access

# Paso 3: Instalar las dependencias
npm install

# Paso 4: Iniciar el servidor de desarrollo
npm run dev
```

El servidor se iniciará en `http://localhost:8080`

## 🛠️ Scripts Disponibles

- `npm run dev` - Inicia el servidor de desarrollo con hot-reload
- `npm run build` - Construye la aplicación para producción
- `npm run build:dev` - Construye en modo desarrollo
- `npm run preview` - Previsualiza la build de producción
- `npm run lint` - Ejecuta el linter

## 🏛️ Tecnologías Utilizadas

Este proyecto está construido con:

- **Vite** - Build tool y dev server
- **TypeScript** - Tipado estático
- **React 18** - Biblioteca UI
- **shadcn-ui** - Componentes UI
- **Tailwind CSS** - Framework CSS
- **Firebase** - Base de datos en tiempo real
- **Auth0** - Autenticación
- **Framer Motion** - Animaciones
- **React Router** - Navegación

## 📁 Estructura del Proyecto

```
src/
├── pages/          # Páginas principales
├── components/     # Componentes React
├── hooks/          # Custom hooks
├── lib/            # Utilidades y configuraciones
├── types/          # Definiciones TypeScript
└── data/           # Datos estáticos
```

## 🔐 Configuración

### Firebase

La configuración de Firebase está en `src/lib/firebase.ts`. Las credenciales están configuradas para el proyecto `casa-color-skill`.

### Auth0

La configuración de Auth0 está en `src/App.tsx`. El dominio y client ID están configurados.

## 📝 Licencia

© 2025 Casa Color - Un producto de Groupar S.A.S. Todos los derechos reservados.
