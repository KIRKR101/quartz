// Turns an image followed directly by its caption into a <figure> with a
// <figcaption>. The caption is recognised as: the image and caption sitting in
// the same paragraph (adjacent lines, no blank line between), the caption part
// being one fully italicised span, at most 40 words, and
// without any block-level Markdown.

const MAX_CAPTION_WORDS = 40
const BLOCK_LEVEL_SELECTOR =
  "p, div, ul, ol, li, dl, dt, dd, blockquote, pre, table, hr, h1, h2, h3, h4, h5, h6, figure, section, article, aside, nav, header, footer, details, summary, form, iframe"

function isWhitespaceText(node: Node): boolean {
  return node.nodeType === Node.TEXT_NODE && (node.textContent ?? "").trim() === ""
}

function isPureEmphasis(nodes: Node[]): boolean {
  const content = nodes.filter((node) => !isWhitespaceText(node))
  return content.length === 1 && content[0] instanceof HTMLElement && content[0].tagName === "EM"
}

function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word !== "").length
}

function isCaptionContent(nodes: Node[]): boolean {
  if (!isPureEmphasis(nodes)) return false
  for (const node of nodes) {
    if (node instanceof HTMLElement && node.querySelector(BLOCK_LEVEL_SELECTOR)) return false
  }
  const text = nodes.map((node) => node.textContent ?? "").join(" ")
  return countWords(text) <= MAX_CAPTION_WORDS
}

function patchCaption(p1: HTMLParagraphElement): boolean {
  if (p1.querySelector("img") === null) return false

  const children = [...p1.childNodes]
  const imgIndex = children.findIndex((child) => child instanceof HTMLImageElement)
  if (imgIndex === -1) return false
  if (children.slice(0, imgIndex).some((child) => !isWhitespaceText(child))) return false

  const trailing = children.slice(imgIndex + 1)
  if (!isCaptionContent(trailing)) return false

  const figure = document.createElement("figure")
  figure.appendChild(p1.querySelector("img")!)
  const figcaption = document.createElement("figcaption")
  for (const child of trailing) {
    if (isWhitespaceText(child)) {
      figcaption.appendChild(child)
      continue
    }
    if (child instanceof HTMLElement && child.tagName === "EM") {
      while (child.firstChild) figcaption.appendChild(child.firstChild)
    }
  }

  figure.appendChild(figcaption)
  p1.replaceWith(figure)
  return true
}

function patchImageCaptions() {
  for (const container of document.querySelectorAll<HTMLElement>(".markdown-preview-view")) {
    for (const p of container.querySelectorAll<HTMLParagraphElement>("p")) {
      if (p.closest("figure")) continue
      patchCaption(p)
    }
  }
}

patchImageCaptions()
document.addEventListener("nav", patchImageCaptions)

let observer: MutationObserver | null = null
if ("MutationObserver" in window) {
  let timeout: ReturnType<typeof setTimeout> | null = null
  observer = new MutationObserver(() => {
    if (timeout !== null) return
    timeout = setTimeout(() => {
      timeout = null
      patchImageCaptions()
    }, 50)
  })
  observer.observe(document.body, { childList: true, subtree: true })
  window.addCleanup?.(() => {
    observer?.disconnect()
    if (timeout !== null) clearTimeout(timeout)
  })
}
