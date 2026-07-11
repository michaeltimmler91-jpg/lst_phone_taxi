(() => {
    const WAIT_FOR_NUI_MS = 100;
    const FORM_TTL_MS = 60000;
    const ACTIVE_TTL_MS = 15000;
    const COMPLETED_TTL_MS = 30000;

    let cachedStatus = null;
    let cachedAt = 0;
    let cacheTtl = 0;
    let requestInFlight = null;
    let installed = false;

    function chooseTtl(result) {
        if (result?.hasActiveOrder) return ACTIVE_TTL_MS;
        if (result?.hasCompletedOrder) return COMPLETED_TTL_MS;
        return FORM_TTL_MS;
    }

    function invalidateStatusCache() {
        cachedStatus = null;
        cachedAt = 0;
        cacheTtl = 0;
    }

    function install() {
        if (installed || typeof globalThis.fetchNui !== 'function') return false;

        const originalFetchNui = globalThis.fetchNui.bind(globalThis);

        globalThis.fetchNui = async function(event, data, resource) {
            if (resource !== 'lst_phone_taxi') {
                return originalFetchNui(event, data, resource);
            }

            if (event === 'createTaxiOrder' || event === 'markCompletedSeen') {
                invalidateStatusCache();
                return originalFetchNui(event, data, resource);
            }

            if (event !== 'checkTaxiDrivers') {
                return originalFetchNui(event, data, resource);
            }

            const now = Date.now();

            if (document.hidden && cachedStatus) {
                return cachedStatus;
            }

            if (cachedStatus && now - cachedAt < cacheTtl) {
                return cachedStatus;
            }

            if (requestInFlight) {
                return requestInFlight;
            }

            requestInFlight = originalFetchNui(event, data, resource)
                .then(result => {
                    cachedStatus = result;
                    cachedAt = Date.now();
                    cacheTtl = chooseTtl(result);
                    return result;
                })
                .finally(() => {
                    requestInFlight = null;
                });

            return requestInFlight;
        };

        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                invalidateStatusCache();
            }
        });

        window.addEventListener('pagehide', invalidateStatusCache);
        installed = true;
        return true;
    }

    if (!install()) {
        const timer = setInterval(() => {
            if (install()) clearInterval(timer);
        }, WAIT_FOR_NUI_MS);

        setTimeout(() => clearInterval(timer), 10000);
    }
})();