"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, UserRound, UserRoundPen } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useAuth } from "@/features/auth/AuthProvider";
import { ProfileAvatar } from "@/features/profile/ProfileAvatar";
import { ProfileDialog } from "@/features/profile/ProfileDialog";

export function ProfileMenu() {
  const { profile, signOut, updateProfile } = useAuth();
  const router = useRouter();
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"view" | "edit" | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");
  const restoreFocus = useRef(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!menuOpen) return;
    menu.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !menu.current?.contains(event.target) && !trigger.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setMenuOpen(false);
        restoreFocus.current = true;
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (restoreFocus.current && !menuOpen && !dialogMode) {
      trigger.current?.focus();
      restoreFocus.current = false;
    }
  }, [dialogMode, menuOpen]);

  if (!profile) return null;

  function openDialog(mode: "view" | "edit") {
    setMenuOpen(false);
    setDialogMode(mode);
    setError("");
  }

  async function handleSignOut() {
    setSigningOut(true);
    setError("");
    try {
      await signOut();
      router.replace("/login");
    } catch {
      setError("No se pudo cerrar sesión. Inténtalo nuevamente.");
      setSigningOut(false);
    }
  }

  function closeDialog() {
    setDialogMode(null);
    restoreFocus.current = true;
  }

  return (
    <div className="relative">
      <button
        ref={trigger}
        type="button"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-controls="account-menu"
        aria-label={`Cuenta de ${profile.nombre}`}
        onClick={() => setMenuOpen((open) => !open)}
        className="flex min-h-11 items-center gap-2 rounded-xl px-2 py-1.5 text-left text-[#17251D] outline-none transition hover:bg-[#F5F8F4] focus-visible:ring-2 focus-visible:ring-[#2D6A4F] focus-visible:ring-offset-2"
      >
        <ProfileAvatar profile={profile} className="h-9 w-9 bg-[#2D6A4F]" />
        <span className="hidden max-w-48 truncate text-sm font-bold sm:inline">{profile.nombre}</span>
        <ChevronDown aria-hidden="true" size={15} className={`hidden text-[#526157] transition sm:block ${menuOpen ? "rotate-180" : ""}`} />
      </button>

      {menuOpen && (
        <motion.div ref={menu} id="account-menu" role="menu" aria-label="Menú de cuenta" initial={{ opacity: 0, y: reduceMotion ? 0 : -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : 0.12 }} className="absolute right-0 top-full z-40 mt-2 w-64 rounded-2xl border border-[#17251D]/10 bg-white p-2 shadow-xl">
          <div className="border-b border-[#17251D]/10 px-3 py-2">
            <p className="truncate text-sm font-bold text-[#17251D]">{profile.nombre}</p>
            <p className="truncate text-xs text-[#526157]">{profile.email}</p>
          </div>
          <button role="menuitem" type="button" onClick={() => openDialog("view")} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-[#17251D] outline-none hover:bg-[#F5F8F4] focus-visible:ring-2 focus-visible:ring-[#2D6A4F]">
            <UserRound size={17} /> Mi perfil
          </button>
          <button role="menuitem" type="button" onClick={() => openDialog("edit")} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-[#17251D] outline-none hover:bg-[#F5F8F4] focus-visible:ring-2 focus-visible:ring-[#2D6A4F]">
            <UserRoundPen size={17} /> Editar perfil
          </button>
          <button role="menuitem" type="button" disabled={signingOut} onClick={() => void handleSignOut()} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-red-800 outline-none hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-700 disabled:cursor-not-allowed disabled:opacity-100 disabled:text-[#526157]">
            <LogOut size={17} /> {signingOut ? "Cerrando sesión…" : "Cerrar sesión"}
          </button>
          {error && <p role="alert" className="px-3 py-2 text-xs font-medium text-red-800">{error}</p>}
        </motion.div>
      )}

      {dialogMode && (
        <ProfileDialog
          profile={profile}
          startInEditMode={dialogMode === "edit"}
          onClose={closeDialog}
          onProfileSaved={updateProfile}
        />
      )}
    </div>
  );
}
