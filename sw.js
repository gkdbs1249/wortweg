const CACHE='wortweg-v49';
const ASSETS=['./','./index.html','./styles.css','./app.mjs','./firebase-config.mjs','./src/core.mjs','./src/cloud-sync.mjs','./src/practice-data.mjs','./data/words.json','./manifest.webmanifest','./favicon.ico','./icons/wortweg-tab-v49.png','./icons/wortweg-touch-v49.png','./icons/wortweg-app-v49-192.png','./icons/wortweg-app-v49-512.png'];

async function precacheFreshAssets(){
  const cache=await caches.open(CACHE);
  try{
    const responses=await Promise.all(ASSETS.map(async asset=>{
      const separator=asset.includes('?')?'&':'?';
      const freshRequest=new Request(`${asset}${separator}wortweg-cache=${encodeURIComponent(CACHE)}`,{cache:'reload'});
      const response=await fetch(freshRequest);
      if(!response.ok) throw new Error(`Precache failed: ${asset} (${response.status})`);
      return response;
    }));
    await Promise.all(ASSETS.map((asset,index)=>cache.put(asset,responses[index])));
  }catch(error){
    await caches.delete(CACHE);
    throw error;
  }
}

self.addEventListener('install',event=>event.waitUntil((async()=>{
  await precacheFreshAssets();
  await self.skipWaiting();
})()));

self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(key=>key.startsWith('wortweg-v')&&key!==CACHE).map(key=>caches.delete(key)));
  await self.clients.claim();
})()));

self.addEventListener('fetch',event=>event.respondWith(
  caches.open(CACHE).then(cache=>cache.match(event.request)).then(cached=>cached||fetch(event.request))
));
