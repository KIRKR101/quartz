import { h } from "preact"

// DirectoryPage: virtual /directory route. An A–Z index of every published
// note with letter jump-links — the "view everything" page for readers who
// don't want to go through search or folder trees.

const VIRTUAL_SLUGS = new Set(["index", "timeline", "orphans", "directory", "tags", "404"])

function isListable(d) {
  if (!d || typeof d.slug !== "string") return false
  if (d.unlisted === true) return false
  if (VIRTUAL_SLUGS.has(d.slug)) return false
  if (d.slug.endsWith("/index") || d.slug.startsWith("tags/")) return false
  return true
}

function DirectoryBody(props) {
  const pages = (Array.isArray(props.allFiles) ? props.allFiles : []).filter(isListable)

  const groups = new Map() // letter -> entries
  for (const p of pages) {
    const title = p.frontmatter?.title ?? p.slug
    const first = (title.trim()[0] ?? "#").toUpperCase()
    const letter = first >= "A" && first <= "Z" ? first : "#"
    if (!groups.has(letter)) groups.set(letter, [])
    groups.get(letter).push({ p, title })
  }
  const letters = [...groups.keys()].sort()
  for (const entries of groups.values()) {
    entries.sort((a, b) => a.title.localeCompare(b.title))
  }

  return h(
    "main",
    { class: "dir", "data-testid": "directory-page" },
    h(
      "nav",
      { class: "jump" },
      letters.map((l) => h("a", { href: `#letter-${l}` }, l)),
    ),
    letters.map((l) =>
      h(
        "section",
        { id: `letter-${l}` },
        h("h2", null, l),
        h(
          "ul",
          null,
          groups
            .get(l)
            .map(({ p, title }) =>
              h(
                "li",
                null,
                h(
                  "a",
                  { class: "dir-row", href: "./" + p.slug },
                  h("span", { class: "dir-title" }, title),
                  h(
                    "span",
                    { class: "dom" },
                    p.slug.includes("/") ? p.slug.split("/")[0] : "top level",
                  ),
                ),
              ),
            ),
        ),
      ),
    ),
  )
}

export default function DirectoryPage() {
  return {
    name: "DirectoryPage",
    priority: 10,
    match: () => false,
    generate() {
      return [{ slug: "directory", title: "Directory", data: { unlisted: true } }]
    },
    layout: "directory",
    body: () => DirectoryBody,
  }
}
