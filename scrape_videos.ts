import {
  Element,
  HTMLDocument,
} from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";

type folge = {
  title: string;
  stand: string;
  url: string;
};

export default function scrape(
  dom: HTMLDocument,
  serie: Map<string, folge[]>,
) {
  for (const section of dom.querySelectorAll("section")) {
    const e = <Element> section;
    const title = e.querySelector("h2>span")?.textContent.split("|")[0].trim()!;

    if (title?.includes("Clips")) {
      continue;
    }

    const videos: folge[] = [];

    for (const video of e.querySelectorAll("a")) {
      const e = <Element> video;
      const url = e.getAttribute("href")!;
      const title = e.querySelector("h3")?.textContent.trim()!;
      const stand = e.querySelector("div.card-season")?.textContent.trim()!;

      videos.push({ title, stand, url });
    }

    serie.set(title, videos);
  }
}
