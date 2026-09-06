import fs from "node:fs/promises"
import fsSync from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { h } from "preact"

const root = path.dirname(fileURLToPath(import.meta.url))
const assetRoot = path.join(root, "assets", "media")
const imageExtensions = /\.(jpe?g|png|webp|avif|gif|svg)$/i
const artMetadata = JSON.parse(fsSync.readFileSync(path.join(root, "art.json"), "utf8"))

function files(dir, prefix = "") {
  const result = []
  for (const entry of fsSync.readdirSync(dir, { withFileTypes: true })) {
    const relative = path.join(prefix, entry.name)
    if (entry.isDirectory()) result.push(...files(path.join(dir, entry.name), relative))
    else if (imageExtensions.test(entry.name)) result.push(relative)
  }
  return result.sort((a, b) => a.localeCompare(b))
}

function entries() {
  const assets = new Map(
    files(assetRoot).map((source) => [path.basename(source, path.extname(source)), source]),
  )
  return artMetadata.flatMap((entry, index) => {
    const source = assets.get(path.basename(entry.source, path.extname(entry.source)))
    if (!source) return []
    return [
      {
        ...entry,
        date: entry.date?.label ?? "",
        source,
        url: `/static/art/${source.replaceAll(path.sep, "/")}`,
        number: String(index + 1).padStart(3, "0"),
      },
    ]
  })
}

function ArtBody(props) {
  const entry = props.fileData?.artEntry
  if (entry) {
    return h(
      "main",
      { class: "art-detail" },
      h(
        "figure",
        null,
        h("img", { src: entry.url, alt: entry.title, loading: "eager" }),
        h("figcaption", null, [entry.title, entry.artist, entry.date].filter(Boolean).join(", ")),
      ),
    )
  }

  const art = props.fileData?.artEntries ?? []
  const root = props.fileData?.artRoot ?? "art-gallery"
  return h(
    "main",
    { class: "art-page" },
    h("p", { class: "art-subtitle" }, "A collection of artworks"),
    h(
      "nav",
      { class: "art-cache", "aria-label": "Artworks" },
      art.map((item) =>
        h(
          "a",
          {
            class: "art-row",
            href: `./${root}/${item.id}`,
            "data-preview": item.url,
            "aria-label": `${item.title}, ${item.artist}`,
          },
          h("span", { class: "art-number" }, item.number),
          h("span", null, item.title),
          h("span", { class: "art-artist" }, item.artist),
          h("span", { class: "art-date" }, item.date),
        ),
      ),
    ),
    h("div", { id: "art-preview", "aria-hidden": "true" }),
  )
}

ArtBody.css = `
.art-subtitle { margin: 0 0 24px; font-size: 14px; opacity: .72; }
.art-cache { border-top: 1px solid rgba(52,46,38,.18); }
.art-row { display: grid; grid-template-columns: 38px 1fr 1fr 80px; gap: 12px; padding: 12px 0; color: inherit; border-bottom: 1px solid rgba(52,46,38,.18); text-decoration: none; font-family: Inter, sans-serif; }
.art-row:hover, .art-row:focus-visible { color: #7a7a7a; }
.art-number { align-self: center; font: 11px monospace; opacity: .62; }
.art-artist, .art-date { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 14px; }
.art-date { font: 11px "Cascadia Mono", monospace; opacity: .62; }
.art-page #art-preview { position: fixed; z-index: 2; max-width: min(280px, 34vw); max-height: min(280px, 34vh); opacity: 0; pointer-events: none; transition: opacity .15s; }
.art-page #art-preview.visible { opacity: 1; }
.art-page #art-preview img { display: block; max-width: min(280px, 34vw); max-height: min(280px, 34vh); box-shadow: 0 4px 24px #28241e33; }
.art-detail { width: 100%; max-width: 100%; box-sizing: border-box; overflow: hidden; padding: 0 16px 8px; }
.art-detail figure { width: fit-content; max-width: 100%; margin: 0 auto; }
.art-detail img { display: block; width: auto; max-width: 100%; height: auto; max-height: 82vh; background: #fdfcfa; }
.art-detail figcaption { width: auto; margin-top: 12px; font-size: 14px; line-height: 1.5; color: #111; text-align: left; padding-top: 4px; font-family: Inter, system-ui, -apple-system, Helvetica, Arial, sans-serif !important; }
@media (max-width: 600px) { .art-row { grid-template-columns: 34px 1fr 70px; } .art-artist { grid-column: 2; } .art-date { grid-column: 3; grid-row: 1 / span 2; } .art-detail img { max-height: 70vh; } }
`

ArtBody.afterDOMLoaded = `
const preview = document.querySelector("#art-preview")
let activeRow
function move(event) {
  if (!preview) return
  const gap = 16, box = preview.getBoundingClientRect()
  const left = event.clientX + gap + box.width <= innerWidth ? event.clientX + gap : event.clientX - box.width - gap
  const top = event.clientY + gap + box.height <= innerHeight ? event.clientY + gap : event.clientY - box.height - gap
  preview.style.left = Math.max(0, Math.min(left, innerWidth - box.width)) + "px"
  preview.style.top = Math.max(0, Math.min(top, innerHeight - box.height)) + "px"
}
document.addEventListener("pointerover", (event) => {
  const row = event.target.closest?.(".art-row")
  if (!row || row === activeRow || !preview) return
  const image = document.createElement("img")
  image.src = row.dataset.preview
  image.alt = ""
  preview.replaceChildren(image)
  preview.classList.add("visible")
  activeRow = row
  image.addEventListener("load", () => move(event), { once: true })
})
document.addEventListener("pointermove", (event) => activeRow && move(event))
document.addEventListener("pointerout", (event) => {
  const row = event.target.closest?.(".art-row")
  if (row && !row.contains(event.relatedTarget)) {
    preview?.classList.remove("visible")
    activeRow = undefined
  }
})
`

export default function ArtPage(options = {}) {
  const explorer = { enabled: false, label: "Art", ...options.explorer }
  const slug = options.slug ?? "art"
  return {
    name: "ArtPage",
    priority: 30,
    match: ({ slug: currentSlug }) => currentSlug === slug || currentSlug.startsWith(`${slug}/`),
    generate() {
      const art = entries()
      return [
        {
          slug,
          title: explorer.label,
          data: { unlisted: !explorer.enabled, artEntries: art, artRoot: slug },
        },
        ...art.map((entry) => ({
          slug: `${slug}/${entry.id}`,
          title: entry.title,
          data: { unlisted: true, artEntry: entry },
        })),
      ]
    },
    layout: "content",
    body: () => ArtBody,
    async emit(ctx) {
      const output = path.join(ctx.argv.output, "static", "art")
      await fs.mkdir(output, { recursive: true })
      for (const source of files(assetRoot)) {
        const target = path.join(output, source)
        await fs.mkdir(path.dirname(target), { recursive: true })
        await fs.copyFile(path.join(assetRoot, source), target)
      }
      return []
    },
    getQuartzComponents() {
      return []
    },
  }
}
