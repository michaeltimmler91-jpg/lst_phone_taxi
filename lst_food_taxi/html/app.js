const loadingCard = document.getElementById('loadingCard');
const deniedCard = document.getElementById('deniedCard');
const formArea = document.getElementById('formArea');
const companyText = document.getElementById('companyText');
const pickupText = document.getElementById('pickupText');
const customerNameInput = document.getElementById('customerName');
const destinationInput = document.getElementById('destination');
const notesInput = document.getElementById('notes');
const foodCostInput = document.getElementById('foodCost');
const paidBySelect = document.getElementById('paidBy');
const submitBtn = document.getElementById('submitBtn');
const messageBox = document.getElementById('message');

async function nui(event, data = {}) {
    try {
        if (typeof globalThis.fetchNui === 'function') {
            return await globalThis.fetchNui(event, data, 'lst_food_taxi');
        }

        const response = await fetch(`https://lst_food_taxi/${event}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=UTF-8'
            },
            body: JSON.stringify(data)
        });

        return await response.json();
    } catch (error) {
        console.error('NUI request failed:', event, error);
        return { ok: false, message: 'Verbindung zur App fehlgeschlagen.' };
    }
}

function setMessage(text, type = '') {
    messageBox.textContent = text || '';
    messageBox.className = type;
}

function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    submitBtn.textContent = isLoading ? 'Wird gesendet...' : '🚕 Lieferauftrag senden';
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
    formArea.classList.remove('hidden');
}

submitBtn.addEventListener('click', async () => {
    const customerName = customerNameInput.value.trim();
    const destination = destinationInput.value.trim();
    const notes = notesInput.value.trim();
    const foodCost = Number(foodCostInput.value || 0);
    const paidBy = paidBySelect.value;

    if (!customerName) {
        setMessage('Bitte Kundenname eintragen.', 'error');
        customerNameInput.focus();
        return;
    }

    if (!destination) {
        setMessage('Bitte Lieferort oder PLZ eintragen.', 'error');
        destinationInput.focus();
        return;
    }

    setMessage('');
    setLoading(true);

    const result = await nui('createFoodDelivery', {
        customer_name: customerName,
        destination,
        notes,
        food_cost: foodCost,
        food_paid_by: paidBy
    });

    setLoading(false);

    if (!result || !result.ok) {
        setMessage(result?.message || 'Lieferauftrag konnte nicht erstellt werden.', 'error');
        return;
    }

    setMessage(result.message || 'Lieferauftrag wurde gesendet.', 'ok');
    customerNameInput.value = '';
    destinationInput.value = '';
    notesInput.value = '';
    foodCostInput.value = '0';
    paidBySelect.value = 'firma';
});

loadBusinessData();
