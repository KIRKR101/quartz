import { h } from "preact"

// LandingPage: configurable custom page at /home.
// and renders only the building blocks enabled in config:
//
//   - source: ./custom-plugins/landing-page
//     enabled: true
//     options:
//       image: { src: /images/cover.jpg, alt: A short description }
//       prose: [A welcome paragraph., Another paragraph.]
//       sections:                       # each block on/off, all default true
//         hero: true
//         stats: true
//         domains: true
//         recent: true
//         tags: true
//         explore: true
//       exploreLinks:                   # buttons in the explore row
//         random: true
//         timeline: true
//         directory: true              # legacy name for notes
//         orphans: true
//         tags: true
//       recentCount: 6
//       tagCount: 12
//
// Uses `h()` instead of JSX so the plugin needs no build step.

const DEFAULT_SECTIONS = {
  hero: true,
  stats: true,
  domains: true,
  recent: true,
  tags: true,
  explore: true,
}

const DEFAULT_LINKS = {
  random: true,
  timeline: true,
  directory: true,
  orphans: true,
  tags: true,
}

const EXCLUDED_SLUGS = new Set(["index", "home", "timeline", "orphans", "directory", "tags", "404"])

function relativeHref(currentSlug, targetSlug) {
  const depth = currentSlug.split("/").length - 1
  const prefix = depth === 0 ? "./" : "../".repeat(depth)
  const target =
    targetSlug === "index" || targetSlug.endsWith("/index")
      ? targetSlug.slice(0, -"index".length)
      : targetSlug
  return prefix + target
}

function isListable(d) {
  if (!d || typeof d.slug !== "string") return false
  if (d.unlisted === true) return false
  if (EXCLUDED_SLUGS.has(d.slug)) return false
  if (d.slug.endsWith("/index") || d.slug.startsWith("tags/")) return false
  return true
}

function fmtDate(d) {
  try {
    const dt = d instanceof Date ? d : new Date(d)
    return {
      iso: dt.toISOString(),
      label: dt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" }),
      time: dt.getTime(),
    }
  } catch {
    return null
  }
}

export default function LandingPage(userOpts) {
  const opts = userOpts ?? {}
  const sections = { ...DEFAULT_SECTIONS, ...(opts.sections ?? {}) }
  const links = { ...DEFAULT_LINKS, ...(opts.exploreLinks ?? {}) }
  const recentCount = opts.recentCount ?? 6
  const tagCount = opts.tagCount ?? 12

  function LandingBody(props) {
    if (props.fileData?.slug === "index" && opts.rootRedirect) {
      return h(
        "main",
        { class: "home-redirect" },
        h("p", null, "Opening home… "),
        h("a", { href: "./home" }, "Continue"),
        h("script", { dangerouslySetInnerHTML: { __html: "location.replace('./home')" } }),
      )
    }

    const cur = props.fileData?.slug ?? "index"
    const image = typeof opts.image === "string" ? { src: opts.image } : opts.image
    const prose = Array.isArray(opts.prose) ? opts.prose : opts.prose ? [opts.prose] : []
    const href = (target) => relativeHref(cur, target)

    const pages = (Array.isArray(props.allFiles) ? props.allFiles : []).filter(isListable)

    const tagCounts = new Map()
    const domainCounts = new Map()
    for (const p of pages) {
      for (const t of p.frontmatter?.tags ?? []) {
        tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1)
      }
      const seg = p.slug.includes("/") ? p.slug.split("/")[0] : "(top level)"
      domainCounts.set(seg, (domainCounts.get(seg) ?? 0) + 1)
    }
    const topTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, tagCount)
    const domains = [...domainCounts.entries()].sort((a, b) => b[1] - a[1])

    const recent = sections.recent
      ? pages
          .map((p) => ({ p, d: p.dates?.modified ? fmtDate(p.dates.modified) : null }))
          .filter((r) => r.d)
          .sort((a, b) => b.d.time - a.d.time)
          .slice(0, recentCount)
      : []

    const lookup = {}
    for (const p of pages) lookup[p.slug] = href(p.slug)
    const shuffleJs = `var R=${JSON.stringify(lookup).replace(/</g, "\\u003c")};var K=Object.keys(R);if(K.length){location.href=R[K[Math.floor(Math.random()*K.length)]]}`

    const exploreButtons = []
    if (links.random)
      exploreButtons.push(
        h(
          "button",
          { class: "btn cursor-pointer", type: "button", onclick: shuffleJs },
          "Surprise me →",
        ),
      )
    if (links.timeline)
      exploreButtons.push(h("a", { class: "btn", href: href("timeline") }, "Timeline"))
    if (links.orphans)
      exploreButtons.push(h("a", { class: "btn", href: href("orphans") }, "Unlinked notes"))
    // Keep the main notes index in the hero so it is always one click away.
    if (links.tags)
      exploreButtons.push(h("a", { class: "btn", href: href("tags/index") }, "All tags"))
    if (links.directory)
      exploreButtons.push(h("a", { class: "btn", href: href("directory") }, "Directory"))

    return h(
      "main",
      { class: "home", "data-testid": "landing-hero-custom" },
      sections.hero && (prose.length || image?.src)
        ? h(
            "div",
            { class: `hero${image?.src ? " with-image" : ""}` },
            image?.src
              ? h("img", {
                  class: "hero-image",
                  src: image.src,
                  alt: image.alt ?? "",
                  loading: "eager",
                })
              : null,
            h(
              "div",
              { class: "hero-copy" },
              prose.length
                ? h(
                    "div",
                    { class: "prose", "data-section": "prose" },
                    prose.map((p) => h("p", null, String(p))),
                  )
                : null,
            ),
          )
        : null,

      sections.explore && exploreButtons.length
        ? h("div", { class: "row", "data-section": "explore" }, exploreButtons)
        : null,

      sections.stats
        ? h(
            "div",
            { class: "stats", "data-section": "stats" },
            h(
              "div",
              { class: "stat" },
              h("b", null, String(pages.length)),
              h("span", null, "Published notes"),
            ),
            h(
              "div",
              { class: "stat" },
              h("b", null, String(tagCounts.size)),
              h("span", null, "Tags"),
            ),
            h(
              "div",
              { class: "stat" },
              h("b", null, String(domains.length)),
              h("span", null, "Sections"),
            ),
          )
        : null,

      sections.domains
        ? [
            h("h2", null, "Browse by section"),
            h(
              "div",
              { class: "grid", "data-section": "domains" },
              domains.map(([name, count]) =>
                h(
                  "a",
                  {
                    class: "card",
                    href: href(name === "(top level)" ? "index" : `${name}/index`),
                  },
                  h("b", null, name),
                  h("span", null, `${count} note${count === 1 ? "" : "s"} →`),
                ),
              ),
            ),
          ]
        : null,

      sections.recent
        ? [
            h("h2", null, "Recently updated"),
            h(
              "ul",
              { class: "recent", "data-section": "recent" },
              recent.map(({ p, d }) =>
                h(
                  "li",
                  null,
                  h(
                    "a",
                    { class: "recent-row", href: href(p.slug) },
                    h("span", { class: "recent-title" }, p.frontmatter?.title ?? p.slug),
                    h("time", { dateTime: d.iso }, d.label),
                  ),
                ),
              ),
            ),
          ]
        : null,

      sections.tags && topTags.length
        ? [
            h("h2", null, "Popular tags"),
            h(
              "div",
              { class: "tags", "data-section": "tags" },
              topTags.map(([tag, count]) =>
                h("a", { class: "tag", href: href(`tags/${tag}`) }, `${tag} · ${count}`),
              ),
            ),
          ]
        : null,
    )
  }

  return {
    name: "LandingPage",
    priority: 20,
    match: ({ slug }) => slug === "home" || (slug === "index" && opts.rootRedirect === true),
    generate() {
      return [{ slug: "home", title: "Home", data: { unlisted: true } }]
    },
    layout: "landing",
    body: () => LandingBody,
  }
}
