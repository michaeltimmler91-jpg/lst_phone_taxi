const phoneMode = new URLSearchParams(window.location.search).get('phone') === '1';

async function nui(event, data = {}) {
    const resource = 'lst_phone_taxi';

    try {
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

function isTypingInForm() {
    return document.activeElement === pickupInput ||
        document.activeElement === destinationInput ||
        document.activeElement === notesInput;
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
}

function renderCompletedOrder(order) {
    resetBoxes();

    const driver = order?.assigned_driver || '';
    const pickup = order?.pickup_location || '-';
    const destination = order?.destination || '-';

    activeOrderTitle.innerText = '✅ Fahrt abgeschlossen';
    activeOrderText.innerHTML = `
        <p>Vielen Dank für deine Fahrt!</p>
        ${driver ? `<p><strong>Fahrer:</strong><br>${escapeHtml(driver)}</p>` : ''}
        <p><strong>Abholort:</strong><br>${escapeHtml(pickup)}</p>
        <p><strong>Ziel:</strong><br>${escapeHtml(destination)}</p>
    `;
    activeOrderBox.style.display = 'block';
}

function renderActiveOrder(order) {
    resetBoxes();

    const status = order?.job_status || 'Offen';
    const driver = order?.assigned_driver || '';
    const pickup = order?.pickup_location || '-';
    const destination = order?.destination || '-';

    if (status === 'Übernommen' || status === 'Unterwegs' || status === 'Fahrer angekommen') {
        activeOrderTitle.innerText = '🚖 Fahrer unterwegs';
        activeOrderText.innerHTML = `
            <p>Dein Taxi ist unterwegs.</p>
            ${driver ? `<p><strong>Fahrer:</strong><br>${escapeHtml(driver)}</p>` : ''}
            <p><strong>Abholort:</strong><br>${escapeHtml(pickup)}</p>
            <p><strong>Ziel:</strong><br>${escapeHtml(destination)}</p>
        `;
        activeOrderBox.style.display = 'block';
        return;
    }

    activeOrderTitle.innerText = '🚕 Auftrag eingegangen';
    activeOrderText.innerHTML = `
        <p>Deine Anfrage ist bei unserer Leitstelle eingegangen.</p>
        <p>Wir informieren dich, sobald ein Fahrer unterwegs ist.</p>
        <p><strong>Abholort:</strong><br>${escapeHtml(pickup)}</p>
        <p><strong>Ziel:</strong><br>${escapeHtml(destination)}</p>
    `;
    activeOrderBox.style.display = 'block';
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
}

async function closeApp() {
    hideApp();
    await nui('closeTaxiApp');
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
    if (event.key === 'Escape') {
        closeApp();
    }
});

submitBtn.addEventListener('click', submitOrder);
closeBtn.addEventListener('click', closeApp);

if (phoneMode) {
    closeBtn.style.display = 'none';
    showApp();
} else {
    hideApp();
}
