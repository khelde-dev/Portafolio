/**
 * Datos estructurados y enlaces `hreflang` del <head>. Son funciones puras: el Layout
 * solo las llama, y las pruebas las revisan sin renderizar nada.
 */

/** Nombre con el que el sitio quiere aparecer en los resultados (no el dominio). */
export const SITE_NAME = "Khelde";
/** Otros nombres con los que alguien busca a la misma persona. */
export const PERSON_ALIASES = [
	"muke78",
	"Khelde",
	"Erick Miguel González Rivera",
];
/** Lo que el sitio demuestra de verdad: sale de las habilidades y proyectos publicados. */
export const KNOWS_ABOUT = [
	"React",
	"Astro",
	"TypeScript",
	"Node.js",
	"NestJS",
	"Hono",
	"Cloudflare Workers",
	"SQL Server",
	"PostgreSQL",
	"Kubernetes",
	"Web accessibility",
];

const LOCALE_HOME = /^\/(es|en|fr)\/home\/?$/;
const LOCALE_PROJECT = /^\/(es|en|fr)\/project\/([^/]+)\/?$/;

export interface Alternate {
	hreflang: string;
	href: string;
}

/**
 * Las versiones de una misma pagina en cada idioma, mas `x-default`. Solo para el Home y
 * el detalle de proyecto (mismo slug en los tres idiomas); cualquier otra ruta: nada.
 */
export const alternateLinks = (
	pathname: string,
	origin: URL,
	locales: readonly string[],
	defaultLocale: string,
): Alternate[] => {
	const pathFor = (locale: string): string | null => {
		if (LOCALE_HOME.test(pathname)) return `/${locale}/home`;
		const project = LOCALE_PROJECT.exec(pathname);
		return project ? `/${locale}/project/${project[2]}` : null;
	};
	if (pathFor(defaultLocale) === null) return [];
	const href = (locale: string) =>
		new URL(pathFor(locale) as string, origin).toString();
	return [
		...locales.map((hreflang) => ({ hreflang, href: href(hreflang) })),
		{ hreflang: "x-default", href: href(defaultLocale) },
	];
};

export interface StructuredDataInput {
	origin: URL;
	locales: readonly string[];
	name: string;
	jobTitle: string;
	description: string;
	imageUrl: string;
	logoUrl: string;
	sameAs: readonly string[];
	/** Migas de pan de la pagina (solo el detalle de proyecto las usa). */
	breadcrumbs?: readonly { name: string; url: string }[];
}

/** Un solo `@graph`: el sitio, la persona, su estudio y (si hay) las migas de pan. */
export const buildStructuredData = ({
	origin,
	locales,
	name,
	jobTitle,
	description,
	imageUrl,
	logoUrl,
	sameAs,
	breadcrumbs = [],
}: StructuredDataInput) => {
	const base = origin.toString().replace(/\/$/, "");
	const personId = `${base}/#person`;
	const orgId = `${base}/#organization`;
	const graph: Record<string, unknown>[] = [
		{
			"@type": "WebSite",
			"@id": `${base}/#website`,
			url: `${base}/`,
			name: SITE_NAME,
			alternateName: ["khelde.dev", "Erick González"],
			inLanguage: [...locales],
			publisher: { "@id": personId },
		},
		{
			"@type": "Person",
			"@id": personId,
			name,
			alternateName: PERSON_ALIASES,
			jobTitle,
			description,
			url: `${base}/`,
			image: imageUrl,
			sameAs: [...sameAs],
			knowsAbout: KNOWS_ABOUT,
			homeLocation: {
				"@type": "Place",
				address: {
					"@type": "PostalAddress",
					addressLocality: "Mexico City",
					addressCountry: "MX",
				},
			},
			alumniOf: {
				"@type": "CollegeOrUniversity",
				name: "Polytechnic University of the Valley of Mexico (UPVM)",
			},
		},
		{
			"@type": "Organization",
			"@id": orgId,
			name: SITE_NAME,
			url: `${base}/`,
			logo: logoUrl,
			founder: { "@id": personId },
		},
	];
	if (breadcrumbs.length > 0) {
		graph.push({
			"@type": "BreadcrumbList",
			itemListElement: breadcrumbs.map((item, index) => ({
				"@type": "ListItem",
				position: index + 1,
				name: item.name,
				item: item.url,
			})),
		});
	}
	return { "@context": "https://schema.org", "@graph": graph };
};
