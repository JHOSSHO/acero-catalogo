"""Exercise the published project subpath with networking disabled."""
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT/'site-dist'),**kwargs)
 def translate_path(self,path):return super().translate_path(path.removeprefix('/acero-catalogo'))
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_port}/acero-catalogo/'
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe',headless=True)
 context=browser.new_context();page=context.new_page();errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(url)
 page.wait_for_function("document.querySelector('#offline-state').textContent.includes('Disponible')")
 page.wait_for_function('navigator.serviceWorker.controller !== null')
 assert page.evaluate('window.STEEL_CATALOG.profiles.length')==991
 context.set_offline(True)
 page.reload();page.wait_for_function("document.querySelector('#offline-state').textContent.includes('Sin internet')")
 page.goto(url+'index.html?moment=20&fy=50&fu=65')
 assert page.locator('#moment').input_value()=='20'
 page.goto(url+'vigas.html')
 assert page.locator('#beam-output').is_visible()
 page.locator('#support-count').fill('6');page.locator('#apply-supports').click();page.locator('#solve-beam').click()
 assert page.locator('#beam-reactions tr').count()==6
 assert page.locator('#moment-chart svg').is_visible()
 page.set_viewport_size({'width':390,'height':844})
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 assert not errors,errors
 browser.close()
server.shutdown()
print('PASS: 991 profiles, reload, query URLs, beam calculations with 6 supports and mobile layout offline.')

