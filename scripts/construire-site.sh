#!/usr/bin/env bash
# Construit le site public de démonstration (GitHub Pages) dans le dossier site/.
#   EXPO_PUBLIC_AVIS_ENDPOINT=https://script.google.com/macros/s/…/exec ./scripts/construire-site.sh /suivi-voeux-demo
# Argument : chemin de base du site (nom du dépôt GitHub Pages, précédé de « / »).
set -euo pipefail
BASE="${1:-/suivi-voeux-demo}"
cd "$(dirname "$0")/.."
rm -rf dist site
EXPO_BASE_URL="$BASE" npx expo export --platform web --output-dir dist
python3 - "$BASE" <<'PY'
import sys, re, shutil, pathlib
base = sys.argv[1]
html = pathlib.Path('dist/index.html').read_text(encoding='utf-8')
html = html.replace('<html lang="en">', '<html lang="fr">')
tete = (
    '<meta name="description" content="Prototype de démonstration : suivre son dossier Parcoursup pendant la phase d’admission. Données fictives.">\n'
    '<meta name="theme-color" content="#005D84">\n'
    '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&display=swap">\n'
    '<style>body{background:#E6EAF0;font-family:Figtree,system-ui,sans-serif}</style>\n'
)
html = html.replace('</head>', tete + '</head>', 1)
pathlib.Path('dist/index.html').write_text(html, encoding='utf-8')
shutil.copytree('dist', 'site')
# GitHub Pages : les adresses internes (/dossier, /avis…) renvoient vers l'application
shutil.copy('site/index.html', 'site/404.html')
pathlib.Path('site/.nojekyll').write_text('')
print('Site prêt dans site/ (base', base + ')')
PY
