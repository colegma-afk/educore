// Capa de autenticación con dos backends:
//  - "supabase": auth real (contraseñas hasheadas en servidor) + Edge Function
//                "admin-users" para crear/eliminar/regenerar clave (superadmin).
//  - "demo":     fallback en localStorage (sin servidor) para que la app funcione
//                aunque Supabase no esté configurado todavía.
import { supabase, hasSupabase } from "./supabase";

export const backend = hasSupabase ? "supabase" : "demo";

// ── Utilidades ──────────────────────────────────────────────────────────────
export function generarClave(n = 10) {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < n; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}
function emailDe(nombre, rol) {
  const base = (nombre || "usuario").toLowerCase().normalize("NFD")
    .replace(/[̀-ͯ]/g, "").trim().replace(/\s+/g, ".");
  return base + "@" + (rol === "alumno" ? "gmail.com" : "instituto.com");
}

// ── Backend DEMO (localStorage) ─────────────────────────────────────────────
const SEED = [
  { id: 1, nombre: "Carlos Mendoza", rol: "superadmin", estado: "activo", curso: "—", fecha: "2024-01-10", email: "superadmin@instituto.com", clave: "educore2026" },
  { id: 2, nombre: "Ana Torres", rol: "admin", estado: "activo", curso: "—", fecha: "2024-02-15", email: "ana.torres@instituto.com", clave: generarClave() },
  { id: 3, nombre: "Luis Pérez", rol: "profesor", estado: "activo", curso: "Didáctica Digital", fecha: "2024-03-01", email: "luis.perez@instituto.com", clave: generarClave() },
  { id: 4, nombre: "María Soto", rol: "alumno", estado: "activo", curso: "Evaluación Docente", fecha: "2024-04-12", email: "maria.soto@gmail.com", clave: generarClave() },
  { id: 5, nombre: "José Rojas", rol: "alumno", estado: "pendiente", curso: "Liderazgo Educativo", fecha: "2024-05-20", email: "jose.rojas@gmail.com", clave: generarClave() },
  { id: 6, nombre: "Carla Núñez", rol: "profesor", estado: "activo", curso: "Neuroeducación", fecha: "2024-03-18", email: "carla.nunez@instituto.com", clave: generarClave() },
  { id: 7, nombre: "Diego Fuentes", rol: "alumno", estado: "suspendido", curso: "Didáctica Digital", fecha: "2024-06-01", email: "diego.fuentes@gmail.com", clave: generarClave() },
];
function demoLoad() {
  try { const r = localStorage.getItem("educore_users"); if (r) return JSON.parse(r); } catch (e) {}
  return SEED;
}
function demoSave(us) {
  try { localStorage.setItem("educore_users", JSON.stringify(us)); } catch (e) {}
}

const demo = {
  async getInitialUser() { return null; },
  async login(email, clave) {
    const us = demoLoad();
    const u = us.find(x => (x.email || "").toLowerCase() === email.toLowerCase() && x.clave === clave);
    if (!u) return { error: "Email o clave incorrectos." };
    if (u.estado === "suspendido") return { error: "Tu cuenta está suspendida. Contacta al administrador." };
    if (u.estado === "pendiente") return { error: "Tu cuenta está pendiente de activación." };
    return { user: u };
  },
  async logout() {},
  async listUsers() { return demoLoad(); },
  async createUser({ nombre, email, rol, curso, estado }) {
    const us = demoLoad();
    nombre = (nombre || "").trim();
    email = (email || "").trim().toLowerCase() || emailDe(nombre, rol);
    if (!nombre) return { error: "El nombre es obligatorio." };
    if (us.some(u => (u.email || "").toLowerCase() === email)) return { error: "Ya existe un usuario con ese email." };
    const clave = generarClave();
    const user = { id: Date.now(), nombre, email, rol, estado: estado || "activo", curso: curso || "—", fecha: new Date().toISOString().slice(0, 10), clave };
    demoSave([...us, user]);
    return { user, clave };
  },
  async deleteUser(u) {
    const us = demoLoad();
    if (u.rol === "superadmin" && us.filter(x => x.rol === "superadmin").length <= 1)
      return { error: "No puedes eliminar al único superadmin." };
    demoSave(us.filter(x => x.id !== u.id));
    return {};
  },
  async resetClave(u) {
    const us = demoLoad();
    const clave = generarClave();
    demoSave(us.map(x => x.id === u.id ? { ...x, clave } : x));
    return { clave };
  },
};

// ── Backend SUPABASE ────────────────────────────────────────────────────────
async function fetchProfile(id, email) {
  const { data } = await supabase.from("profiles").select("*").eq("id", id).single();
  return data ? { ...data, email: data.email || email } : null;
}
async function invokeAdmin(action, payload) {
  const { data, error } = await supabase.functions.invoke("admin-users", { body: { action, ...payload } });
  if (error) {
    // Intenta extraer el mensaje del cuerpo de la respuesta de la función.
    let msg = error.message;
    try { const ctx = await error.context?.json?.(); if (ctx?.error) msg = ctx.error; } catch (e) {}
    return { error: msg };
  }
  if (data?.error) return { error: data.error };
  return data || {};
}

const sb = {
  async getInitialUser() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    return fetchProfile(session.user.id, session.user.email);
  },
  async login(email, clave) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: clave });
    if (error) return { error: "Email o clave incorrectos." };
    const prof = await fetchProfile(data.user.id, data.user.email);
    if (!prof) return { error: "No se encontró el perfil del usuario." };
    if (prof.estado === "suspendido") { await supabase.auth.signOut(); return { error: "Tu cuenta está suspendida." }; }
    if (prof.estado === "pendiente") { await supabase.auth.signOut(); return { error: "Tu cuenta está pendiente de activación." }; }
    return { user: prof };
  },
  async logout() { await supabase.auth.signOut(); },
  async listUsers() {
    const { data } = await supabase.from("profiles").select("*").order("fecha", { ascending: false });
    return data || [];
  },
  createUser(payload) { return invokeAdmin("create", { ...payload, email: (payload.email || "").trim() || emailDe(payload.nombre, payload.rol) }); },
  deleteUser(u) { return invokeAdmin("delete", { id: u.id }); },
  resetClave(u) { return invokeAdmin("reset", { id: u.id }); },
};

// ── Export según backend activo ─────────────────────────────────────────────
const impl = hasSupabase ? sb : demo;
export const getInitialUser = () => impl.getInitialUser();
export const login = (email, clave) => impl.login(email, clave);
export const logout = () => impl.logout();
export const listUsers = () => impl.listUsers();
export const createUser = (p) => impl.createUser(p);
export const deleteUser = (u) => impl.deleteUser(u);
export const resetClave = (u) => impl.resetClave(u);
