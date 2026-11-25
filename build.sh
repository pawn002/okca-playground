#!/usr/bin/env bash
# Assemble index.html, the single page GitHub Pages serves, from the parts in src/.
set -euo pipefail
cd "$(dirname "$0")"
{
  cat src/head.html
  echo '</head>'
  echo '<body>'
  cat src/body.html
  echo '<script type="module" src="https://cdn.jsdelivr.net/npm/@candor-design/web-components@7.0.0/dist/candor-web-components.standalone.js"></script>'
  echo '<script type="module">'; cat src/app.js; echo '</script>'
  echo '</body>'
  echo '</html>'
} > index.html
echo "built index.html"
