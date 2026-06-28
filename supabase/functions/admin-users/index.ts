// Edge Function: admin-users
// Gestión de usuarios reservada al superadmin (crear / eliminar / regenerar clave).
// Usa la service_role key (sólo disponible en el servidor) para operar sobre auth.users.
//
// Deploy:  supabase functions deploy admin-users
// Las variables SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY las inyecta Supabase
// automáticamente en el entorno de las Edge Functions.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function gen(n = 10): string {
  const c = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < n; i++) s += c[Math.floor(Math.random() * c.length)];
  return s;
}

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1) Identificar al llamante por su JWT
    const jwt = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: { user: caller }, error: cErr } = await admin.auth.getUser(jwt);
    if (cErr || !caller) return json({ error: "No autenticado." }, 401);

    // 2) Verificar que es superadmin
    const { data: prof } = await admin.from("profiles").select("rol").eq("id", caller.id).single();
    if (!prof || prof.rol !== "superadmin") {
      return json({ error: "Solo el superadmin puede gestionar usuarios." }, 403);
    }

    const body = await req.json();
    const action = body.action;

    if (action === "create") {
      const { nombre, email, rol, curso, estado } = body;
      if (!nombre || !email) return json({ error: "Nombre y email son obligatorios." }, 400);
      const clave = gen();
      const { data: created, error: e1 } = await admin.auth.admin.createUser({
        email, password: clave, email_confirm: true,
      });
      if (e1) return json({ error: e1.message }, 400);
      const profile = {
        id: created.user.id, nombre, email,
        rol: rol || "alumno", estado: estado || "activo", curso: curso || "—",
      };
      const { error: e2 } = await admin.from("profiles").insert(profile);
      if (e2) { await admin.auth.admin.deleteUser(created.user.id); return json({ error: e2.message }, 400); }
      return json({ user: { ...profile, fecha: new Date().toISOString().slice(0, 10) }, clave });
    }

    if (action === "delete") {
      const { id } = body;
      if (id === caller.id) return json({ error: "No puedes eliminarte a ti mismo." }, 400);
      const { data: target } = await admin.from("profiles").select("rol").eq("id", id).single();
      if (target?.rol === "superadmin") {
        const { count } = await admin.from("profiles").select("id", { count: "exact", head: true }).eq("rol", "superadmin");
        if ((count || 0) <= 1) return json({ error: "No puedes eliminar al único superadmin." }, 400);
      }
      const { error } = await admin.auth.admin.deleteUser(id); // cascade borra el profile (FK on delete cascade)
      if (error) return json({ error: error.message }, 400);
      return json({});
    }

    if (action === "reset") {
      const { id } = body;
      const clave = gen();
      const { error } = await admin.auth.admin.updateUserById(id, { password: clave });
      if (error) return json({ error: error.message }, 400);
      return json({ clave });
    }

    return json({ error: "Acción no válida." }, 400);
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
