// Contributed by: Dominic (24021835), Vicknesh (24010102), Eisa (24011357)

// DOM hooks used throughout the page.
const tableBody = document.getElementById("items-body");
const modal = document.getElementById("confirm-modal");
const confirmDeleteBtn = document.getElementById("confirm-delete");
const cancelDeleteBtn = document.getElementById("cancel-delete");
const searchInput = document.getElementById("search-input");

// Tracks which row is pending deletion and the debounce timer for search.
let pendingDeleteId = null;
let searchTimer = null;

// No-op placeholder: UI no longer shows inline status; kept to avoid breaking calls.
function showStatus() { }

// Formats a price as $X.XX or returns an em dash when missing/invalid.
function formatPrice(value) {
    if (value === undefined || value === null) return "—";
    const num = Number(value);
    if (Number.isNaN(num)) return "—";
    return `$${num.toFixed(2)}`;
}

// Renders the inventory table; shows an empty-state row when no items exist.
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

// Fetches inventory from the API (with optional search query) and renders results.
// Done by Vicknesh (24010102)
async function fetchInventory(query = "") {
    try {
        const qs = query ? `?q=${encodeURIComponent(query)}` : "";
        const res = await fetch(`/items${qs}`);
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

// Wire up page interactions once DOM is ready.
document.addEventListener("DOMContentLoaded", () => {
    fetchInventory();

    // Confirm delete: calls API, shows status, refreshes table.
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

    // Cancel delete: close modal and clear pending state.
    cancelDeleteBtn?.addEventListener("click", () => {
        pendingDeleteId = null;
        closeModal();
    });

    // Debounced search to avoid spamming the API while typing.
    // Done by Vicknesh (24010102)
    searchInput?.addEventListener("input", (e) => {
        const value = e.target.value || "";
        if (searchTimer) {
            clearTimeout(searchTimer);
        }
        searchTimer = setTimeout(() => {
            fetchInventory(value.trim());
        }, 250);
    });
});

// Opens the confirmation modal.
function openModal() {
    if (modal) modal.classList.remove("hidden");
}

// Closes the confirmation modal.
function closeModal() {
    if (modal) modal.classList.add("hidden");
}
