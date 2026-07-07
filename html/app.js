const phoneMode = new URLSearchParams(window.location.search).get('phone') === '1';

async function nui(event, data = {}) {
    // Immer diese Resource ansprechen. Im lb-phone-iframe wäre GetParentResourceName() sonst lb-phone.
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

let driverCheckTimer = null;
let driverCheckInterval = 10000;

function setMessage(text, type = '') {
    messageBox.className = type;
    messageBox.innerText = text;
}

function renderDriverState(driversOnline) {
    loadingBox.style.display = 'none';

    if (driversOnline) {
        offlineBox.style.display = 'none';
        formBox.style.display = 'block';
        setTimeout(() => pickupInput.focus(), 50);
        return;
    }

    formBox.style.display = 'none';
    offlineBox.style.display = 'block';
}

async function checkDrivers() {
    const result = await nui('checkTaxiDrivers');

    if (!result || !result.ok) {
        renderDriverState(false);
        return;
    }

    renderDriverState(result.driversOnline === true);
}

function startDriverCheck() {
    stopDriverCheck();
    loadingBox.style.display = 'block';
    formBox.style.display = 'none';
    offlineBox.style.display = 'none';

    checkDrivers();

    driverCheckTimer = setInterval(() => {
        checkDrivers();
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
        await checkDrivers();
        return;
    }

    pickupInput.value = '';
    destinationInput.value = '';
    notesInput.value = '';
    setMessage(result.message || 'Deine Anfrage wurde erfolgreich an die Leitstelle übermittelt.', 'ok');
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

