import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("astro:env/client", () => ({
	VITE_API_URL: "https://api.test/api",
	PUBLIC_MEDIA_URL: "https://media.test",
}));
vi.mock("astro:env/server", () => ({ API_SECRET_TOKEN: "test-token-value" }));
vi.mock("@/lib/siteContact", () => ({
	getContact: vi.fn(async () => ({
		github_url: "https://github.com/muke78",
		linkedin_url: "https://www.linkedin.com/in/ejemplo/",
		linkedin_name: "Erick",
		phone: "+52 55 0000 0000",
		email: "erick@example.com",
	})),
}));
vi.mock("@/lib/siteCopy", () => ({
	getSiteCopy: vi.fn(async () => ({
		hero_image: "site/foto.webp",
		hero_image_alt: "x",
		hero_label: "x",
		hero_lead: "x",
		manifesto_text: "x",
		meta_description: "x",
		cv_pdf: "cv/erick.pdf",
	})),
}));
const reply = (path: string) => {
	if (path.startsWith("/projects")) {
		return {
			data: {
				data: {
					rows: [
						{
							slug: "mi-sitio",
							category: "frontend",
							title: "Mi sitio",
							summary: "Un sitio.",
							description: "Un sitio con una descripcion larga y completa.",
							images_topics: ["nest", "ts"],
							link_web: "https://example.com",
							link_repo: "https://github.com/muke78/mi-sitio",
						},
					],
				},
			},
		};
	}
	if (path.startsWith("/about")) {
		return {
			data: {
				data: {
					title_card: "Full-Stack Developer.",
					subtitle: "Autonomous",
					description: "Construyo aplicaciones completas.",
				},
			},
		};
	}
	if (path.startsWith("/skills")) {
		return {
			data: {
				data: [{ title: "Web Hosting", images_topics: ["cloudflare", "aws"] }],
			},
		};
	}
	if (path.startsWith("/experiences")) {
		return {
			data: {
				data: [
					{
						work: "Acme",
						title: "Developer",
						time: "2024 - Present",
						location: "Mexico City, Mexico",
					},
				],
			},
		};
	}
	if (path.startsWith("/education")) {
		return {
			data: {
				data: [
					{ institution: "UPVM", subtitle: "IT Engineering", period: "2018" },
				],
			},
		};
	}
	if (path.startsWith("/comments")) {
		return { data: { data: [{}, {}, {}] } };
	}
	throw new Error(`ruta no simulada: ${path}`);
};
vi.mock("@/lib/api", () => ({
	api: { get: vi.fn(async (path: string) => reply(path)) },
}));

const { GET } = await import("@/pages/llms.txt");
const { GET: GET_FULL } = await import("@/pages/llms-full.txt");
const { resetProjectsCache } = await import("@/lib/llmsTxt");
const { api } = await import("@/lib/api");

const call = (site: URL | undefined) =>
	GET({
		site,
		url: new URL("https://fallback.example/llms.txt"),
	} as never) as Promise<Response>;

beforeEach(() => resetProjectsCache());

describe("llms.txt", () => {
	it("empieza con un H1 y es texto plano, con caché corta", async () => {
		const res = await call(new URL("https://khelde.dev"));
		expect(res.headers.get("Content-Type")).toContain("text/plain");
		expect(res.headers.get("Cache-Control")).toContain("s-maxage");
		const body = await res.text();
		expect(body.split("\n")[0]).toMatch(/^# \S/);
	});

	it("lista las tres paginas de inicio con el dominio configurado", async () => {
		const body = await (await call(new URL("https://khelde.dev/"))).text();
		for (const lang of ["es", "en", "fr"]) {
			expect(body).toContain(`](https://khelde.dev/${lang}/home)`);
		}
		expect(body).toContain("https://khelde.dev/sitemap-index.xml");
	});

	it("sin `site` usa el origen de la peticion", async () => {
		const body = await (await call(undefined)).text();
		expect(body).toContain("https://fallback.example/es/home");
	});

	it("incluye perfiles, correo, curriculum y proyectos con sus enlaces", async () => {
		const body = await (await call(new URL("https://khelde.dev"))).text();
		expect(body).toContain("[GitHub](https://github.com/muke78)");
		expect(body).toContain("[LinkedIn](https://www.linkedin.com/in/ejemplo/)");
		expect(body).toContain("Email: erick@example.com");
		expect(body).toContain("(https://media.test/cv/erick.pdf)");
		expect(body).toContain(
			"[Mi sitio](https://khelde.dev/en/project/mi-sitio): Un sitio. Stack: NestJS, TypeScript. ([live](https://example.com/), [source](https://github.com/muke78/mi-sitio))",
		);
	});

	it("incluye acerca de, habilidades con nombres reales, experiencia, educacion y opiniones", async () => {
		const body = await (await call(new URL("https://khelde.dev"))).text();
		expect(body).toContain("## About");
		expect(body).toContain("Construyo aplicaciones completas.");
		expect(body).toContain("- Web Hosting: Cloudflare, AWS");
		expect(body).toContain(
			"- Developer at Acme (2024 - Present), Mexico City, Mexico",
		);
		expect(body).toContain("- IT Engineering, UPVM (2018)");
		expect(body).toContain(
			"[3 public opinions](https://khelde.dev/es/home#opinions)",
		);
		expect(body).toContain("Stack: NestJS, TypeScript.");
		expect(body).toContain("Cloudflare Workers");
	});

	it("llms-full.txt suma la descripcion completa y enlaza de vuelta al indice", async () => {
		const res = await (GET_FULL({
			site: new URL("https://khelde.dev"),
			url: new URL("https://khelde.dev/llms-full.txt"),
		} as never) as Promise<Response>);
		const body = await res.text();
		expect(res.headers.get("Content-Type")).toContain("text/plain");
		expect(body).toContain("Un sitio con una descripcion larga y completa.");
		expect(body).toContain("[Short index](https://khelde.dev/llms.txt)");
		const short = await (await call(new URL("https://khelde.dev"))).text();
		expect(short).not.toContain("descripcion larga y completa");
		expect(short).toContain(
			"[Full text of every project, role and study](https://khelde.dev/llms-full.txt)",
		);
	});

	it("no publica el telefono", async () => {
		const body = await (await call(new URL("https://khelde.dev"))).text();
		expect(body).not.toContain("55 0000");
	});

	it("sale igual, sin proyectos, si el backend no responde", async () => {
		vi.mocked(api.get).mockRejectedValue(new Error("503"));
		const res = await call(new URL("https://khelde.dev"));
		const body = await res.text();
		vi.mocked(api.get).mockImplementation(async (path: string) => reply(path));
		expect(res.status).toBe(200);
		expect(body).not.toContain("## Projects");
		expect(body).not.toContain("## About");
		expect(body).toContain("[GitHub]");
	});
});
