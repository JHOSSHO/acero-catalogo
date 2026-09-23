(function(){
  'use strict';
  const bar=document.createElement('section');bar.className='pwa-bar';bar.setAttribute('aria-label','Instalación y conexión');
  bar.innerHTML='<span id="offline-state" role="status">Preparando acceso sin conexión…</span><div><button type="button" id="pwa-install">Instalar / uso sin conexión</button><button type="button" id="pwa-update" hidden>Actualizar y recargar</button></div>';
  document.querySelector('.topbar').after(bar);
  const dialog=document.createElement('dialog');dialog.className='pwa-dialog';
  dialog.setAttribute('aria-labelledby','pwa-title');
  dialog.innerHTML='<div class="dialog-heading"><h2 id="pwa-title">Nervio, también sin internet</h2><button type="button" class="close-button" aria-label="Cerrar">×</button></div><ol><li>Abre la página con internet y espera el mensaje <strong>Disponible sin conexión</strong>.</li><li><strong>iPhone / iPad:</strong> abre en Safari → Compartir → Añadir a pantalla de inicio (o Abrir como app, si aparece).</li><li><strong>Android / Chrome:</strong> usa Instalar aplicación o Añadir a pantalla de inicio en el menú del navegador.</li><li>Después podrás abrir el icono y usar el catálogo y las vigas sin Wi‑Fi ni datos.</li></ol><p>Las fuentes externas y los documentos enlazados necesitan internet. Si borras los datos del navegador o el sistema libera ese almacenamiento, vuelve a abrir Nervio con conexión para descargarla otra vez.</p>';
  document.body.append(dialog);dialog.querySelector('button').onclick=()=>dialog.close();
  let prompt=null,reg=null,ready=false,reloading=false;
  const status=document.getElementById('offline-state');
  function state(){status.textContent=ready?(navigator.onLine?'Disponible sin conexión · aplicación guardada':'Sin internet · usando la aplicación guardada'):'Preparando acceso sin conexión…';}
  window.addEventListener('online',state);window.addEventListener('offline',state);
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();prompt=e;});
  document.getElementById('pwa-install').onclick=async()=>{if(prompt){await prompt.prompt();prompt=null;}else dialog.showModal();};
  if(!('serviceWorker' in navigator) || !window.isSecureContext || location.protocol==='file:'){
    status.textContent='Para instalar sin conexión, abre la versión HTTPS de GitHub Pages.';return;
  }
  function update(){if(reg.waiting)document.getElementById('pwa-update').hidden=false;}
  navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'}).then(async r=>{
    reg=r;update();r.addEventListener('updatefound',()=>{const installing=r.installing;installing?.addEventListener('statechange',()=>{if(installing.state==='installed')update();});});
    await navigator.serviceWorker.ready;ready=true;state();
  }).catch(()=>{status.textContent='No se pudo guardar la aplicación. Comprueba internet y recarga para intentarlo otra vez.';});
  document.getElementById('pwa-update').onclick=()=>{if(reg?.waiting){reloading=true;reg.waiting.postMessage('ACTIVATE_UPDATE');}};
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(reloading)location.reload();});
})();
