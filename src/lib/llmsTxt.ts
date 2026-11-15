import { api } from "@/lib/api";
import { techName } from "@/lib/techNames";
import type { Projects } from "@/types/currentLang.interface";

/**
 * Contenido de `/llms.txt` y `/llms-full.txt` (llmstxt.org): un indice en Markdown para
 * modelos de lenguaje y agentes, y su version con todo el texto. Todo lo que viene del
 * backend (titulos, resumenes, descripciones, enlaces) es texto que un tercero va a leer
 * como instrucciones: se limpia antes de escribirlo (una sola linea por dato, sin
 * corchetes que rompan un enlace, solo URLs https).
 */

/** Idioma del texto de los proyectos: el que mejor leen los agentes. */
export const LLMS_LOCALE = "en";
/** Mas que esto, esa parte sale vacia y reintenta en la siguiente peticion. */
export const PROJECTS_TIMEOUT_MS = 2_000;
export const PROJECTS_TTL_MS = 5 * 60_000;

const MAX_SUMMARY = 220;
const MAX_FULL = 1_800;

/** Una linea, sin corchetes ni caracteres de control; `max` caracteres como mucho. */
export const cleanText = (value: unknown, max = 160): string => {
	if (typeof value !== "string") return "";
	const flat = Array.from(value)
		.map((char) => {
			const code = char.codePointAt(0) ?? 0;
			return code < 32 || code === 127 ? " " : char;
		})
		.join("")
		.replace(/[[\]]/g, (b) => (b === "[" ? "(" : ")"))
		.replace(/\s+/g, " ")
		.trim();
	return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
};

/** La URL tal como queda normalizada si es https, o `null`. */
export const httpsUrl = (value: unknown): string | null => {
	if (typeof value !== "string" || value.length > 500) return null;
	try {
		const url = new URL(value.trim());
		return url.protocol === "https:" ? url.href : null;
	} catch {
		return null;
	}
};

const CATEGORY_TITLES: Record<string, string> = {
	frontend: "Frontend projects",
	backend: "Backend projects",
	dataAnalyst: "Data analysis projects",
	companies:
		"Professional work (private company systems: described, no public links)",
};
const CATEGORY_ORDER = ["frontend", "backend", "dataAnalyst", "companies"];

export interface LlmsAbout {
	title_card?: string;
	subtitle?: string;
	description?: string;
}
export interface LlmsSkill {
	title?: string;
	images_topics?: string[];
}
export interface LlmsExperience {
	work?: string | null;
	title?: string;
	description?: string;
	time?: string;
	location?: string;
}
export interface LlmsEducation {
	institution?: string;
	subtitle?: string;
	description?: string;
	period?: string;
}
export interface LlmsProfile {
	about: LlmsAbout | null;
	skills: LlmsSkill[];
	experience: LlmsExperience[];
	education: LlmsEducation[];
	/** Cuantas opiniones publicadas hay; `null` si no se pudo saber. */
	opinions: number | null;
}

export const EMPTY_PROFILE: LlmsProfile = {
	about: null,
	skills: [],
	experience: [],
	education: [],
	opinions: null,
};

export interface LlmsInput {
	origin: string;
	locales: readonly string[];
	defaultLocale: string;
	description: string;
	contact: { github_url: string; linkedin_url: string; email?: string };
	/** URL publica del PDF del curriculum, si hay uno cargado. */
	cvUrl: string | null;
	projects: readonly Projects[];
	/** Acerca de, habilidades, experiencia, educacion y opiniones (opcional). */
	profile?: LlmsProfile;
	/** `index` = lo esencial; `full` = ademas los textos completos de cada cosa. */
	mode?: "index" | "full";
}

const techList = (topics: unknown): string =>
	Array.isArray(topics)
		? [...new Set(topics.filter((t) => typeof t === "string"))]
				.map((t) => techName(t))
				.join(", ")
		: "";

/** Por tecnologia, los proyectos que la usan; las mas usadas primero. */
const technologyUsage = (
	projects: readonly Projects[],
): { name: string; titles: string[] }[] => {
	const byTech = new Map<string, string[]>();
	for (const p of projects) {
		const title = cleanText(p.title, 100) || p.slug;
		const topics = Array.isArray(p.images_topics) ? p.images_topics : [];
		for (const name of new Set(
			topics.filter((t) => typeof t === "string").map((t) => techName(t)),
		)) {
			byTech.set(name, [...(byTech.get(name) ?? []), title]);
		}
	}
	return [...byTech.entries()]
		.map(([name, titles]) => ({ name, titles }))
		.sort(
			(a, b) =>
				b.titles.length - a.titles.length || a.name.localeCompare(b.name),
		);
};

/** Empresa de una experiencia: `work` o, si falta, lo que va antes del " · " de la descripcion. */
const companyOf = (e: LlmsExperience): string =>
	cleanText(e.work, 80) ||
	cleanText((e.description ?? "").split(/\s[·-]\s/)[0], 80);

/** Direccion larga de una oficina: no se publica; "Mexico City" y similares si. */
const placeOf = (e: LlmsExperience): string => {
	const place = cleanText(e.location, 100);
	return place.length <= 60 ? place : "";
};

/** Como esta hecho este sitio. Es verdad por construccion: sale de la arquitectura del repo. */
const SITE_STACK = [
	"Frontend: Astro (server-side rendering) with React islands, Tailwind CSS, shadcn/ui and GSAP animations, deployed on Cloudflare Workers.",
	"Content API: Hono on Cloudflare Workers, with Cloudflare D1 (SQLite) for data and Cloudflare R2 for images and the résumé PDF, served from the custom domain media.khelde.dev.",
	"CMS: a separate headless admin panel protected by Cloudflare Access; the site only reads and writes public content through its own API proxy.",
	"Quality and security: TypeScript, Zod validation, Vitest, Playwright and axe (WCAG 2.1 AA), Biome, GitHub Actions CI/CD, CodeQL, gitleaks, Content Security Policy with hashes and Cloudflare Turnstile on public forms.",
];

export const buildLlmsTxt = ({
	origin,
	locales,
	defaultLocale,
	description,
	contact,
	cvUrl,
	projects,
	profile = EMPTY_PROFILE,
	mode = "index",
}: LlmsInput): string => {
	const full = mode === "full";
	const lines: string[] = [
		"# Erick Miguel González Rivera (muke78, Khelde)",
		"",
		`> ${cleanText(description, 400)}`,
		"",
		"Erick Miguel González Rivera is also known as Erick González, muke78 (his GitHub username) and Khelde (his studio and this domain). He is an Information Technology Engineer and full-stack developer based in Mexico City, Mexico.",
		"",
	];

	const about = profile.about;
	if (about && (about.description || about.title_card)) {
		lines.push("## About", "");
		const headline = [about.title_card, about.subtitle]
			.map((t) => cleanText(t, 160))
			.filter(Boolean)
			.join(" ");
		if (headline) lines.push(`- ${headline}`);
		const bio = cleanText(about.description, full ? MAX_FULL : 600);
		if (bio) lines.push(`- ${bio}`);
		lines.push("");
	}

	const skills = profile.skills.filter(
		(s) => cleanText(s.title) && (s.images_topics?.length ?? 0) > 0,
	);
	if (skills.length > 0) {
		lines.push("## Skills and technologies", "");
		for (const s of skills) {
			lines.push(`- ${cleanText(s.title, 80)}: ${techList(s.images_topics)}`);
		}
		lines.push("");
	}

	const usage = technologyUsage(projects);
	if (usage.length > 0) {
		lines.push(
			"## Technologies used in real projects",
			"",
			"Each line is computed from the project list below: technology, number of projects and where it was used.",
			"",
		);
		for (const { name, titles } of full ? usage : usage.slice(0, 40)) {
			const shown = full ? titles : titles.slice(0, 4);
			const more = titles.length - shown.length;
			lines.push(
				`- ${name} (${titles.length} ${titles.length === 1 ? "project" : "projects"}): ${shown.join("; ")}${more > 0 ? `; and ${more} more` : ""}`,
			);
		}
		lines.push("");
	}

	if (profile.experience.length > 0) {
		lines.push("## Experience", "");
		for (const e of profile.experience) {
			const role = cleanText(e.title, 160);
			if (!role) continue;
			const company = companyOf(e);
			const place = placeOf(e);
			lines.push(
				`- ${role}${company ? ` at ${company}` : ""}${
					e.time ? ` (${cleanText(e.time, 40)})` : ""
				}${place ? `, ${place}` : ""}`,
			);
		}
		lines.push("");
	}

	if (profile.education.length > 0) {
		lines.push("## Education", "");
		for (const e of profile.education) {
			const head = [e.subtitle, e.institution]
				.map((t) => cleanText(t, 120))
				.filter(Boolean)
				.join(", ");
			if (!head) continue;
			lines.push(`- ${head}${e.period ? ` (${cleanText(e.period, 40)})` : ""}`);
			if (full) {
				const detail = cleanText(e.description, MAX_FULL);
				if (detail) lines.push(`  ${detail}`);
			}
		}
		lines.push("");
	}

	if (profile.opinions !== null && profile.opinions > 0) {
		lines.push(
			"## Opinions",
			"",
			`- [${profile.opinions} public opinions](${origin}/${defaultLocale}/home#opinions) from colleagues and clients, each with name, role and country. Visitors can add theirs on the same page.`,
			"",
		);
	}

	lines.push(
		"## Pages",
		"",
		...locales.map((l) => `- [Home (${l})](${origin}/${l}/home)`),
		`- [Contact form](${origin}/${defaultLocale}/home#contact): the form lives on the home page`,
		"",
		"## Contact and profiles",
		"",
	);

	const github = httpsUrl(contact.github_url);
	const linkedin = httpsUrl(contact.linkedin_url);
	if (github) lines.push(`- [GitHub](${github})`);
	if (linkedin) lines.push(`- [LinkedIn](${linkedin})`);
	const email = cleanText(contact.email, 254);
	if (email) lines.push(`- Email: ${email}`);
	const cv = httpsUrl(cvUrl);
	if (cv) lines.push(`- [Résumé / CV (PDF)](${cv})`);
	lines.push("");

	const groups = CATEGORY_ORDER.map((category) => ({
		category,
		items: projects.filter((p) => p.category === category),
	})).filter((g) => g.items.length > 0);

	if (groups.length > 0) {
		lines.push("## Projects", "");
		for (const { category, items } of groups) {
			lines.push(`### ${CATEGORY_TITLES[category] ?? category}`, "");
			for (const p of items) {
				const title = cleanText(p.title, 100) || p.slug;
				const slug = encodeURIComponent(p.slug);
				const rawSummary = cleanText(p.summary, MAX_SUMMARY);
				// "Stack:" va despues de una frase completa, no pegado a medias.
				const summary = /[.!?…]$/.test(rawSummary)
					? rawSummary
					: rawSummary && p.images_topics?.length
						? `${rawSummary}.`
						: rawSummary;
				const stack = techList(p.images_topics);
				const live = httpsUrl(p.link_web);
				const repo = httpsUrl(p.link_repo);
				const extras = [
					live ? `[live](${live})` : "",
					repo ? `[source](${repo})` : "",
				]
					.filter(Boolean)
					.join(", ");
				lines.push(
					`- [${title}](${origin}/${LLMS_LOCALE}/project/${slug})${
						summary ? `: ${summary}` : ""
					}${stack ? ` Stack: ${stack}.` : ""}${extras ? ` (${extras})` : ""}`,
				);
				const detail = cleanText(p.description, MAX_FULL);
				if (full && detail && detail !== summary) lines.push(`  ${detail}`);
			}
			lines.push("");
		}
	}

	lines.push("## How this website is built", "");
	for (const item of SITE_STACK) lines.push(`- ${item}`);
	lines.push("");

	lines.push(
		"## Notes",
		"",
		`- Default language: ${defaultLocale}. Every page exists in ${locales.join(", ")}; texts in this file are in English.`,
		`- [Sitemap](${origin}/sitemap-index.xml)`,
		full
			? `- [Short index](${origin}/llms.txt)`
			: `- [Full text of every project, role and study](${origin}/llms-full.txt)`,
		"",
	);
	return lines.join("\n");
};

let cached: { value: Projects[]; at: number } | null = null;

/** Proyectos publicados (en ingles). Si el backend no responde, el ultimo valor bueno o nada. */
export const getProjectsForLlms = async (
	now = Date.now(),
): Promise<Projects[]> => {
	if (cached && now - cached.at < PROJECTS_TTL_MS) return cached.value;
	try {
		const { data } = await api.get<{ data?: { rows?: Projects[] } }>(
			`/projects?currentLocale=${LLMS_LOCALE}`,
			{ timeoutMs: PROJECTS_TIMEOUT_MS },
		);
		const rows = data?.data?.rows;
		if (!Array.isArray(rows)) throw new Error("proyectos no validos");
		cached = { value: rows, at: now };
		return rows;
	} catch {
		return cached?.value ?? [];
	}
};

/**
 * Solo se guardan valores ya resueltos, nunca promesas: en Workers una promesa creada
 * por una peticion y esperada por otra se cancela cuando la primera termina.
 */
const profileCache = new Map<string, { value: unknown; at: number }>();

const loadPart = async <T>(
	key: string,
	path: string,
	pick: (body: unknown) => T | undefined,
	fallback: T,
	now: number,
): Promise<T> => {
	const hit = profileCache.get(key);
	if (hit && now - hit.at < PROJECTS_TTL_MS) return hit.value as T;
	try {
		const { data } = await api.get<{ data?: unknown }>(path, {
			timeoutMs: PROJECTS_TIMEOUT_MS,
		});
		const value = pick(data?.data);
		if (value === undefined) throw new Error(`${key} no valido`);
		profileCache.set(key, { value, at: now });
		return value;
	} catch {
		return (hit?.value as T | undefined) ?? fallback;
	}
};

const asList = <T>(body: unknown): T[] | undefined =>
	Array.isArray(body) ? (body as T[]) : undefined;

/** Acerca de, habilidades, experiencia, educacion y opiniones (en ingles); cada parte falla sola. */
export const getLlmsProfile = async (
	now = Date.now(),
): Promise<LlmsProfile> => {
	const q = `currentLocale=${LLMS_LOCALE}`;
	const [about, skills, experience, education, opinions] = await Promise.all([
		loadPart<LlmsAbout | null>(
			"about",
			`/about?${q}`,
			(b) => (b && typeof b === "object" ? (b as LlmsAbout) : undefined),
			null,
			now,
		),
		loadPart<LlmsSkill[]>(
			"skills",
			`/skills?${q}`,
			(b) => asList<LlmsSkill>(b),
			[],
			now,
		),
		loadPart<LlmsExperience[]>(
			"experience",
			`/experiences?${q}`,
			(b) => asList<LlmsExperience>(b),
			[],
			now,
		),
		loadPart<LlmsEducation[]>(
			"education",
			`/education?${q}`,
			(b) => asList<LlmsEducation>(b),
			[],
			now,
		),
		loadPart<number | null>(
			"opinions",
			"/comments",
			(b) => asList<unknown>(b)?.length,
			null,
			now,
		),
	]);
	return { about, skills, experience, education, opinions };
};

/** Solo para pruebas. */
export const resetProjectsCache = (): void => {
	cached = null;
	profileCache.clear();
};
