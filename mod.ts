import { Command } from "https://deno.land/x/cliffy@v0.24.2/command/mod.ts";
import { Row, Table } from "https://deno.land/x/cliffy@v0.24.2/table/mod.ts";
import { colors } from "https://deno.land/x/cliffy@v0.24.2/ansi/colors.ts";
import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";

import scrape from "./scrape_videos.ts";

type folge = {
  title: string;
  stand: string;
  url: string;
};

const { args } = await new Command()
  .name("dmax-scraper")
  .version("0.1.3")
  .description("Scrapes dmax.de to get all videos")
  .arguments("<url:string>")
  .parse(Deno.args);

const dmaxVideos = await fetch(args[0]);

if (!dmaxVideos.ok) {
  throw "Website not found";
}

const dom = new DOMParser().parseFromString(
  await dmaxVideos.text(),
  "text/html",
)!;

const title = dom.querySelector("h1.ott__show-title")?.textContent.trim();
const serie = new Map<string, folge[]>();

scrape(dom, serie);

await Deno.mkdir(`./${title}`).catch(() => {});

const table = new Table().header(
  Row.from(["stat", "S:E", "Title"]).border(true),
);

console.clear();

const episodesNames: string[] = [];
for await (const season of Deno.readDir(`./${title}`)) {
  const seasonDir = `./${title}/${season.name}`;
  for await (const episode of Deno.readDir(seasonDir)) {
    if (episode.isFile) {
      episodesNames.push(episode.name);
    }
  }
}

const cmd = await Deno.run({ cmd: ["echo", "hello world"] });
console.log(await cmd.status());

let skip = false;
let error = false;
for await (const [season, videos] of serie) {
  await Deno.mkdir(`./${title}/${season}`).catch(() => {});

  for await (const video of videos) {
    const { url, title: titleV, stand } = video;
    const fileName = `${stand} - ${titleV}`;

    if (table.length != 0) {
      const t = table[table.length - 1];
      t[0] = colors.rgb24("", 0x16A34A);
      if (skip) {
        t[0] = colors.rgb24("", 0xFDE047);
      }
      if (error) {
        t[0] = colors.rgb24("", 0xB91C1C);
      }
      skip = false;
      error = false;
    }
    table.push([colors.rgb24("", 0xFDE047), stand, titleV]);

    console.clear();
    table.render();

    const found = episodesNames.find((e) => e.includes(fileName));
    if (found != undefined && !found.includes(".part")) {
      skip = true;
      continue;
    }

    const ytdl = Deno.run({
      cmd: [
        "youtube-dl",
        "-f",
        "bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio",
        url,
        "-o",
        `./${title}/${season}/${fileName}.%(ext)s`,
      ],
      stdout: "null",
      stderr: "null",
    });
    const status = await ytdl.status();
    if (!status.success) {
      error = true;
      continue;
    }
  }
}
