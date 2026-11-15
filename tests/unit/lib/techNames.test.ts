import { describe, expect, it } from "vitest";
import { TECH_ICONS } from "@/lib/techIconNames";
import { TECH_NAMES, techName } from "@/lib/techNames";

describe("techName", () => {
	it("da el nombre real de la tecnologia", () => {
		expect(techName("nest")).toBe("NestJS");
		expect(techName("ts")).toBe("TypeScript");
		expect(techName("pbi")).toBe("Power BI");
		expect(techName(" Nodejs ")).toBe("Node.js");
	});

	it("un slug desconocido sale con la primera letra en mayuscula", () => {
		expect(techName("fortran")).toBe("Fortran");
	});

	it("cada icono del sitio tiene su nombre y no sobran nombres sin icono", () => {
		expect(Object.keys(TECH_NAMES).sort()).toEqual([...TECH_ICONS].sort());
	});
});
