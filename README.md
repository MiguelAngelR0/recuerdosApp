# Recuerdos

App para dos: un pollito y un osito que muestran qué está haciendo cada uno, una enredadera de recuerdos (foto + texto) y una lista de tareas compartida. Todo se sincroniza al momento entre los dos móviles.

Hecha con **Expo (React Native + TypeScript)** y **Supabase** (plan gratuito).

## 1. Crear la base de datos (gratis)

1. Crea una cuenta en [supabase.com](https://supabase.com) y un proyecto nuevo (plan **Free**).
2. Ve a **SQL Editor**, pega todo el contenido de [`supabase/schema.sql`](supabase/schema.sql) y pulsa **Run**.
3. Ve a **Authentication → Sign In / Providers → Email** y desactiva **Confirm email**, para poder entrar sin confirmar el correo (opcional, pero más cómodo).
4. Ve a **Project Settings → API** y copia la **Project URL** y la clave **anon public**.
5. En la carpeta del proyecto, copia `.env.example` como `.env` y pega esos dos valores.

## 2. Probarla en tu móvil

```bash
npm install
npx expo start
```

Instala **Expo Go** en el móvil y escanea el código QR. Si el móvil no está en la misma wifi que el ordenador, usa `npx expo start --tunnel`.

## 3. Instalarla de verdad (sin ordenador encendido)

**Android** (gratis): crea una cuenta en [expo.dev](https://expo.dev) y ejecuta

```bash
npx eas-cli@latest build -p android --profile preview
```

Al terminar te da un enlace para descargar el **APK**. Pásale ese enlace a tu pareja, lo abre en su móvil y lo instala.

**iPhone**: para instalarla de forma permanente Apple exige una cuenta de desarrollador (99 $/año). Sin ella se puede usar con Expo Go mientras el ordenador tenga `npx expo start` en marcha.

## Cómo funciona

- El primero que entra pulsa **Crear nuestro rincón** y es el pollito. En **Ajustes** aparece el código de pareja.
- El otro se registra, escribe ese código y es el osito.
- En Inicio, toca tu personaje para elegir tu estado en la ruleta. Tu pareja lo ve al instante.
- En Tareas, mantén pulsada una tarea para borrarla y toca la etiqueta para asignarla (Los dos → Tú → Pareja).

## Estructura

```
src/app/            pantallas (Expo Router): index (Inicio), recuerdos, tareas
src/components/     fondo de cerezo, cristal, personajes, ruleta, ajustes
src/lib/            Supabase, sesión de pareja, temas y ajustes
supabase/schema.sql tablas, seguridad y almacenamiento de fotos
```

## Créditos

Pollito y cara del osito: [Noto Emoji](https://github.com/googlefonts/noto-emoji) de Google, licencia Apache 2.0.
