import { DEFAULT_LOCALE, LOCALES } from "@/i18n/locales";
import {
	buildLlmsTxt,
	getLlmsProfile,
	getProjectsForLlms,
	LLMS_LOCALE,
} from "@/lib/llmsTxt";
import { mediaUrl } from "@/lib/media";
import { getContact } from "@/lib/siteContact";
import { getSiteCopy } from "@/lib/siteCopy";

const DEFAULT_DESCRIPTION =
	"Personal portfolio of Erick Miguel González Rivera (muke78, Khelde), a full-stack web developer: projects, professional experience, education, skills and opinions. Focus on React, Astro, Node.js, TypeScript and modern backend architectures on Cloudflare. Available in Spanish, English and French.";

/**
 * Respuesta de `/llms.txt` (indice) y `/llms-full.txt` (con los textos completos). El
 * origen sale de `site` para seguir a SITE_URL como robots.txt y el sitemap; el contacto,
 * el CV, los proyectos y el perfil salen de las mismas fuentes que el sitio, y cada parte
 * cae a nada (nunca a un error) si el backend no responde.
 */
export const llmsResponse = async (
	site: URL | undefined,
	url: URL,
	mode: "index" | "full",
): Promise<Response> => {
	const origin = (site ?? new URL(url.origin)).origin;

	const [contact, copy, projects, profile] = await Promise.all([
		getContact(),
		getSiteCopy(LLMS_LOCALE),
		getProjectsForLlms(),
		getLlmsProfile(),
	]);

	const body = buildLlmsTxt({
		origin,
		locales: LOCALES,
		defaultLocale: DEFAULT_LOCALE,
		description: DEFAULT_DESCRIPTION,
		contact,
		cvUrl: copy?.cv_pdf ? mediaUrl(copy.cv_pdf) : null,
		projects,
		profile,
		mode,
	});

	return new Response(body, {
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
			"Cache-Control": "public, max-age=300, s-maxage=3600",
		},
	});
};
