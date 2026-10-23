// A returning PWA may still have the previous complete release in its cache.
// Finish the available update before requesting application modules or styles.
async function currentRelease() {
  if (!('serviceWorker' in navigator)) return;
  const hadController = !!navigator.serviceWorker.controller;
  try {
    const registration = await navigator.serviceWorker.register('./sw.js', {updateViaCache: 'none'});
    await registration.update().catch(() => {}); // The installed version also works offline.
    const worker = registration.installing
      ?? registration.waiting
      ?? (registration.active?.state === 'activating' ? registration.active : null);
    if (!hadController || !worker || ['activated', 'redundant'].includes(worker.state)) return;
    const status = document.querySelector('.loading-shell p');
    if (status) status.textContent = 'Pobieramy nowe mapy i wizerunki bossów. Twoje zapisane buildy zostają zachowane.';
    await new Promise(resolve => {
      const done = () => {
        if (!['activated', 'redundant'].includes(worker.state)) return;
        worker.removeEventListener('statechange', done);
        resolve();
      };
      worker.addEventListener('statechange', done);
      done();
    });
  } catch {
    // No connection: use the already installed complete release.
  }
}

await currentRelease();
await Promise.all(['style.css', 'game.css'].map(file => new Promise(resolve => {
  const link = document.createElement('link');
  link.rel = 'stylesheet'; link.href = `./${file}`;
  link.onload = resolve; link.onerror = resolve;
  document.head.append(link);
})));
await import('./app.js');
