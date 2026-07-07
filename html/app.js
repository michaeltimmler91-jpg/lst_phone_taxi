const params = new URLSearchParams(window.location.search);
const phoneMode =
    params.get('phone') === '1' ||
    window.location.pathname.endsWith('/phone.html') ||
    document.body.classList.contains('phone-ui');

if (phoneMode) {
    document.body.classList.add('phone-mode');
}

async function nui(event, data = {}) {
    const resource = 'lst_phone_taxi';

    try {
        if (phoneMode && typeof globalThis.fetchNui === 'function') {
            return await globalThis.fetchNui(event, data, resource);
        }

        const response = await fetch(`https://${resource}/${event}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=UTF-8'
            },
            body: JSON.stringify(data)
        });

        return await response.json();
    }
    catch (error) {
        console.error('NUI fetch failed:', event, error);

        return {
            ok: false,
            driversOnline: false,
            message: 'Verbindung zur Taxi-App fehlgeschlagen.'
        };
    }
}

const pickupInput = document.getElementById('pickup');
const destinationInput = document.getElementById('destination');
const notesInput = document.getElementById('notes');
const submitBtn = document.getElementById('submitBtn');
const closeBtn = document.getElementById('closeBtn');
const messageBox = document.getElementById('message');
const formBox = document.getElementById('formBox');
const offlineBox = document.getElementById('offlineBox');
const loadingBox = document.getElementById('loadingBox');
const activeOrderBox = document.getElementById('activeOrderBox');
const activeOrderTitle = document.getElementById('activeOrderTitle');
const activeOrderText = document.getElementById('activeOrderText');

let driverCheckTimer = null;
let driverCheckInterval = 10000;
let currentRenderKey = '';
let completedSeenTimer = null;
let completedSeenJobId = null;
const COMPLETED_VISIBLE_MS = 30000;

function setMessage(text, type = '') {
    messageBox.className = type;
    messageBox.innerText = text;
}

function escapeHtml(value) {
    return String(value || '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function orderDetailsHtml(order, showDriver = false) {
    const driver = order?.assigned_driver || '';
    const pickup = order?.pickup_location || '-';
    const destination = order?.destination || '-';

    return `
        <div class="details-list">
            ${showDriver && driver ? `
                <div class="detail-row">
                    <span class="detail-icon">👤</span>
                    <div class="detail-content">
                        <span class="detail-label">Fahrer</span>
                        <span class="detail-value">${escapeHtml(driver)}</span>
                    </div>
                </div>
            ` : ''}
            <div class="detail-row">
                <span class="detail-icon">📍</span>
                <div class="detail-content">
                    <span class="detail-label">Abholort</span>
                    <span class="detail-value">${escapeHtml(pickup)}</span>
                </div>
            </div>
            <div class="detail-row">
                <span class="detail-icon">🏁</span>
                <div class="detail-content">
                    <span class="detail-label">Ziel</span>
                    <span class="detail-value">${escapeHtml(destination)}</span>
                </div>
            </div>
        </div>
    `;
}

function isTypingInForm() {
    return document.activeElement === pickupInput ||
        document.activeElement === destinationInput ||
        document.activeElement === notesInput;
}

function clearCompletedSeenTimer() {
    if (completedSeenTimer) {
        clearTimeout(completedSeenTimer);
        completedSeenTimer = null;
    }
}

function scheduleCompletedSeen(order) {
    if (!order?.id) return;
    if (completedSeenJobId === order.id && completedSeenTimer) return;

    clearCompletedSeenTimer();
    completedSeenJobId = order.id;

    completedSeenTimer = setTimeout(async () => {
        await nui('markCompletedSeen', { jobId: order.id });
        completedSeenTimer = null;
        completedSeenJobId = null;
        currentRenderKey = '';
        await checkDrivers(true);
    }, COMPLETED_VISIBLE_MS);
}

function makeOrderKey(prefix, order) {
    return [
        prefix,
        order?.id || '',
        order?.job_status || '',
        order?.phone_status || '',
        order?.assigned_driver || '',
        order?.pickup_location || '',
        order?.destination || ''
    ].join('|');
}

function makeRenderKey(result) {
    if (result?.hasCompletedOrder && result.completedOrder) {
        return makeOrderKey('completed', result.completedOrder);
    }

    if (result?.hasActiveOrder && result.activeOrder) {
        return makeOrderKey('active', result.activeOrder);
    }

    if (result?.driversOnline === true) {
        return 'form';
    }

    return 'offline';
}

function resetBoxes() {
    loadingBox.style.display = 'none';
    formBox.style.display = 'none';
    offlineBox.style.display = 'none';
    activeOrderBox.style.display = 'none';
    activeOrderBox.className = 'card active-order-card';
}

function showStatusCard() {
    activeOrderBox.style.display = 'block';
    activeOrderBox.classList.remove('status-enter');
    void activeOrderBox.offsetWidth;
    activeOrderBox.classList.add('status-enter');
}

function renderCompletedOrder(order) {
    resetBoxes();

    activeOrderBox.classList.add('completed-card');
    activeOrderTitle.innerHTML = '<span class="status-badge completed-badge">✅</span><span>Fahrt abgeschlossen</span>';
    activeOrderText.innerHTML = `
        <div class="status-copy">
            <p class="status-main">Vielen Dank für deine Fahrt! ❤️</p>
            <p class="status-sub">Wir hoffen, du bist gut angekommen.</p>
            <p class="status-sub">Diese Meldung verschwindet automatisch nach 30 Sekunden.</p>
        </div>
        ${orderDetailsHtml(order, true)}
    `;
    showStatusCard();
    scheduleCompletedSeen(order);
}

function renderActiveOrder(order) {
    clearCompletedSeenTimer();
    resetBoxes();

    const status = order?.job_status || 'Offen';
    const driver = order?.assigned_driver || '';

    if (status === 'Übernommen' || status === 'Unterwegs' || status === 'Fahrer angekommen') {
        activeOrderBox.classList.add('driver-card');
        activeOrderTitle.innerHTML = '<span class="status-badge driver-badge">🚖</span><span>Fahrer unterwegs</span>';
        activeOrderText.innerHTML = `
            <div class="status-copy">
                <p class="status-main">${driver ? `${escapeHtml(driver)} wurde deinem Auftrag zugewiesen.` : 'Ein Fahrer wurde deinem Auftrag zugewiesen.'}</p>
                <p class="status-sub">Bitte bleibe am angegebenen Abholort.</p>
            </div>
            ${orderDetailsHtml(order, true)}
        `;
        showStatusCard();
        return;
    }

    activeOrderBox.classList.add('received-card');
    activeOrderTitle.innerHTML = '<span class="status-badge received-badge">📨</span><span>Auftrag eingegangen</span>';
    activeOrderText.innerHTML = `
        <div class="status-copy">
            <p class="status-main">Deine Anfrage wurde erfolgreich an unsere Leitstelle übermittelt.</p>
            <p class="status-sub">Wir informieren dich, sobald ein Fahrer deinen Auftrag übernimmt.</p>
        </div>
        ${orderDetailsHtml(order, false)}
    `;
    showStatusCard();
}

function renderDriverState(result, force = false) {
    const nextRenderKey = makeRenderKey(result);

    if (!force && nextRenderKey === currentRenderKey) {
        return;
    }

    if (!force && isTypingInForm() && currentRenderKey === 'form' && nextRenderKey === 'form') {
        return;
    }

    currentRenderKey = nextRenderKey;
    resetBoxes();

    if (result?.hasCompletedOrder && result.completedOrder) {
        renderCompletedOrder(result.completedOrder);
        return;
    }

    clearCompletedSeenTimer();

    if (result?.hasActiveOrder && result.activeOrder) {
        renderActiveOrder(result.activeOrder);
        return;
    }

    if (result?.driversOnline === true) {
        formBox.style.display = 'block';
        return;
    }

    offlineBox.style.display = 'block';
}

async function checkDrivers(force = false) {
    const result = await nui('checkTaxiDrivers');

    if (!result || !result.ok) {
        renderDriverState({ driversOnline: false }, force);
        return;
    }

    renderDriverState(result, force);
}

function startDriverCheck() {
    stopDriverCheck();
    currentRenderKey = '';
    resetBoxes();
    loadingBox.style.display = 'block';

    checkDrivers(true);

    driverCheckTimer = setInterval(() => {
        checkDrivers(false);
    }, driverCheckInterval);
}

function stopDriverCheck() {
    if (driverCheckTimer) {
        clearInterval(driverCheckTimer);
        driverCheckTimer = null;
    }
}

function showApp(checkInterval = 10000) {
    document.body.classList.add('visible');
    driverCheckInterval = checkInterval || 10000;
    setMessage('');
    startDriverCheck();
}

function hideApp() {
    document.body.classList.remove('visible');
    stopDriverCheck();
    clearCompletedSeenTimer();
}

async function closeApp() {
    hideApp();

    if (!phoneMode) {
        await nui('closeTaxiApp');
    }
}

async function submitOrder() {
    const pickup_location = pickupInput.value.trim();
    const destination = destinationInput.value.trim();
    const notes = notesInput.value.trim();

    if (!pickup_location) {
        setMessage('Bitte Abholort oder PLZ eintragen.', 'error');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerText = 'Wird gesendet...';
    setMessage('');

    const result = await nui('createTaxiOrder', {
        pickup_location,
        destination,
        notes,
        phoneMode
    });

    submitBtn.disabled = false;
    submitBtn.innerText = 'Taxi rufen';

    if (!result || !result.ok) {
        setMessage(result?.message || 'Auftrag konnte nicht erstellt werden.', 'error');

        if (result?.hasActiveOrder && result.activeOrder) {
            renderActiveOrder(result.activeOrder);
            currentRenderKey = makeRenderKey(result);
        }
        else {
            await checkDrivers(true);
        }

        return;
    }

    pickupInput.value = '';
    destinationInput.value = '';
    notesInput.value = '';

    if (result.hasActiveOrder && result.activeOrder) {
        renderDriverState(result, true);
        return;
    }

    setMessage(result.message || 'Deine Anfrage wurde erfolgreich an die Leitstelle übermittelt.', 'ok');
    await checkDrivers(true);
}

window.addEventListener('message', (event) => {
    if (!event.data) return;

    if (event.data.action === 'open') {
        showApp(event.data.checkInterval);
    }

    if (event.data.action === 'close') {
        hideApp();
    }
});

window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !phoneMode) {
        closeApp();
    }
});

submitBtn.addEventListener('click', submitOrder);

if (closeBtn) {
    closeBtn.addEventListener('click', closeApp);
}

if (phoneMode) {
    if (closeBtn) {
        closeBtn.style.display = 'none';
    }

    showApp();
} else {
    hideApp();
}
