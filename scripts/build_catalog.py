"""Rebuild the offline catalog from the original, traceable source files."""
from pathlib import Path
import hashlib
import json
import re
from collections import Counter
import openpyxl
import pymupdf

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data'
INCH = 25.4
profiles = []
aisc = DATA / 'AISC Shapes Database v13.2.xlsx'
book = openpyxl.load_workbook(aisc, read_only=True, data_only=True)
rows = list(book['Database v13.2'].values)
# Use only the first (US customary) block: the workbook repeats metric headers.
headers = list(rows[1][:56])
for number, row in enumerate(rows[2:], start=3):
    r = dict(zip(headers, row[:56]))
    if r['Type'] not in ('C', 'MC', 'W', 'M', 'S', 'HP', 'HSS', 'PIPE'):
        continue
    assert all(isinstance(r[k], (float, int)) and r[k] > 0 for k in ('A', 'Sx', 'Ix'))
    if r['Type'] in ('HSS', 'PIPE'):
        if r['OD'] > 0:
            family, height, width = 'circular', r['OD'], r['OD']
        else:
            height, width = r['Ht'], r['B']
            family = 'square' if height == width else 'rectangular'
        web = flange = r['tdes']
        process = 'Tubular'
    else:
        family = 'C' if r['Type'] in ('C', 'MC') else 'H' if r['Type'] in ('W', 'HP') else 'I'
        height, width, web, flange = r['d'], r['bf'], r['tw'], r['tf']
        process = 'Laminado'
    assert min(height,width,web,flange)>0
    profiles.append(dict(
        id='aisc-' + r['AISC_Manual_Label'], name=r['AISC_Manual_Label'],
        family=family, type=r['Type'],
        catalog='AISC', process=process, area=r['A'],
        sTop=r['Sx'], sBottom=r['Sx'], ix=r['Ix'],
        heightMm=height*INCH, widthMm=width*INCH,
        webMm=web*INCH, flangeMm=flange*INCH, lipMm=0,
        massKgM=r['W']*0.45359237/0.3048,
        source='data/' + aisc.name, sourceRef=f'Database v13.2 · fila {number}',
        sourceRow=number, originalS=r['Sx'], originalSUnit='in³',
        originalArea=r['A'], originalAreaUnit='in²',
        material='Geometría AISC; grado del acero por especificar al proveedor.'
    ))

acesco = DATA / 'ACESCO - Perfiles C y Z grado 50.pdf'
page = pymupdf.open(acesco)[24]
lines = page.get_text().splitlines()
i = 0
count = 0
while i < len(lines):
    if not lines[i].startswith('PHR C '):
        i += 1
        continue
    names = []
    while i < len(lines) and lines[i].startswith('PHR C '):
        names.append(lines[i]); i += 1
    n = len(names)
    values = lines[i:i+19*n]
    assert len(values) == n*19
    cols = [values[k*n:(k+1)*n] for k in range(19)]
    for j, label in enumerate(names):
        # Table 14: thickness, gauge, A, B, C, weight, area, x, xo, J, Cw,
        # j, Ix, Iy, Sx, Sy, rx, ry, ro. Commas in Ix/Sx are thousands.
        num = lambda k: float(cols[k][j].replace(',', ''))
        thickness, height, width, lip = num(0),num(2),num(3),num(4)
        sx, area, ix = num(14),num(6),num(12)
        assert abs(sx - ix/(height/2)) <= 1, (label, sx, ix, height)
        normalized = f'PHR C {height:g} × {width:g} × {thickness:.1f}'
        note = ''
        if label.startswith('PHR C 150 x 60'):
            note = 'La referencia impresa dice 150 × 60, pero la columna B indica 50 mm. Se usa la geometría de las columnas A/B/C.'
        profiles.append(dict(
            id=f'acesco-{height:g}-{width:g}-{thickness:g}', name=normalized,
            family='C',type='PHR C',catalog='ACESCO',process='Conformado en frío',
            area=area/INCH**2,sTop=sx/INCH**3,sBottom=sx/INCH**3,ix=ix/INCH**4,
            heightMm=height,widthMm=width,webMm=thickness,flangeMm=thickness,lipMm=lip,
            massKgM=num(5),source='data/'+acesco.name,
            sourceRef='Tabla 14 · págs. 48–49 · página PDF 25',sourcePage=25,
            originalS=sx,originalSUnit='mm³',originalArea=area,originalAreaUnit='mm²',
            originalLabel=label,sourceNote=note,
            material='Manual de perfiles Grado 50: acero de lámina, no ASTM A572. Confirmar especificación y disponibilidad con el proveedor.'
        ))
        count += 1
    i += 19*n
assert count == 35, count

# Table 16: plain text reading order has Cw at the end, not beside J.
zlines=pymupdf.open(acesco)[26].get_text().splitlines()
start=next(i for i,line in enumerate(zlines) if line.startswith('PHR Z '))
znames=zlines[start:start+23]
assert all(s.startswith('PHR Z ') for s in znames)
values=zlines[start+24:start+24+23*19]  # one footnote follows the 23 names
assert len(values)==23*19
zcols=[values[k*23:(k+1)*23] for k in range(19)]
def decimal(text):
    return float(text.replace('.','').replace(',','.')) if ',' in text else float(text)
for j,label in enumerate(znames):
    val=lambda k:decimal(zcols[k][j])
    thick,height,width,lip,mass,area=val(0),val(2),val(3),val(4),val(5),val(6)
    ix=float(zcols[11][j].replace('.',''))
    sx=float(zcols[13][j].replace('.',''))
    assert abs(sx-ix/(height/2))<1,(label,sx,ix)
    profiles.append(dict(id=f'acesco-z-{height:g}-{width:g}-{thick:g}',
        name=f'PHR Z {height:g} × {width:g} × {thick:.1f}',family='Z',type='PHR Z',
        catalog='ACESCO',process='Conformado en frío',area=area/INCH**2,
        sTop=sx/INCH**3,sBottom=sx/INCH**3,ix=ix/INCH**4,
        heightMm=height,widthMm=width,webMm=thick,flangeMm=thick,lipMm=lip,massKgM=mass,
        source='data/'+acesco.name,sourceRef='Tabla 16 · pág. 52 · página PDF 27',sourcePage=27,
        originalS=sx,originalSUnit='mm³',originalArea=area,originalAreaUnit='mm²',originalLabel=label,
        sourceNote='Z: Sx respecto al eje geométrico. Los ejes principales están inclinados; comprobar flexión oblicua y restricciones laterales. Sx solo no verifica una Z libre de arriostramiento.',
        material='Acero de lámina grado 50 del manual; confirmar grado y disponibilidad.'))
assert len(profiles) == 991, len(profiles)
assert len({p['id'] for p in profiles}) == len(profiles)
catalog = dict(
    schemaVersion=1, count=len(profiles),
    description='Propiedades geométricas brutas x-x: I(M/S), H(W/HP), C/MC, HSS cuadrados/rectangulares/circulares, PIPE y Z. S top = S bottom por simetría horizontal o central. Z requiere flexión oblicua.',
    units=dict(area='in²',sTop='in³',sBottom='in³',ix='in⁴',heightMm='mm',widthMm='mm',massKgM='kg/m'),
    sources=[dict(name=p.name,sha256=hashlib.sha256(p.read_bytes()).hexdigest()) for p in (aisc,acesco)],
    profiles=profiles)
(DATA/'catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2),encoding='utf-8')
(DATA/'catalog.js').write_text('/* Generated by scripts/build_catalog.py from the original catalogs. */\nwindow.STEEL_CATALOG = '+json.dumps(catalog,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
print('Catalog:',len(profiles),dict(Counter(p['catalog'] for p in profiles)))
required = 24.36 * 8.850745791327 / 50
matches = sorted([p for p in profiles if required <= p['sTop'] <= required*1.2],key=lambda p:p['area'])
print('Required S',required,'in3; best matches in 20% band:')
for p in matches[:5]:
    print(p['name'], 'A=',round(p['area'],6),'S=',round(p['sTop'],6))
