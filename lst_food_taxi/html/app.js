const loadingCard = document.getElementById('loadingCard');
const deniedCard = document.getElementById('deniedCard');
const appArea = document.getElementById('appArea');
const companyText = document.getElementById('companyText');
const pickupText = document.getElementById('pickupText');
const taxiOfflineCard = document.getElementById('taxiOfflineCard');
const orderFormWrap = document.getElementById('orderFormWrap');
const customerNameInput = document.getElementById('customerName');
const destinationInput = document.getElementById('destination');
const notesInput = document.getElementById('notes');
const foodCostInput = document.getElementById('foodCost');
const submitBtn = document.getElementById('submitBtn');
const messageBox = document.getElementById('message');
const successNotice = document.getElementById('successNotice');
const newOrderTab = document.getElementById('newOrderTab');
const historyTab = document.getElementById('historyTab');
const newOrderPanel = document.getElementById('newOrderPanel');
const historyPanel = document.getElementById('historyPanel');
const historyList = document.getElementById('historyList');
const refreshHistoryBtn = document.getElementById('refreshHistoryBtn');

let successTimer = null;
let refreshTimer = null;
let taxiAvailable = false;

async function nui(event, data = {}) {
    try {
        if (typeof globalThis.fetchNui === 'function') return await globalThis.fetchNui(event, data, 'lst_food_taxi');
        const response = await fetch(`https://lst_food_taxi/${event}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=UTF-8' },
            body: JSON.stringify(data)
        });
        return await response.json();
    } catch (error) {
        console.error('NUI request failed:', event, error);
        return { ok: false, message: 'Verbindung zur App fehlgeschlagen.' };
    }
}

function escapeHtml(value) {
    return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function setMessage(text, type = '') {
    messageBox.textContent = text || '';
    messageBox.className = type;
}

function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    submitBtn.textContent = isLoading ? 'Wird gesendet...' : '🚕 Auftrag an Leitstelle senden';
}

function showSuccessNotice() {
    clearTimeout(successTimer);
    successNotice.classList.remove('hidden');
    successTimer = setTimeout(() => successNotice.classList.add('hidden'), 10000);
}

function applyTaxiAvailability(available) {
    taxiAvailable = available === true;
    orderFormWrap.classList.toggle('hidden', !taxiAvailable);
    taxiOfflineCard.classList.toggle('hidden', taxiAvailable);

    if (!taxiAvailable) setMessage('');
}

async function checkTaxiAvailability() {
    const result = await nui('checkFoodTaxiAvailability');
    applyTaxiAvailability(!!(result && result.ok && result.driversOnline));
}

function switchTab(tab) {
    const showHistory = tab === 'history';
    newOrderTab.classList.toggle('active', !showHistory);
    historyTab.classList.toggle('active', showHistory);
    newOrderPanel.classList.toggle('hidden', showHistory);
    historyPanel.classList.toggle('hidden', !showHistory);
    if (showHistory) loadOrderHistory();
    else checkTaxiAvailability();
}

function getStatusInfo(job) {
    if (job.job_status === 'Erledigt') return { label: 'Abgeschlossen', className: 'status-completed', dot: '🟢' };
    if (job.assigned_driver) return { label: 'Fahrer zugeteilt', className: 'status-assigned', dot: '🔵' };
    return { label: 'Bei Leitstelle', className: 'status-waiting', dot: '🟡' };
}

function renderHistory(orders) {
    if (!orders || orders.length === 0) {
        historyList.innerHTML = '<div class="empty-state">Noch keine Lieferaufträge vorhanden.</div>';
        return;
    }

    historyList.innerHTML = orders.map(order => {
        const status = getStatusInfo(order);
        const createdAt = order.created_at ? new Date(order.created_at).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-';
        const driverLine = order.assigned_driver ? `<div class="order-meta">🚕 ${escapeHtml(order.assigned_driver)}</div>` : '';
        return `<article class="order-card"><div class="order-card-top"><strong>${escapeHtml(order.customer_name || 'Unbekannter Kunde')}</strong><span class="order-status ${status.className}">${status.dot} ${status.label}</span></div><div class="order-destination">📍 ${escapeHtml(order.destination || '-')}</div><div class="order-meta">💵 ${Number(order.food_cost || 0)} $</div>${driverLine}<div class="order-time">${createdAt}</div></article>`;
    }).join('');
}

async function loadOrderHistory() {
    historyList.innerHTML = '<div class="empty-state">Aufträge werden geladen...</div>';
    const result = await nui('getFoodDeliveryHistory');
    if (!result || !result.ok) {
        historyList.innerHTML = `<div class="empty-state error-text">${escapeHtml(result?.message || 'Aufträge konnten nicht geladen werden.')}</div>`;
        return;
    }
    renderHistory(result.orders || []);
}

async function loadBusinessData() {
    const result = await nui('getFoodBusinessData');
    loadingCard.classList.add('hidden');

    if (!result || !result.ok || !result.allowed) {
        deniedCard.classList.remove('hidden');
        deniedCard.textContent = result?.message || 'Diese App ist für deinen Job nicht freigeschaltet.';
        return;
    }

    companyText.textContent = result.company || 'Essensgewerbe';
    pickupText.textContent = result.pickup || result.company || '-';
    appArea.classList.remove('hidden');
    await checkTaxiAvailability();

    clearInterval(refreshTimer);
    refreshTimer = setInterval(() => {
        checkTaxiAvailability();
        if (!historyPanel.classList.contains('hidden')) loadOrderHistory();
    }, 10000);
}

submitBtn.addEventListener('click', async () => {
    if (!taxiAvailable) {
        await checkTaxiAvailability();
        if (!taxiAvailable) return;
    }

    const customerName = customerNameInput.value.trim();
    const destination = destinationInput.value.trim();
    const notes = notesInput.value.trim();
    const foodCost = Number(foodCostInput.value || 0);

    if (!customerName) { setMessage('Bitte Kundenname eintragen.', 'error'); customerNameInput.focus(); return; }
    if (!destination) { setMessage('Bitte Lieferort oder PLZ eintragen.', 'error'); destinationInput.focus(); return; }

    setMessage('');
    setLoading(true);
    const result = await nui('createFoodDelivery', { customer_name: customerName, destination, notes, food_cost: foodCost });
    setLoading(false);

    if (!result || !result.ok) {
        setMessage(result?.message || 'Lieferauftrag konnte nicht erstellt werden.', 'error');
        if (result && result.driversOnline === false) applyTaxiAvailability(false);
        return;
    }

    setMessage('');
    showSuccessNotice();
    customerNameInput.value = '';
    destinationInput.value = '';
    notesInput.value = '';
    foodCostInput.value = '0';
});

newOrderTab.addEventListener('click', () => switchTab('new'));
historyTab.addEventListener('click', () => switchTab('history'));
refreshHistoryBtn.addEventListener('click', loadOrderHistory);
loadBusinessData();