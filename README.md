# OKCA Contrast Playground

An interactive page for [OKCA](https://github.com/pawn002/okca), the polarity-aware contrast algorithm. It compares WCAG 2.x, OKCA 2.0.3 and OKCA 3.0.0 on any colour pair. It also shows pairs as a reader with ageing or low vision sees them.

**Live:** https://pawn002.github.io/okca-playground/

## What it shows

- **Which way round.** The same grey pairs scored both ways round. OKCA 3.0.0's default observer follows the reading studies. The experimental scatter observer (`{ observer: 'scatter' }`) follows the optics of an eye that scatters light.
- **As a reader sees it.** Three pairs blurred for a 20/40 or 20/80 reader and veiled by an 80-year-old eye's scatter.
- **Try a pair.** Any pair, every scorer, and a map of where each one reaches the reader's threshold.
- **Notes.** How the scores and the samples are worked out, and their limits.

The scatter observer is experimental in OKCA and outside semver. It may change or be removed in any minor release.

## How it is built

The page is one static file, `index.html`, assembled from `src/`:

| File | What it is |
|---|---|
| `src/head.html` | Title, fonts, the inlined [Candor](https://www.npmjs.com/package/@candor-design/tokens) 6.0.0 tokens, page CSS |
| `src/body.html` | The page markup |
| `src/app.js` | All behaviour. Imports `@pawn002/okca` 3.0.0 and 2.0.3 from jsDelivr, pinned to exact versions |
| `build.sh` | Rebuilds `index.html` from `src/` |
| `render-check.js` | Playwright check: desktop light and phone dark. Reports overflow, unregistered Candor tags and console errors, and saves screenshots |

Every score comes from the published packages. The page's own colour maths only builds slider colours and draws the veiled samples.

```sh
./build.sh
node render-check.js   # needs Playwright
```

Edit `src/`, rebuild, commit `index.html` with the change. GitHub Pages serves `index.html` from `main`.

## License

MIT.
