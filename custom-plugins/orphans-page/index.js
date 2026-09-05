import { h } from "preact"

// OrphansPage: virtual /orphans route. Rebuilds the incoming-link graph from
// every page's outgoing `links` (written by the crawl-links transformer) and
// lists notes nobody links to — the garden's disconnected pages — alongside
// the most-linked hub pages. A maintenance view for the site owner.

const VIRTUAL_SLUGS = new Set(["index", "timeline", "orphans", "directory", "tags", "404"])

function isListable(d) {
  if (!d || typeof d.slug !== "string") return false
  if (d.unlisted === true) return false
  if (VIRTUAL_SLUGS.has(d.slug)) return false
  if (d.slug.endsWith("/index") || d.slug.startsWith("tags/")) return false
  return true
}

// crawl-links stores SimpleSlugs ("a/b", index stripped); page slugs are
// FullSlugs ("a/b", ".../index"). Normalize both for comparison.
function norm(s) {
  return String(s).replace(/\/index$/, "")
}

function OrphansBody(props) {
  const pages = (Array.isArray(props.allFiles) ? props.allFiles : []).filter(isListable)

  const incoming = new Map() // normalized slug -> count
  for (const p of pages) {
    for (const target of p.links ?? []) {
      const key = norm(target)
      incoming.set(key, (incoming.get(key) ?? 0) + 1)
    }
  }

  const orphans = pages.filter((p) => (incoming.get(norm(p.slug)) ?? 0) === 0)
  const hubs = [...pages]
    .map((p) => ({ p, n: incoming.get(norm(p.slug)) ?? 0 }))
    .filter((r) => r.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, 8)

  return h(
    "main",
    { class: "or", "data-testid": "orphans-page" },
    h("h2", null, `Orphans (${orphans.length})`),
    orphans.length
      ? h(
          "ul",
          null,
          orphans.map((p) =>
            h(
              "li",
              null,
              h("a", { href: "./" + p.slug }, p.frontmatter?.title ?? p.slug),
              h("span", { class: "n" }, p.slug),
            ),
          ),
        )
      : h("p", null, "Fully connected garden. Nothing to fix."),
    h("h2", null, "Most-linked hubs"),
    h(
      "ul",
      null,
      hubs.map(({ p, n }) =>
        h(
          "li",
          null,
          h("a", { href: "./" + p.slug }, p.frontmatter?.title ?? p.slug),
          h("span", { class: "n" }, `${n} incoming`),
        ),
      ),
    ),
    h(
      "p",
      { class: "tip" },
      "Tip: link orphans from a relevant note (or the homepage sections) to weave them into the garden.",
    ),
  )
}

export default function OrphansPage() {
  return {
    name: "OrphansPage",
    priority: 10,
    match: () => false,
    generate() {
      return [{ slug: "orphans", title: "Unlinked notes", data: { unlisted: true } }]
    },
    layout: "orphans",
    body: () => OrphansBody,
  }
}
