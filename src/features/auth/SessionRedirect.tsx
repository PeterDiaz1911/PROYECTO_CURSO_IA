"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { roleHome } from "./roles";
import { SessionStatus } from "./AuthGate";
export function SessionRedirect() {
  const { loading, session, profile, recovery } = useAuth(); const router = useRouter();
  useEffect(() => { if (!loading) router.replace(session && profile?.is_active && !recovery ? roleHome[profile.rol] : "/login"); }, [loading, session, profile, recovery, router]);
  return <SessionStatus><p role="status">Abriendo tu espacio de trabajo...</p></SessionStatus>;
}
