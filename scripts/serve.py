"""Read-only local sharing server. Serves only app assets and reference documents."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import unquote,urlsplit
import argparse,json,socket,os

ROOT=Path(__file__).resolve().parents[1]
FILES={'index.html','vigas.html','app.js','calculator.js','beam.js','beam-ui.js','styles.css','dark.css','beam.css',
       'pwa.js','pwa.css','sw.js','manifest.webmanifest','assets/icon-192.png','assets/icon-512.png','assets/apple-touch-icon.png','assets/favicon.svg','data/catalog.js','data/catalog.json','data/steels.js','data/connection.js'}
def addresses():
    ips=set()
    for info in socket.getaddrinfo(socket.gethostname(),None,socket.AF_INET):
        ip=info[4][0]
        if not ip.startswith(('127.','169.254.')):ips.add(ip)
    return sorted(ips)
class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
    def do_GET(self):
        path=unquote(urlsplit(self.path).path).lstrip('/') or 'index.html'
        if path=='connection.json':
            body=json.dumps(self.server.connection).encode()
            self.send_response(200);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(body)));self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(body);return
        if path not in FILES:self.send_error(404);return
        self.path='/'+path
        super().do_GET()
    def do_HEAD(self):
        path=unquote(urlsplit(self.path).path).lstrip('/') or 'index.html'
        if path not in FILES:self.send_error(404);return
        self.path='/'+path;super().do_HEAD()
    def end_headers(self):
        self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('Cache-Control','no-cache')
        super().end_headers()
    def list_directory(self,path):self.send_error(404);return None
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--port',type=int,default=8765);args=parser.parse_args()
    server=ThreadingHTTPServer(('0.0.0.0',args.port),Handler)
    server.connection={'application':'Nervio','port':args.port,'urls':[f'http://{ip}:{args.port}' for ip in addresses()],'pid':os.getpid()}
    (ROOT/'data/connection.js').write_text('window.NERVIO_CONNECTION = '+json.dumps(server.connection)+';\n',encoding='utf8')
    print(json.dumps(server.connection),flush=True)
    server.serve_forever()
