console.log(" SOS Service Worker loaded");

self.addEventListener("install", (event) => {
    console.log(" Service Worker installed");

    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    console.log(" Service Worker activated");

    event.waitUntil(
        self.clients.claim()
    );
});


// =====================================
// INTERCEPT NETWORK REQUESTS
// =====================================

self.addEventListener("fetch", (event) => {

    console.log(
        " Fetch request:",
        event.request.url
    );

});