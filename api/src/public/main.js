const statusEl = null;
const tableBody = document.getElementById("items-body");
const modal = document.getElementById("confirm-modal");
const confirmDeleteBtn = document.getElementById("confirm-delete");
const cancelDeleteBtn = document.getElementById("cancel-delete");
let pendingDeleteId = null;

function showStatus() { }

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
        editBtn.title = "Edit Item Information";
        editBtn.addEventListener("click", () => {
            window.location.href = `/edit-item.html?id=${item.id}`;
        });


        const deleteBtn = document.createElement("button");
        deleteBtn.className = "btn ghost small";
        deleteBtn.type = "button";
        deleteBtn.textContent = "Delete";
        deleteBtn.title = "Delete this item";
        deleteBtn.addEventListener("click", async () => {
            if (!item.id) return;
            pendingDeleteId = item.id;
            openModal();
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
    try {
        const res = await fetch("/items");
        if (!res.ok) throw new Error(`API returned ${res.status}`);
        const data = await res.json();

        const normalized = (data || []).map((item) => ({
            id: item.id,
            name: item.name || "Untitled item",
            description: item.description || "—",
            price: item.price ?? null,
            quantity: item.quantity ?? 0,
        }));

        renderItems(normalized);
    } catch (err) {
        console.warn("API not reachable:", err);
        renderItems([]);
        showStatus("API not reachable yet. No data loaded.", "warn");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    fetchInventory();

    confirmDeleteBtn?.addEventListener("click", async () => {
        if (!pendingDeleteId) {
            closeModal();
            return;
        }
        try {
            const res = await fetch(`/items/${pendingDeleteId}`, { method: "DELETE" });
            if (!res.ok) {
                const errorText = (await res.json().catch(() => ({}))).error || "Unable to delete item";
                showStatus(errorText, "error");
                closeModal();
                return;
            }
            showStatus("Item deleted successfully.", "success");
            closeModal();
            fetchInventory();
        } catch (err) {
            console.error("Error deleting item:", err);
            showStatus("Server error while deleting item.", "error");
            closeModal();
        } finally {
            pendingDeleteId = null;
        }
    });

    cancelDeleteBtn?.addEventListener("click", () => {
        pendingDeleteId = null;
        closeModal();
    });
});

function openModal() {
    if (modal) modal.classList.remove("hidden");
}

function closeModal() {
    if (modal) modal.classList.add("hidden");
}
