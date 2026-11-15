import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("astro:env/client", () => ({ VITE_API_URL: "https://api.test/api" }));
vi.mock("astro:env/server", () => ({ API_SECRET_TOKEN: "test-token-value" }));
const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/lib/api", () => ({ api: { get } }));

const { GET } = await import("@/pages/sitemap-projects.xml");
const { resetProjectsCache } = await import("@/lib/llmsTxt");

const call = (site?: URL) =>
	GET({
		site,
		url: new URL("https://fallback.example/x"),
	} as never) as Promise<Response>;

beforeEach(() => {
	resetProjectsCache();
	get.mockReset();
});

describe("sitemap-projects.xml", () => {
	it("lista cada proyecto en los tres idiomas con sus alternativas hreflang", async () => {
		get.mockResolvedValue({
			data: { data: { rows: [{ slug: "backend-hono" }, { slug: "a&b" }] } },
		});
		const res = await call(new URL("https://khelde.dev"));
		const xml = await res.text();
		expect(res.headers.get("Content-Type")).toContain("application/xml");
		expect(xml).toContain(
			"<loc>https://khelde.dev/es/project/backend-hono</loc>",
		);
		expect(xml).toContain(
			"<loc>https://khelde.dev/fr/project/backend-hono</loc>",
		);
		expect(xml).toContain(
			'hreflang="x-default" href="https://khelde.dev/es/project/backend-hono"',
		);
		expect([...xml.matchAll(/<url>/g)]).toHaveLength(6);
		// el slug se codifica en la URL y el XML queda bien formado
		expect(xml).toContain("/es/project/a%26b</loc>");
		expect(xml).not.toContain("a&b<");
	});

	it("sale vacio, sin error, si el backend no responde", async () => {
		get.mockRejectedValue(new Error("503"));
		const res = await call(new URL("https://khelde.dev"));
		expect(res.status).toBe(200);
		expect(await res.text()).not.toContain("<url>");
	});

	it("sin `site` usa el origen de la peticion", async () => {
		get.mockResolvedValue({ data: { data: { rows: [{ slug: "x" }] } } });
		expect(await (await call()).text()).toContain(
			"https://fallback.example/es/project/x",
		);
	});
});
