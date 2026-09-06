# Commonplace

Commonplace is a personal knowledge garden built on [Quartz](https://quartz.jzhao.xyz/). It turns Markdown notes into a fast, static website and supports regular content pages alongside fully custom pages.

## Getting started

Install dependencies:

```sh
npm install
```

Put Markdown files in `content/`, then build the site:

```sh
npx quartz build
```

The generated site is written to `public/`. Use `npx quartz build --serve` to preview it locally.

Site behaviour is configured in [`quartz.config.yaml`](quartz.config.yaml). Quartz plugins are installed and resolved from that file.

## Custom pages

Custom pages live outside the Quartz source tree in [`custom-plugins/`](custom-plugins/). A custom page plugin can own its route, markup, styling, client-side behaviour, data, and static assets without changes to `quartz/`.

For example, the art gallery is registered as a local plugin:

```yaml
plugins:
  - source: ./custom-plugins/art-page
    enabled: true
    options:
      slug: art-gallery
      explorer:
        enabled: true
        label: Art
```

The plugin generates `/art-gallery` and one detail route per artwork. Its implementation and images are self-contained in `custom-plugins/art-page/`.

To create another page, add a directory with an `index.js` and `package.json`, export a Quartz page-type plugin, and register the directory under `plugins`. Virtual pages are created with `generate()`, while `body` supplies the rendered page component. A plugin may also implement an emitter to copy its own assets into the build output.

Custom pages can therefore be as integrated or as independent as needed: they may use Quartz’s layout and page data, or render their own markup and ship their own CSS, JavaScript, and assets.

## Development

Run the type and formatting checks with:

```sh
npm run check
```

Quartz itself lives in `quartz/`; site-specific content, configuration, and custom pages should remain outside it whenever possible.
