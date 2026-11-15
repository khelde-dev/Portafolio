import type { APIRoute } from "astro";
import { DEFAULT_LOCALE, LOCALES } from "@/i18n/locales";
import { getProjectsForLlms } from "@/lib/llmsTxt";

const escapeXml = (value: string): string =>
	value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");

/**
 * Sitemap de los detalles de proyecto (`/[lang]/project/<slug>`). El sitemap del build
 * solo conoce las rutas estaticas; los proyectos viven en el CMS y se publican sin
 * redesplegar, asi que esta lista se arma al pedirla. Cada proyecto sale en los tres
 * idiomas con sus alternativas `hreflang` (el slug es el mismo en todos).
 */
export const GET: APIRoute = async ({ site, url }) => {
	const origin = site ?? new URL(url.origin);
	const projects = await getProjectsForLlms();
	const loc = (locale: string, slug: string) =>
		new URL(
			`/${locale}/project/${encodeURIComponent(slug)}`,
			origin,
		).toString();

	const entries = projects
		.filter((p) => typeof p.slug === "string" && p.slug.length > 0)
		.flatMap((p) =>
			LOCALES.map((locale) => {
				const alternates = [
					...LOCALES.map(
						(l) =>
							`    <xhtml:link rel="alternate" hreflang="${l}" href="${escapeXml(loc(l, p.slug))}"/>`,
					),
					`    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(loc(DEFAULT_LOCALE, p.slug))}"/>`,
				].join("\n");
				return `  <url>\n    <loc>${escapeXml(loc(locale, p.slug))}</loc>\n${alternates}\n  </url>`;
			}),
		);

	const body = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
		...entries,
		"</urlset>",
		"",
	].join("\n");

	return new Response(body, {
		headers: {
			"Content-Type": "application/xml; charset=utf-8",
			"Cache-Control": "public, max-age=300, s-maxage=3600",
		},
	});
};
