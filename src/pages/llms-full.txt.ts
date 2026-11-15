import type { APIRoute } from "astro";
import { llmsResponse } from "@/lib/llmsResponse";

/** llms-full.txt: lo mismo que llms.txt, con los textos completos de proyectos, estudios y bio. */
export const GET: APIRoute = ({ site, url }) => llmsResponse(site, url, "full");
