import { describe, expect, it } from "vitest";
import {
	alternateLinks,
	buildStructuredData,
	PERSON_ALIASES,
	SITE_NAME,
} from "@/lib/structuredData";

const origin = new URL("https://khelde.dev");
const LOCALES = ["es", "en", "fr"] as const;

describe("alternateLinks", () => {
	it("el Home sale en los tres idiomas y x-default apunta al idioma por defecto", () => {
		const links = alternateLinks("/en/home", origin, LOCALES, "es");
		expect(links).toEqual([
			{ hreflang: "es", href: "https://khelde.dev/es/home" },
			{ hreflang: "en", href: "https://khelde.dev/en/home" },
			{ hreflang: "fr", href: "https://khelde.dev/fr/home" },
			{ hreflang: "x-default", href: "https://khelde.dev/es/home" },
		]);
	});

	it("el detalle de proyecto conserva el slug en cada idioma", () => {
		const links = alternateLinks(
			"/fr/project/backend-hono",
			origin,
			LOCALES,
			"es",
		);
		expect(links.map((l) => l.href)).toEqual([
			"https://khelde.dev/es/project/backend-hono",
			"https://khelde.dev/en/project/backend-hono",
			"https://khelde.dev/fr/project/backend-hono",
			"https://khelde.dev/es/project/backend-hono",
		]);
	});

	it("otras rutas (404, /api, la raiz) no llevan alternativas", () => {
		for (const path of ["/", "/404", "/api/projects", "/xx/home", "/es/otra"]) {
			expect(alternateLinks(path, origin, LOCALES, "es"), path).toEqual([]);
		}
	});
});

describe("buildStructuredData", () => {
	const input = {
		origin,
		locales: LOCALES,
		name: "Erick González",
		jobTitle: "Full-Stack Developer",
		description: "Desc",
		imageUrl: "https://khelde.dev/logo-og.png",
		logoUrl: "https://khelde.dev/icon-192.png",
		sameAs: ["https://github.com/muke78"],
	};

	it("declara el sitio como Khelde, con la persona y su estudio en un solo grafo", () => {
		const data = buildStructuredData(input);
		const graph = data["@graph"] as Record<string, unknown>[];
		const byType = (type: string) => graph.find((n) => n["@type"] === type);
		expect(data["@context"]).toBe("https://schema.org");
		expect(byType("WebSite")).toMatchObject({
			name: SITE_NAME,
			url: "https://khelde.dev/",
			alternateName: expect.arrayContaining(["khelde.dev"]),
		});
		expect(byType("Person")).toMatchObject({
			name: "Erick González",
			alternateName: PERSON_ALIASES,
			sameAs: ["https://github.com/muke78"],
			knowsAbout: expect.arrayContaining(["NestJS", "Cloudflare Workers"]),
		});
		expect(byType("Organization")).toMatchObject({
			name: "Khelde",
			founder: { "@id": "https://khelde.dev/#person" },
		});
		expect(byType("BreadcrumbList")).toBeUndefined();
	});

	it("agrega las migas de pan solo si se las dan", () => {
		const data = buildStructuredData({
			...input,
			breadcrumbs: [
				{ name: "Khelde", url: "https://khelde.dev/es/home" },
				{ name: "Proyecto", url: "https://khelde.dev/es/project/x" },
			],
		});
		const crumbs = (data["@graph"] as Record<string, unknown>[]).find(
			(n) => n["@type"] === "BreadcrumbList",
		) as { itemListElement: { position: number; name: string }[] };
		expect(crumbs.itemListElement.map((i) => [i.position, i.name])).toEqual([
			[1, "Khelde"],
			[2, "Proyecto"],
		]);
	});
});
