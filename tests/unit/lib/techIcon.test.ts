import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FALLBACK_ICON, techIconUrl } from "@/lib/techIcon";
import { TECH_ICONS } from "@/lib/techIconNames";

const dir = "public/icons";
const files = readdirSync(dir).filter((f) => f.endsWith(".svg"));

describe("techIconUrl", () => {
	it("apunta al SVG local y normaliza el nombre", () => {
		expect(techIconUrl("TypeScript")).toBe("/icons/typescript.svg");
		expect(techIconUrl("  Zustand ")).toBe("/icons/zustand.svg");
	});

	it("un nombre sin icono (o con rutas) recibe el respaldo", () => {
		for (const bad of ["", "no-existe", "../x", "a/b", "a?b"]) {
			expect(techIconUrl(bad)).toBe(FALLBACK_ICON);
		}
	});
});

describe("public/icons", () => {
	it("la lista de nombres coincide con los archivos", () => {
		const onDisk = files
			.map((f) => f.slice(0, -4))
			.filter((n) => !n.startsWith("_"))
			.sort();
		expect([...TECH_ICONS].sort()).toEqual(onDisk);
		expect(files).toContain("_fallback.svg");
	});

	it("cada archivo es un SVG sin scripts ni recursos externos", () => {
		for (const f of files) {
			const svg = readFileSync(`${dir}/${f}`, "utf8");
			expect(svg, f).toMatch(/<svg[\s>]/);
			expect(svg, f).not.toMatch(
				/<script|onload=|onerror=|javascript:|href="https?:/i,
			);
		}
	});
});
