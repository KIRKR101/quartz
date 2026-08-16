// Runs in the capture phase so the class is applied before the darkmode
// toggle handler swaps the saved-theme attribute. Transitions stay disabled
// for one paint (two requestAnimationFrame calls), then are re-enabled.
document.addEventListener(
  "click",
  (e) => {
    if (!(e.target instanceof Element) || !e.target.closest(".darkmode")) return

    document.documentElement.classList.add("theme-transition-off")
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.documentElement.classList.remove("theme-transition-off")
      })
    })
  },
  true,
)