"""Publish only the application; exclude reports, original catalogs and machine data."""
from pathlib import Path
import shutil, re
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'site-dist'
FILES=['index.html','vigas.html','app.js','calculator.js','beam.js','beam-ui.js',
       'styles.css','dark.css','beam.css','pwa.css','pwa.js','sw.js','manifest.webmanifest',
       'assets/favicon.svg','assets/icon-192.png','assets/icon-512.png','assets/apple-touch-icon.png',
       'data/catalog.js','data/steels.js']
OUT.mkdir(exist_ok=True)
for filename in FILES:
    target=OUT/filename;target.parent.mkdir(parents=True,exist_ok=True)
    shutil.copyfile(ROOT/filename,target)
(OUT/'data/connection.js').write_text('window.NERVIO_CONNECTION = null;\n',encoding='utf-8')
(OUT/'.nojekyll').write_text('',encoding='utf-8')
assert set(str(p.relative_to(OUT)).replace('\\','/') for p in OUT.rglob('*') if p.is_file())==set(FILES+['data/connection.js','.nojekyll']), 'Unexpected file in site-dist'
print('Site prepared:',len(FILES)+2,'public app files; no original documents or LAN addresses.')
