"use client";

import type { FormEvent, KeyboardEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Camera, Check, LoaderCircle, Pencil, Trash2, X } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { roleAreas, roleLabels, type UserProfile } from "@/features/auth/roles";
import { validateAvatarFile, validateAvatarSignature, validateEditableProfile } from "@/features/profile/profile-validation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { profileInitials } from "./ProfileAvatar";

type Props = {
  profile: UserProfile;
  startInEditMode: boolean;
  onClose: () => void;
  onProfileSaved: (updates: Pick<UserProfile, "nombre" | "telefono" | "descripcion" | "avatar_path">) => void;
};

export function ProfileDialog({ profile, startInEditMode, onClose, onProfileSaved }: Props) {
  const [editing, setEditing] = useState(startInEditMode);
  const [name, setName] = useState(profile.nombre);
  const [phone, setPhone] = useState(profile.telefono ?? "");
  const [description, setDescription] = useState(profile.descripcion ?? "");
  const [selectedAvatar, setSelectedAvatar] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [warning, setWarning] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();

  const dirty = useMemo(() => (
    name !== profile.nombre
    || phone !== (profile.telefono ?? "")
    || description !== (profile.descripcion ?? "")
    || selectedAvatar !== null
    || removeAvatar
  ), [description, name, phone, profile.descripcion, profile.nombre, profile.telefono, removeAvatar, selectedAvatar]);

  useEffect(() => {
    dialog.current?.focus();
  }, []);

  useEffect(() => {
    if (!selectedAvatar) {
      setPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(selectedAvatar);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedAvatar]);

  function requestClose() {
    if (saving) return;
    if (editing && dirty && !window.confirm("Tienes cambios sin guardar. ¿Quieres descartarlos?")) return;
    onClose();
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      requestClose();
      return;
    }
    if (event.key !== "Tab" || !dialog.current) return;
    const focusable = dialog.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function beginEdit() {
    setName(profile.nombre);
    setPhone(profile.telefono ?? "");
    setDescription(profile.descripcion ?? "");
    setSelectedAvatar(null);
    setRemoveAvatar(false);
    setError("");
    setSuccess("");
    setWarning("");
    setEditing(true);
  }

  function cancelEdit() {
    if (dirty && !window.confirm("Tienes cambios sin guardar. ¿Quieres descartarlos?")) return;
    setName(profile.nombre);
    setPhone(profile.telefono ?? "");
    setDescription(profile.descripcion ?? "");
    setSelectedAvatar(null);
    setRemoveAvatar(false);
    setError("");
    setWarning("");
    setEditing(false);
  }

  async function handleAvatarSelection(file: File | undefined) {
    if (!file) return;
    const fileError = validateAvatarFile(file);
    if (fileError) {
      setError(fileError);
      if (fileInput.current) fileInput.current.value = "";
      return;
    }
    try {
      if (!await validateAvatarSignature(file)) {
        setError("El contenido no coincide con JPEG, PNG o WebP. No se aceptan archivos SVG.");
        if (fileInput.current) fileInput.current.value = "";
        return;
      }
      const bitmap = await createImageBitmap(file);
      bitmap.close();
    } catch {
      setError("No se pudo leer la imagen. Elige un archivo JPEG, PNG o WebP válido.");
      if (fileInput.current) fileInput.current.value = "";
      return;
    }
    setError("");
    setSuccess("");
    setSelectedAvatar(file);
    setRemoveAvatar(false);
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setWarning("");
    const validationError = validateEditableProfile({ nombre: name, telefono: phone, descripcion: description });
    if (validationError) {
      setError(validationError);
      return;
    }

    const client = getSupabaseBrowserClient();
    if (!client) {
      setError("No está disponible la conexión con Supabase. No se guardaron los cambios.");
      return;
    }

    setSaving(true);
    let uploadedPath: string | null = null;
    let profileSaved = false;
    const oldAvatarPath = profile.avatar_path;
    let nextAvatarPath = removeAvatar ? null : oldAvatarPath;
    try {
      if (selectedAvatar) {
        const extension = selectedAvatar.type === "image/jpeg" ? "jpg" : selectedAvatar.type === "image/png" ? "png" : "webp";
        const newPath = `${profile.id}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await client.storage.from("user-avatars").upload(newPath, selectedAvatar, {
          cacheControl: "3600",
          contentType: selectedAvatar.type,
          upsert: false,
        });
        if (uploadError) throw new Error("No se pudo subir la foto. Verifica tu conexión y vuelve a intentarlo.");
        uploadedPath = newPath;
        nextAvatarPath = newPath;
      }

      const { error: saveError } = await client.rpc("actualizar_perfil_propio", {
        p_nombre: name.trim(),
        p_telefono: phone.trim() || null,
        p_descripcion: description.trim() || null,
        p_avatar_path: nextAvatarPath,
      });
      if (saveError) throw new Error(saveError.message === "account_not_active"
        ? "Tu cuenta ya no está habilitada y no se pudieron guardar los cambios."
        : "No se pudo guardar el perfil. Revisa los datos e inténtalo nuevamente.");

      profileSaved = true;
      onProfileSaved({
        nombre: name.trim(),
        telefono: phone.trim() || null,
        descripcion: description.trim() || null,
        avatar_path: nextAvatarPath,
      });
      setSelectedAvatar(null);
      setRemoveAvatar(false);
      setEditing(false);
      setSuccess("Perfil actualizado correctamente.");

      if (oldAvatarPath && oldAvatarPath !== nextAvatarPath) {
        try {
          const { error: removeError } = await client.storage.from("user-avatars").remove([oldAvatarPath]);
          if (removeError) setWarning("El perfil se guardó, pero no se pudo quitar la foto anterior del almacenamiento.");
        } catch {
          setWarning("El perfil se guardó, pero no se pudo confirmar la eliminación de la foto anterior.");
        }
      }
    } catch (cause) {
      if (profileSaved) {
        setWarning("El perfil se guardó, pero ocurrió un problema al limpiar la foto anterior.");
        return;
      }
      if (uploadedPath) {
        try {
          const { error: cleanupError } = await client.storage.from("user-avatars").remove([uploadedPath]);
          if (cleanupError) throw cleanupError;
        } catch {
          setError("No se pudo guardar el perfil y tampoco limpiar la foto temporal. Contacta a soporte para retirar el archivo.");
          return;
        }
      }
      setError(cause instanceof Error ? cause.message : "No se pudo guardar el perfil. Inténtalo nuevamente.");
    } finally {
      setSaving(false);
    }
  }

  const photoUrl = previewUrl || "";

  return createPortal(
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reduceMotion ? 0 : 0.16 }} className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-[#17251D]/55 p-3 sm:p-6" onMouseDown={(event) => {
      if (event.target === event.currentTarget) requestClose();
    }}>
      <motion.section
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-dialog-title"
        tabIndex={-1}
        onKeyDown={handleDialogKeyDown}
        initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.16 }}
        className="my-auto max-h-[min(calc(100dvh-1.5rem),800px)] w-full max-w-xl overflow-y-auto rounded-2xl border border-[#17251D]/10 bg-white shadow-2xl outline-none sm:max-h-[min(calc(100dvh-3rem),800px)]"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[#17251D]/10 px-5 py-5 sm:px-7">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.15em] text-[#2D6A4F]">Cuenta personal</p>
            <h2 id="profile-dialog-title" className="mt-1 text-xl font-bold text-[#17251D]">{editing ? "Editar perfil" : "Mi perfil"}</h2>
          </div>
          <Button type="button" variant="ghost" aria-label="Cerrar perfil" className="min-h-9 rounded-lg px-2" onClick={requestClose}><X size={18} /></Button>
        </header>

        <div className="p-5 sm:p-7">
          {editing ? (
            <form onSubmit={(event) => void saveProfile(event)} className="space-y-5">
              <div className="flex flex-col items-center gap-3 sm:flex-row">
                <Avatar className="h-20 w-20 border-2 border-[#E5ECE5] bg-[#2D6A4F] text-lg">
                  {photoUrl ? <AvatarImage src={photoUrl} alt="Vista previa de la foto de perfil" /> : profile.avatar_path && !removeAvatar ? <CurrentProfileImage profile={profile} /> : <AvatarFallback>{profileInitials(name || profile.nombre)}</AvatarFallback>}
                </Avatar>
                <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                  <input
                    ref={fileInput}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    aria-label="Seleccionar foto de perfil"
                    className="sr-only"
                    onChange={(event) => void handleAvatarSelection(event.target.files?.[0])}
                  />
                  <Button type="button" variant="outline" className="rounded-xl" onClick={() => fileInput.current?.click()}>
                    <Camera size={16} /> {profile.avatar_path && !removeAvatar || selectedAvatar ? "Cambiar foto" : "Agregar foto"}
                  </Button>
                  {(profile.avatar_path && !removeAvatar || selectedAvatar) && (
                    <Button type="button" variant="ghost" className="rounded-xl text-red-800 hover:bg-red-50 hover:text-red-900" onClick={() => {
                      setSelectedAvatar(null);
                      setRemoveAvatar(true);
                      setError("");
                    }}>
                      <Trash2 size={15} /> Quitar foto
                    </Button>
                  )}
                  <p className="w-full text-center text-xs text-[#526157] sm:text-left">JPEG, PNG o WebP · máximo 2 MB</p>
                </div>
              </div>

              <label className="block text-sm font-semibold text-[#17251D]">
                Nombre <span aria-hidden="true" className="text-red-700">*</span>
                <Input value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} autoComplete="name" className="mt-2 rounded-xl" />
              </label>

              <label className="block text-sm font-semibold text-[#17251D]">
                Correo electrónico
                <Input type="email" value={profile.email} readOnly aria-readonly="true" className="mt-2 rounded-xl bg-[#F5F8F4] text-[#526157]" />
                <span className="mt-1 block text-xs font-normal text-[#526157]">El correo se administra desde Supabase Auth y no se cambia en este formulario.</span>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-semibold text-[#17251D]">
                  Rol
                  <Input value={roleLabels[profile.rol]} readOnly aria-readonly="true" className="mt-2 rounded-xl bg-[#F5F8F4] text-[#526157]" />
                </label>
                <label className="block text-sm font-semibold text-[#17251D]">
                  Área de trabajo
                  <Input value={roleAreas[profile.rol]} readOnly aria-readonly="true" className="mt-2 rounded-xl bg-[#F5F8F4] text-[#526157]" />
                </label>
              </div>

              <label className="block text-sm font-semibold text-[#17251D]">
                Teléfono <span className="font-normal text-[#526157]">(opcional)</span>
                <Input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={25} autoComplete="tel" className="mt-2 rounded-xl" placeholder="+51 999 999 999" />
              </label>

              <label className="block text-sm font-semibold text-[#17251D]">
                Descripción personal <span className="font-normal text-[#526157]">(opcional)</span>
                <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={280} rows={3} className="mt-2 w-full resize-y rounded-xl border border-[#17251D]/20 bg-white px-3 py-2.5 text-sm text-[#17251D] outline-none focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#2D6A4F]/20" aria-describedby="description-count" />
                <span id="description-count" className="mt-1 block text-right text-xs font-normal text-[#526157]">{description.length}/280</span>
              </label>

              {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-900">{error}</p>}

              <div className="flex flex-col-reverse gap-2 border-t border-[#17251D]/10 pt-4 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" className="rounded-xl" disabled={saving} onClick={cancelEdit}>Cancelar</Button>
                <Button type="submit" className="rounded-xl" disabled={saving}>
                  {saving ? <><LoaderCircle className="animate-spin" size={16} /> Guardando…</> : <><Check size={16} /> Guardar cambios</>}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20 bg-[#2D6A4F] text-lg">
                  <CurrentProfileImage profile={profile} />
                </Avatar>
                <div className="min-w-0">
                  <p className="break-words text-xl font-bold text-[#17251D]">{profile.nombre}</p>
                  <p className="mt-1 break-all text-sm text-[#526157]">{profile.email}</p>
                </div>
              </div>
              <dl className="grid gap-4 rounded-2xl bg-[#F5F8F4] p-4 sm:grid-cols-2">
                <ProfileDetail label="Rol" value={roleLabels[profile.rol]} />
                <ProfileDetail label="Área de trabajo" value={roleAreas[profile.rol]} />
                <ProfileDetail label="Teléfono" value={profile.telefono || "No indicado"} />
                <ProfileDetail label="Descripción" value={profile.descripcion || "No indicada"} />
              </dl>
              {success && <p role="status" className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-900">{success}</p>}
              {warning && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950">{warning}</p>}
              <Button type="button" className="w-full rounded-xl sm:w-auto" onClick={beginEdit}><Pencil size={16} /> Editar perfil</Button>
            </div>
          )}
        </div>
      </motion.section>
    </motion.div>,
    document.body,
  );
}

function CurrentProfileImage({ profile }: { profile: UserProfile }) {
  const [url, setUrl] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setUrl("");
    setFailed(false);
    if (!profile.avatar_path) return () => { active = false; };
    const client = getSupabaseBrowserClient();
    if (!client) return () => { active = false; };
    void client.storage.from("user-avatars").createSignedUrl(profile.avatar_path, 3600)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error("No se pudo generar la URL firmada del avatar.", error);
          setFailed(true);
          return;
        }
        setUrl(data.signedUrl);
      })
      .catch((cause: unknown) => {
        if (active) {
          console.error("No se pudo generar la URL firmada del avatar.", cause);
          setFailed(true);
        }
      });
    return () => { active = false; };
  }, [profile.avatar_path]);

  if (!profile.avatar_path || failed || !url) return <AvatarFallback>{profileInitials(profile.nombre)}</AvatarFallback>;
  return <AvatarImage src={url} alt={`Foto de ${profile.nombre}`} onError={() => setFailed(true)} />;
}

function ProfileDetail({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0">
    <dt className="text-xs font-bold uppercase tracking-wide text-[#526157]">{label}</dt>
    <dd className="mt-1 break-words text-sm font-semibold text-[#17251D]">{value}</dd>
  </div>;
}
