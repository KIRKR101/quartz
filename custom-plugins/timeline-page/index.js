import { h } from "preact"

// TimelinePage: virtual /timeline route. No content file needed — generate()
// synthesizes the page, and the body renders every published note sorted by
// last-modified date, grouped under month headers.

const VIRTUAL_SLUGS = new Set(["index", "timeline", "orphans", "directory", "tags", "404"])

function isListable(d) {
  if (!d || typeof d.slug !== "string") return false
  if (d.unlisted === true) return false
  if (VIRTUAL_SLUGS.has(d.slug)) return false
  if (d.slug.endsWith("/index") || d.slug.startsWith("tags/")) return false
  return true
}

function TimelineBody(props) {
  const pages = (Array.isArray(props.allFiles) ? props.allFiles : [])
    .filter(isListable)
    .map((p) => {
      const raw = p.dates?.modified
      const dt = raw instanceof Date ? raw : new Date(raw ?? 0)
      return { p, time: isNaN(dt.getTime()) ? 0 : dt.getTime(), date: dt }
    })
    .filter((r) => r.time > 0)
    .sort((a, b) => b.time - a.time)

  // Group under "Month Year" headers, preserving recency order.
  const groups = []
  const byKey = new Map()
  for (const r of pages) {
    const key = r.date.toLocaleDateString("en-US", { year: "numeric", month: "long" })
    if (!byKey.has(key)) {
      const g = { key, items: [] }
      byKey.set(key, g)
      groups.push(g)
    }
    byKey.get(key).items.push(r)
  }

  return h(
    "main",
    { class: "tl", "data-testid": "timeline-page" },
    groups.map((g) =>
      h(
        "section",
        null,
        h("h2", null, g.key),
        h(
          "ul",
          null,
          g.items.map(({ p, date }) =>
            h(
              "li",
              null,
              h(
                "a",
                { class: "tl-row", href: "./" + p.slug },
                h(
                  "time",
                  { dateTime: date.toISOString() },
                  date.toLocaleDateString("en-US", { month: "short", day: "2-digit" }),
                ),
                h("span", { class: "tl-title" }, p.frontmatter?.title ?? p.slug),
                p.slug.includes("/") ? h("span", { class: "dom" }, p.slug.split("/")[0]) : null,
              ),
            ),
          ),
        ),
      ),
    ),
  )
}

export default function TimelinePage() {
  return {
    name: "TimelinePage",
    priority: 10,
    match: () => false,
    generate() {
      return [{ slug: "timeline", title: "Timeline", data: { unlisted: true } }]
    },
    layout: "timeline",
    body: () => TimelineBody,
  }
}
