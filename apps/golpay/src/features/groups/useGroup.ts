import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getGroup, listGroups } from "./api";

/**
 * El grupo activo sale de la URL (`/g/:gid/...`), no de un "grupo actual"
 * guardado en el navegador. Así el enlace que le mandás a Sebas abre el grupo
 * correcto, y no el que él tuviera seleccionado.
 */
export function useGroupId(): string {
  const { gid } = useParams<{ gid: string }>();
  if (!gid) throw new Error("Esta pantalla necesita ir dentro de /g/:gid");
  return gid;
}

export function useGroup() {
  const gid = useGroupId();
  return useQuery({ queryKey: ["group", gid], queryFn: () => getGroup(gid) });
}

export function useGroups() {
  return useQuery({ queryKey: ["groups"], queryFn: listGroups });
}
