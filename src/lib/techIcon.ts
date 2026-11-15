import { TECH_ICONS } from "@/lib/techIconNames";

/** Icono de respaldo para una tecnologia sin SVG propio. */
export const FALLBACK_ICON = "/icons/_fallback.svg";

/**
 * URL del icono de una tecnologia. Los SVG viven en el propio sitio
 * (`public/icons/<nombre>.svg`, sacados de go-skill-icons con licencia MIT y de devicon
 * y simple-icons): ya no dependen de ningun servicio externo ni de su cache. Un nombre
 * sin icono recibe el respaldo en vez de una imagen rota.
 */
export const techIconUrl = (name: string): string => {
	const key = name.trim().toLowerCase();
	return TECH_ICONS.has(key) ? `/icons/${key}.svg` : FALLBACK_ICON;
};
