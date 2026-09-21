"""Numerical regression, catalog integrity and real-browser workflow checks."""
from pathlib import Path
import csv
import io
import json
import math
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results'
OUT.mkdir(exist_ok=True)
catalog = json.loads((ROOT/'data/catalog.json').read_text(encoding='utf-8'))
assert catalog['count'] == len(catalog['profiles']) == 436
assert len(set(p['id'] for p in catalog['profiles'])) == 436
assert sum(p['catalog'] == 'ACESCO' for p in catalog['profiles']) == 35
for p in catalog['profiles']:
    assert p['area'] > 0 and p['sTop'] > 0 and p['sBottom'] > 0
    assert (ROOT/p['source']).is_file(), p['source']
    if p['catalog'] == 'ACESCO':
        assert math.isclose(p['sTop'] * 25.4**3, p['originalS'], rel_tol=1e-12)
acesco = next(p for p in catalog['profiles'] if p['id'] == 'acesco-254-67-2.5')
assert acesco['originalS'] == 71969 and acesco['originalArea'] == 1008.2
assert acesco['massKgM'] == 7.97
aisc = next(p for p in catalog['profiles'] if p['name'] == 'C6X8.2')
assert aisc['area'] == 2.39 and aisc['sTop'] == 4.35
print('PASS: original catalog values, units, row count and source files')

with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe', headless=True)
    context = browser.new_context(viewport={'width':1440,'height':1050}, device_scale_factor=1, accept_downloads=True)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto((ROOT/'index.html').as_uri())
    page.wait_for_selector('.profile-title')
    assert page.locator('.profile-title').inner_text() == 'PHR C 254 × 67 × 2.5'
    assert page.locator('#required-s').inner_text().startswith('4,312')
    page.screenshot(path=str(OUT/'desktop.png'),full_page=True)
    checks = page.evaluate('''() => {
      const c = SteelCalc, assert = (v, m) => { if (!v) throw Error(m); };
      const near = (a,b) => Math.abs(a-b) < 1e-9;
      assert(near(c.KNM_TO_KIPIN, 8.850745791327), 'kNm to kip-in conversion');
      const input = {moment: '-24,36',fy:50,fu:65,tolerance:20};
      const d = c.calculate(input);
      assert(near(d.kipIn, 215.6041674767), 'governing moment conversion');
      assert(near(d.required, 4.312083349534), 'required elastic modulus');
      assert(near(d.required, c.calculate({...input,moment:24.36}).required), 'moment sign');
      assert(near(c.calculate({...input,moment:1,fy:1,fu:1}).required, c.KNM_TO_KIPIN), 'one-unit conversion');
      assert(near(c.calculate({...input,fy:100,fu:110}).required,d.required/2), 'Fy scaling');
      for (const bad of [{moment:0},{moment:''},{moment:'NaN'},{moment:'1,2,3'}, {fy:0}, {fy:-1}, {fu:49}, {tolerance:-1}, {tolerance:501}, {moment:'1e309'}]) {
        let threw = false; try {c.calculate({...input,...bad});} catch {threw = true;}
        assert(threw, 'invalid input ' + JSON.stringify(bad));
      }
      const synthetic = {id:'test',name:'test',family:'C',catalog:'test',area:1,massKgM:1,sTop:d.required,sBottom:d.required};
      assert(c.evaluate(synthetic,d).within, 'exact lower boundary');
      assert(c.evaluate({...synthetic,sTop:d.upper,sBottom:d.upper},d).within, 'exact upper boundary');
      assert(!c.evaluate({...synthetic,sTop:d.required*.999,sBottom:d.required*2},d).sufficient, 'top controls');
      assert(!c.evaluate({...synthetic,sTop:d.required*2,sBottom:d.required*.999},d).sufficient, 'bottom controls');
      assert(!c.evaluate({...synthetic,sTop:d.upper*1.001,sBottom:d.upper*1.001},d).within, 'no excess beyond tolerance');
      const selected = c.select(STEEL_CATALOG.profiles,d);
      assert(selected.best.id === 'acesco-254-67-2.5','best by area at 20%');
      assert(selected.matches.every(p => p.sufficient && p.within), 'no insufficient matches');
      assert(c.select(STEEL_CATALOG.profiles,d,{catalog:'AISC'}).best.name === 'M8X6.2','AISC best I');
      assert(c.select(STEEL_CATALOG.profiles,d,{catalog:'AISC',family:'C'}).best.name === 'MC10X6.5','AISC best channel');
      const exact = c.select(STEEL_CATALOG.profiles,c.calculate({...input,tolerance:0}));
      assert(exact.matches.length === 0 && exact.alternative.sufficient && !exact.alternative.within,'zero tolerance fallback');
      assert(!c.select(STEEL_CATALOG.profiles,c.calculate({...input,moment:1e8})).alternative,'no capacity fallback for huge moment');
      assert(c.select(STEEL_CATALOG.profiles,d,{query:'254x67'}).all.length === 4,'reference normalization');
      return 'PASS: 26 conversion, validation, boundary and selection checks';
    }''')
    print(checks)
    page.locator('#moment').fill('24.36')
    assert page.locator('#required-s').inner_text().startswith('4,312')
    page.locator('#moment').fill('0')
    assert page.locator('#input-error').is_visible()
    assert page.locator('#export-csv').is_disabled()
    assert page.locator('#profile-rows tr').count() == 0
    page.locator('#reset').click()
    page.locator('#catalog-filter').select_option('AISC')
    assert page.locator('.profile-title').inner_text() == 'M8X6.2'
    page.locator('[data-family="C"]').click()
    assert page.locator('.profile-title').inner_text() == 'MC10X6.5'
    page.locator('#search').fill('does-not-exist')
    assert page.locator('#empty-results').is_visible()
    assert page.locator('.no-recommendation').is_visible()
    page.locator('#reset').click()
    page.locator('#tolerance').fill('0')
    assert page.locator('#match-count').inner_text() == '0'
    assert 'FUERA DE TOLERANCIA' in page.locator('.recommendation-label').inner_text()
    page.locator('#reset').click()
    page.locator('#all-tab').click()
    assert page.locator('#profile-rows tr').count() == 10
    first = page.locator('#profile-rows tr').first.inner_text()
    page.locator('#next').click()
    assert first != page.locator('#profile-rows tr').first.inner_text()
    assert page.locator('#page-label').inner_text() == '2 / 44'
    page.locator('#previous').click()
    page.locator('[data-profile]').first.click()
    assert 'INSUFICIENTE' in page.locator('.recommendation-label').inner_text()
    page.locator('#reset').click()
    with page.expect_download() as download_info:
        page.locator('#export-csv').click()
    download = download_info.value
    download.save_as(OUT/'export.csv')
    csv_rows = list(csv.reader(io.StringIO((OUT/'export.csv').read_text(encoding='utf-8-sig')),delimiter=';'))
    assert len(csv_rows) - 1 == int(page.locator('#match-count').inner_text())
    assert csv_rows[1][0] == 'PHR C 254 × 67 × 2.5'
    assert float(csv_rows[1][8].replace(',','.')) > 4.312
    assert 'Predimensionamiento' in csv_rows[1][-1]
    page.locator('#open-report').click()
    assert page.locator('#report-dialog').is_visible()
    page.screenshot(path=str(OUT/'diagram.png'))
    page.locator('[data-report-moment="20.98"]').click()
    assert not page.locator('#report-dialog').is_visible()
    assert page.locator('#moment').input_value() == '20,98'
    page.locator('#reset').click()
    page.locator('#toggle-details').click()
    assert page.locator('#selected-details').is_visible()
    print('PASS: browser inputs, filter combinations, fallback, pagination, CSV and diagram')
    # Export a ready-to-review memory of the initial governing case.
    page.pdf(path=str(ROOT/'Memoria - nervio grupo 2.pdf'),format='A4',print_background=True,prefer_css_page_size=True)
    page.locator('#reset').click()
    page.set_viewport_size({'width':390,'height':844})
    page.screenshot(path=str(OUT/'mobile.png'),full_page=True)
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'horizontal mobile overflow'
    assert page.locator('#moment').is_visible()
    page.locator('[data-moment="11.78"]').click()
    assert page.locator('#moment').input_value() == '11,78'
    print('PASS: 390px responsive layout, touch-sized controls and PDF export')
    assert not errors, errors
    browser.close()
print('ALL CHECKS PASSED')
