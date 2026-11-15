import type { APIRoute } from "astro";
import { llmsResponse } from "@/lib/llmsResponse";

/** llms.txt (llmstxt.org): el indice para modelos de lenguaje y agentes. */
export const GET: APIRoute = ({ site, url }) =>
	llmsResponse(site, url, "index");
