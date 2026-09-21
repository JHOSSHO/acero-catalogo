"""Integration tests for the expanded catalog, mobile app and sharing server."""
from pathlib import Path
import json, csv, io, urllib.request, urllib.error
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results';OUT.mkdir(exist_ok=True)
data=json.loads((ROOT/'data/catalog.json').read_text(encoding='utf8'))
assert len(data['profiles'])==991
assert {p['family'] for p in data['profiles']}=={'C','I','H','square','rectangular','circular','Z'}
for p in data['profiles']:
    assert all(p[k]>0 for k in ['area','sTop','sBottom','heightMm','widthMm','webMm','massKgM']),p['name']

with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe',headless=True)
    ctx=browser.new_context(viewport={'width':1440,'height':1000},accept_downloads=True)
    page=ctx.new_page();errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto((ROOT/'index.html').as_uri())
    page.wait_for_selector('.profile-title')
    assert page.locator('#required-s').inner_text().startswith('4,312')
    assert page.locator('#profile-rows tr').count()==int(page.locator('#match-count').inner_text())>10
    assert page.evaluate('getComputedStyle(document.body).backgroundColor.match(/\d+/g).map(Number).every(v=>v<32)')
    assert page.locator('.profile-drawing').bounding_box()['height']>=300
    page.locator('#catalog-filter').select_option('ACESCO');page.locator('#family-filter').select_option('C')
    assert page.locator('.profile-title').inner_text()=='PHR C 254 × 67 × 2.5'
    assert 'PHR C 305 × 80 × 2.0' in page.locator('.efficiency-featured').inner_text()
    page.evaluate('''() => {
      const c=SteelCalc,d=c.calculate({moment:-24.36,fy:50,fu:65,tolerance:20});
      const r=c.select(STEEL_CATALOG.profiles,d,{family:'C',catalog:'ACESCO',objective:'mass'});
      if(r.lightest.name!=='PHR C 305 × 80 × 2.0'||r.lightest.within)throw Error('outside-tolerance alternative');
      if(Math.abs(r.lightest.surplus-22.417)>0.1)throw Error('surplus');
      const a=c.compareEfficiency(r.sufficient).find(p=>p.id==='acesco-254-67-2.5');
      if(!a.dominated)throw Error('weight/S dominance');
      for(const bottom of [true,false]){let p={...r.best,sTop:bottom?d.required*2:d.required*.9,sBottom:bottom?d.required*.9:d.required*2};if(c.evaluate(p,d).sufficient)throw Error('both fibers');}
    }''')
    page.locator('#max-height').fill('26')
    assert 'PHR C 305 × 80 × 2.0' not in page.locator('#efficiency-content').inner_text()
    assert page.locator('#profile-rows tr').count()==int(page.locator('#match-count').inner_text())
    page.locator('#max-height').fill('-1');assert page.locator('#input-error').is_visible()
    page.locator('#reset').click()
    for family in ['I','H','square','rectangular','circular','Z','C']:
        page.locator('#family-filter').select_option(family);page.locator('#all-tab').click()
        expected=sum(p['family']==family for p in data['profiles'])
        assert page.locator('#profile-rows tr').count()==expected,(family,expected)
        page.locator('[data-profile]').first.click()
        assert page.locator('.profile-drawing').is_visible()
    page.locator('#reset').click()
    for grade,fy,fu in [('a36','36','58'),('a572-50','50','65'),('a992','50','65'),('a500-c','50','62'),('a1011-50','50','65')]:
        page.locator('#steel').select_option(grade);assert page.locator('#fy').input_value()==fy;assert page.locator('#fu').input_value()==fu
    page.locator('#fy').fill('45');assert page.locator('#steel').input_value()=='custom'
    page.locator('#reset').click();page.locator('#tolerance').fill('0')
    assert page.locator('#match-count').inner_text()=='0'
    page.locator('#moment').fill('0');assert page.locator('#input-error').is_visible()
    page.locator('#reset').click()
    with page.expect_download() as info:page.locator('#export-csv').click()
    info.value.save_as(OUT/'export-v2.csv')
    rows=list(csv.reader(io.StringIO((OUT/'export-v2.csv').read_text(encoding='utf-8-sig')),delimiter=';'))
    assert len(rows)-1==int(page.locator('#match-count').inner_text())
    page.screenshot(path=str(OUT/'dark-desktop.png'))
    for width,height in [(390,844),(768,1024),(1024,768)]:
        page.set_viewport_size({'width':width,'height':height})
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
        assert page.locator('.profile-drawing').bounding_box()['height']>=280
        page.screenshot(path=str(OUT/f'dark-{width}.png'))
    page.set_viewport_size({'width':1440,'height':1000})
    page.goto((ROOT/'vigas.html').as_uri());page.wait_for_selector('#beam-transfer[href]')
    page.locator('#support-count').fill('6');page.locator('#apply-supports').click();page.locator('#solve-beam').click()
    assert page.locator('#beam-reactions tr').count()==6
    page.locator('#beam-transfer').click();page.wait_for_selector('#beam-import-note:not([hidden])')
    assert float(page.locator('#moment').input_value().replace(',','.'))!=0
    page.goto('http://127.0.0.1:8765/index.html')
    page.locator('#family-filter').select_option('C');page.locator('#max-height').fill('26');page.locator('#open-share').click()
    link=page.locator('#share-url').input_value();assert '192.168.1.10:8765' in link and 'height=26' in link and 'family=C' in link
    page.locator('#close-share').click()
    page.goto(link);assert page.locator('#max-height').input_value()=='26' and page.locator('#family-filter').input_value()=='C'
    for path in ['informe_grupo2.pdf','.tools/server.log','README.md','data/AISC%20Shapes%20Database%20v13.2.xlsx','scripts/serve.py']:
        response=page.request.get('http://127.0.0.1:8765/'+path);assert response.status==404,path
    assert not errors,errors
    browser.close()
print('PASS: 991 sections, seven families, weight/S comparison, height, all rows, steels/custom, validation, CSV, dark theme, phone/iPad, beam transfer, LAN share and document isolation.')
