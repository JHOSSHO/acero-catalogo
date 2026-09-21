"""Regression: beam results must render after solving, including load arrows."""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe',headless=True)
    page=browser.new_page(viewport={'width':1366,'height':900})
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    for url in [(ROOT/'vigas.html').as_uri(),'http://127.0.0.1:8765/vigas.html']:
        page.goto(url)
        assert page.locator('#beam-output').is_visible(),page.locator('#beam-error').inner_text()
        assert not page.locator('#beam-error').is_visible()
        for selector in ['#beam-scheme svg','#shear-chart svg','#moment-chart svg']:
            assert page.locator(selector).is_visible()
        assert page.locator('#beam-reactions tr').count()==4
        # Equal load ratios must produce equal arrow-length ratios; zero hides arrows.
        for i,(q,P) in enumerate([(2,10),(4,20),(0,-10)]):
            row=page.locator('#span-inputs tr').nth(i)
            row.locator('[data-field="q"]').fill(str(q));row.locator('[data-field="P"]').fill(str(P))
        page.locator('#solve-beam').click()
        arrows=page.evaluate('''() => [...document.querySelectorAll('#beam-scheme .load-arrow')].map(e=>({kind:e.dataset.kind,span:Number(e.dataset.span),length:Math.abs(e.y2.baseVal.value-e.y1.baseVal.value),down:e.y2.baseVal.value>e.y1.baseVal.value}))''')
        q0=next(a for a in arrows if a['kind']=='q' and a['span']==0)
        q1=next(a for a in arrows if a['kind']=='q' and a['span']==1)
        assert abs(q1['length']/q0['length']-2)<1e-10
        assert not any(a['kind']=='q' and a['span']==2 for a in arrows)
        pts=[a for a in arrows if a['kind']=='p']
        assert abs(pts[1]['length']/pts[0]['length']-2)<1e-10
        assert pts[0]['down'] and not pts[2]['down']
        page.locator('#beam-example').click()
        assert '24,35' in page.locator('#beam-metrics').inner_text() or '24,36' in page.locator('#beam-metrics').inner_text()
        page.locator('#support-count').fill('6');page.locator('#apply-supports').click()
        assert page.locator('#span-inputs tr').count()==5
        page.locator('#span-inputs tr').nth(3).locator('[data-field="q"]').fill('6,5')
        page.locator('#span-inputs tr').nth(4).locator('[data-field="P"]').fill('12')
        page.locator('#solve-beam').click()
        assert page.locator('#beam-output').is_visible(),page.locator('#beam-error').inner_text()
        assert page.locator('#beam-reactions tr').count()==6
        page.locator('#left-support').select_option('fixed');page.locator('#solve-beam').click()
        assert page.locator('#beam-output').is_visible()
        page.locator('#span-inputs tr').first.locator('[data-field="L"]').fill('0');page.locator('#solve-beam').click()
        assert page.locator('#beam-error').is_visible() and not page.locator('#beam-output').is_visible()
        page.locator('#beam-example').click();assert page.locator('#beam-output').is_visible()
        page.set_viewport_size({'width':390,'height':844})
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        page.locator('#solve-beam').click();assert page.locator('#moment-chart svg').is_visible()
        page.locator('#beam-transfer').click();page.wait_for_selector('#beam-import-note:not([hidden])')
        assert page.locator('.profile-title').is_visible()
        print('PASS beam UI:',url,flush=True)
    assert not errors,errors
    browser.close()
