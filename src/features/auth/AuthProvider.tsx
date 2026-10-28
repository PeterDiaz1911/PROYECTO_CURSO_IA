"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useTraceabilityStore } from "@/store/useTraceabilityStore";
import { isUserRole, type UserProfile } from "./roles";

type AuthContextValue = {
  client: ReturnType<typeof getSupabaseBrowserClient>;
  session: Session | null; profile: UserProfile | null; loading: boolean; error: string;
  recovery: boolean; clearRecovery: () => void; reload: () => void;
  updateProfile: (updates: Partial<Pick<UserProfile, "nombre" | "telefono" | "descripcion" | "avatar_path">>) => void;
  signOut: () => Promise<void>;
};
const Context = createContext<AuthContextValue | null>(null);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const client = useMemo(getSupabaseBrowserClient, []);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(Boolean(client));
  const [error, setError] = useState("");
  const [recovery, setRecovery] = useState(false);
  const [retry, setRetry] = useState(0);
  const generation = useRef(0);
  const signOut = useCallback(async () => {
    if (!client) return;
    const { error: requestError } = await client.auth.signOut();
    if (requestError) throw requestError;
    useTraceabilityStore.getState().clearStore();
    localStorage.removeItem("nativa-auth");
    document.cookie = "nativa-role=; Path=/; Max-Age=0; SameSite=Lax";
    setRecovery(false);
  }, [client]);
  useEffect(() => {
    if (!client) return;
    let active = true;
    let currentUser: string | null = null;
    let authEvents = 0;
    async function loadProfile(nextSession: Session | null, force = false) {
      if (!active) return;
      setSession(nextSession);
      const id = nextSession?.user.id ?? null;
      if (!force && id && id === currentUser) return;
      currentUser = id;
      const request = ++generation.current;
      setProfile(null); setError("");
      useTraceabilityStore.getState().clearStore();
      if (!id) { setLoading(false); return; }
      setLoading(true);
      try {
        const { data, error: requestError } = await client!.from("usuarios").select("id, nombre, email, rol, is_active, telefono, descripcion, avatar_path").eq("id", id).maybeSingle();
        if (!active || request !== generation.current) return;
        if (requestError) throw new Error(requestError.message);
        if (!data || !isUserRole(data.rol)) throw new Error("Tu cuenta aún no tiene un perfil válido. Contacta a Gerencia.");
        setProfile({
          id: data.id,
          nombre: data.nombre,
          email: data.email,
          rol: data.rol,
          is_active: data.is_active,
          telefono: data.telefono,
          descripcion: data.descripcion,
          avatar_path: data.avatar_path,
        });
      } catch (cause) {
        if (active && request === generation.current) setError(cause instanceof Error ? cause.message : "No se pudo cargar tu perfil.");
      } finally { if (active && request === generation.current) setLoading(false); }
    }
    const { data: listener } = client.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return;
      authEvents += 1;
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      // Supabase callbacks must return before making another Auth request.
      setTimeout(() => { if (active) void loadProfile(nextSession); }, 0);
    });
    const startupEvents = authEvents;
    void client.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active || authEvents !== startupEvents) return;
      if (sessionError) { setError(sessionError.message); setLoading(false); return; }
      void loadProfile(data.session, true);
    }).catch(() => { if (active) { setError("No se pudo restaurar la sesión."); setLoading(false); } });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [client, retry]);
  const updateProfile = useCallback((updates: Partial<Pick<UserProfile, "nombre" | "telefono" | "descripcion" | "avatar_path">>) => {
    setProfile((current) => current ? { ...current, ...updates } : current);
  }, []);
  const value = { client, session, profile, loading, error, recovery, clearRecovery: () => setRecovery(false), reload: () => setRetry((value) => value + 1), updateProfile, signOut };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useAuth() { const context = useContext(Context); if (!context) throw new Error("AuthProvider no está montado."); return context; }
