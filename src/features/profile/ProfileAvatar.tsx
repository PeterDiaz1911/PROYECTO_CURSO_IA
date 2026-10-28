"use client";

import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { UserProfile } from "@/features/auth/roles";

export function profileInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase() || "?";
}

export function ProfileAvatar({ profile, className }: { profile: UserProfile; className?: string }) {
  const [imageUrl, setImageUrl] = useState("");
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setImageUrl("");
    setImageFailed(false);
    if (!profile.avatar_path) return () => { active = false; };
    const client = getSupabaseBrowserClient();
    if (!client) return () => { active = false; };
    void client.storage.from("user-avatars").createSignedUrl(profile.avatar_path, 3600)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error("No se pudo generar la URL firmada del avatar.", error);
          return;
        }
        setImageUrl(data.signedUrl);
      })
      .catch((cause: unknown) => {
        if (active) console.error("No se pudo generar la URL firmada del avatar.", cause);
      });
    return () => { active = false; };
  }, [profile.avatar_path]);

  return (
    <Avatar className={className}>
      {imageUrl && !imageFailed ? <AvatarImage src={imageUrl} alt={`Foto de ${profile.nombre}`} onError={() => setImageFailed(true)} /> : <AvatarFallback>{profileInitials(profile.nombre)}</AvatarFallback>}
    </Avatar>
  );
}
