// Service Worker for reconstructing split data.bin file from R2
const CACHE_NAME = 'digital-twin-cmms-v1';
const DATA_BIN_PARTS = [
    '/r2-models/BigMirror/data.bin.part-aa',
    '/r2-models/BigMirror/data.bin.part-ab'
];

self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    // Intercept data.bin requests
    if (url.pathname.endsWith('/r2-models/BigMirror/data.bin')) {
        console.log('[SW] Intercepting data.bin request, reconstructing from R2 parts...');
        
        event.respondWith(
            (async () => {
                try {
                    // Fetch all parts in parallel
                    const partResponses = await Promise.all(
                        DATA_BIN_PARTS.map(part => 
                            fetch(new URL(part, url.origin).href)
                        )
                    );
                    
                    // Get ArrayBuffers from all parts
                    const partBuffers = await Promise.all(
                        partResponses.map(r => r.arrayBuffer())
                    );
                    
                    // Calculate total size
                    const totalSize = partBuffers.reduce((sum, buf) => sum + buf.byteLength, 0);
                    console.log(`[SW] Reconstructing data.bin: ${(totalSize / 1024 / 1024).toFixed(2)} MB from ${partBuffers.length} parts`);
                    
                    // Combine all parts
                    const combined = new Uint8Array(totalSize);
                    let offset = 0;
                    
                    for (const buffer of partBuffers) {
                        combined.set(new Uint8Array(buffer), offset);
                        offset += buffer.byteLength;
                    }
                    
                    console.log('[SW] ✅ data.bin reconstructed successfully');
                    
                    // Return as response
                    return new Response(combined.buffer, {
                        status: 200,
                        headers: {
                            'Content-Type': 'application/octet-stream',
                            'Content-Length': totalSize.toString()
                        }
                    });
                } catch (error) {
                    console.error('[SW] ❌ Failed to reconstruct data.bin:', error);
                    return new Response('Failed to reconstruct data.bin', { status: 500 });
                }
            })()
        );
        return;
    }
    
    // Pass through other requests
    event.respondWith(fetch(event.request));
});
