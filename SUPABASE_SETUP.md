# Conectar EduCore con Supabase (backend real)

Mientras no completes esto, la app funciona en **modo demo** (localStorage).
Al configurar las variables, pasa automáticamente a **auth real**.

## 1. Crear el proyecto
1. Entra a https://supabase.com → crea una cuenta (gratis) → **New project**.
2. Anota la contraseña de la base de datos (no se vuelve a mostrar).
3. Espera a que el proyecto termine de aprovisionarse (~2 min).

## 2. Crear la tabla
- Ve a **SQL Editor → New query**, pega el contenido de `supabase/schema.sql` y ejecútalo.

## 3. Configurar Auth
- **Authentication → Providers → Email**: deja **Email** habilitado.
- **Authentication → Sign In / Providers → Email**: **desactiva "Confirm email"**
  (así los usuarios que crea el superadmin pueden entrar de inmediato).

## 4. Desplegar la Edge Function
Necesitas la CLI de Supabase (https://supabase.com/docs/guides/cli):
```bash
supabase login
supabase link --project-ref TU_PROJECT_REF
supabase functions deploy admin-users
```
> `TU_PROJECT_REF` está en Project Settings → General → Reference ID.
> La función usa `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`, que Supabase
> inyecta automáticamente; no hay que configurar secrets manualmente.

## 5. Crear el primer superadmin
La app no tiene registro público (sólo el superadmin crea usuarios), así que el
primer superadmin se crea a mano:
1. **Authentication → Users → Add user** → email + contraseña (marca "Auto confirm").
2. Copia su **User UID**.
3. En **SQL Editor**, inserta su perfil (reemplaza UID y datos):
```sql
insert into public.profiles (id, nombre, email, rol, estado)
values ('PEGA-EL-UID-AQUI', 'Tu Nombre', 'tu@correo.com', 'superadmin', 'activo');
```
Ya puedes entrar con ese email + contraseña y crear el resto desde la app.

## 6. Variables de entorno (frontend)
En **Project Settings → API** copia **Project URL** y **anon public key**.

**Local:** crea `.env.local` (ver `.env.example`):
```
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-public-key
```

**GitHub Pages:** en el repo → **Settings → Secrets and variables → Actions →
New repository secret**, crea:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

El workflow ya las inyecta en el build. Con el próximo push, el sitio publicado
usará Supabase.

## 7. CORS (si hace falta)
Las Edge Functions ya responden con `Access-Control-Allow-Origin: *`, así que
funcionan desde GitHub Pages y desde localhost sin configuración extra.
