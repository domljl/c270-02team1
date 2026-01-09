const statusEl = document.getElementById("status-message");
const tableBody = document.getElementById("items-body");

const SAMPLE_ITEMS = [
    { name: "Wireless Mouse", description: "Bluetooth optical mouse", price: 29.99, quantity: 42 },
    { name: "Mechanical Keyboard", description: "RGB switches, USB-C", price: 89.0, quantity: 18 },
    { name: "27\" Monitor", description: "1440p IPS display", price: 279.5, quantity: 8 },
    { name: "USB-C Hub", description: "7-port aluminum hub", price: 45.25, quantity: 26 },
];

function showStatus(message, tone = "muted") {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.className = `status ${tone}`;
}

function formatPrice(value) {
    if (value === undefined || value === null) return "—";
    const num = Number(value);
    if (Number.isNaN(num)) return "—";
    return `$${num.toFixed(2)}`;
}

function renderItems(items) {
    tableBody.innerHTML = "";

    if (!items || items.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = 5;
        cell.className = "muted center";
        cell.textContent = "No items yet. Add something to get started.";
        row.appendChild(cell);
        tableBody.appendChild(row);
        return;
    }

    items.forEach((item) => {
        const row = document.createElement("tr");

        const name = document.createElement("td");
        name.textContent = item.name || "Untitled item";

        const description = document.createElement("td");
        description.textContent = item.description || "—";

        const price = document.createElement("td");
        price.textContent = formatPrice(item.price);

        const quantity = document.createElement("td");
        quantity.textContent = Number.isInteger(item.quantity) ? item.quantity : 0;

        const actions = document.createElement("td");
        actions.className = "actions-col";

        const actionGroup = document.createElement("div");
        actionGroup.className = "row-actions";

        const editBtn = document.createElement("button");
        editBtn.className = "btn ghost small";
        editBtn.type = "button";
        editBtn.textContent = "Edit";
        editBtn.title = "Edit functionality will be added later.";
        editBtn.addEventListener("click", () => {
            showStatus("Editing items will be available later.", "warn");
        });

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "btn ghost small";
        deleteBtn.type = "button";
        deleteBtn.textContent = "Delete";
        deleteBtn.title = "Delete functionality will be added later.";
        deleteBtn.addEventListener("click", () => {
            showStatus("Deleting items will be available later.", "warn");
        });

        actionGroup.appendChild(editBtn);
        actionGroup.appendChild(deleteBtn);
        actions.appendChild(actionGroup);

        row.appendChild(name);
        row.appendChild(description);
        row.appendChild(price);
        row.appendChild(quantity);
        row.appendChild(actions);

        tableBody.appendChild(row);
    });
}

async function fetchInventory() {
    showStatus("Loading inventory…", "muted");

    try {
        const res = await fetch("/items");
        if (!res.ok) throw new Error(`API returned ${res.status}`);
        const data = await res.json();

        const normalized = (data || []).map((item) => ({
            name: item.name || "Untitled item",
            description: item.description || "—",
            price: item.price ?? null,
            quantity: item.quantity ?? 0,
        }));

        renderItems(normalized);
        showStatus("Loaded inventory from the API.", "success");
    } catch (err) {
        console.warn("Falling back to sample data:", err);
        renderItems(SAMPLE_ITEMS);
        showStatus("API not reachable yet. Showing sample data.", "warn");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    fetchInventory();
});
