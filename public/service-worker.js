// This is a service worker in place of the old service worker.
// It removes itself as shown here https://github.com/NekR/self-destroying-sw

self.addEventListener('install', function (e) {
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  self.registration.unregister()
    .then(function () {
      return self.clients.matchAll();
    })
    .then(function (clients) {
      clients.forEach(client => client.navigate(client.url))
    });
});
