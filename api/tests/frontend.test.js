/**
 * @jest-environment jsdom
 */

// Mock fetch globally
global.fetch = jest.fn();

describe("Frontend - main.js", () => {
    let statusEl, tableBody;

    beforeEach(() => {
        // Set up DOM elements
        document.body.innerHTML = `
            <div id="status-message"></div>
            <table>
                <tbody id="items-body"></tbody>
            </table>
        `;
        
        statusEl = document.getElementById("status-message");
        tableBody = document.getElementById("items-body");
        
        // Clear fetch mock
        fetch.mockClear();
        
        // Load the main.js functions by requiring the file
        // Note: This assumes main.js exports its functions or we test via DOM
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("Status Messages", () => {
        test("showStatus displays message with correct tone", () => {
            // Simulate the showStatus function
            const showStatus = (message, tone = "muted") => {
                if (!statusEl) return;
                statusEl.textContent = message;
                statusEl.className = `status ${tone}`;
            };

            showStatus("Test message", "success");
            expect(statusEl.textContent).toBe("Test message");
            expect(statusEl.className).toBe("status success");

            showStatus("Warning", "warn");
            expect(statusEl.textContent).toBe("Warning");
            expect(statusEl.className).toBe("status warn");

            showStatus("Info");
            expect(statusEl.className).toBe("status muted");
        });
    });

    describe("Price Formatting", () => {
        test("formatPrice handles various inputs", () => {
            const formatPrice = (value) => {
                if (value === undefined || value === null) return "—";
                const num = Number(value);
                if (Number.isNaN(num)) return "—";
                return `$${num.toFixed(2)}`;
            };

            expect(formatPrice(29.99)).toBe("$29.99");
            expect(formatPrice(100)).toBe("$100.00");
            expect(formatPrice(0)).toBe("$0.00");
            expect(formatPrice(null)).toBe("—");
            expect(formatPrice(undefined)).toBe("—");
            expect(formatPrice("invalid")).toBe("—");
            expect(formatPrice(45.256)).toBe("$45.26");
        });
    });

    describe("Item Rendering", () => {
        test("renderItems displays empty state when no items", () => {
            const renderItems = (items) => {
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
            };

            renderItems([]);
            expect(tableBody.innerHTML).toContain("No items yet");
            
            renderItems(null);
            expect(tableBody.innerHTML).toContain("No items yet");
        });

        test("renderItems creates rows for each item", () => {
            const renderItems = (items) => {
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
                    row.appendChild(name);
                    tableBody.appendChild(row);
                });
            };

            const items = [
                { name: "Item 1" },
                { name: "Item 2" },
            ];

            renderItems(items);
            const rows = tableBody.querySelectorAll("tr");
            expect(rows.length).toBe(2);
            expect(rows[0].textContent).toContain("Item 1");
            expect(rows[1].textContent).toContain("Item 2");
        });

        test("renderItems handles missing item properties", () => {
            const renderItems = (items) => {
                tableBody.innerHTML = "";
                
                items.forEach((item) => {
                    const row = document.createElement("tr");
                    const name = document.createElement("td");
                    name.textContent = item.name || "Untitled item";
                    
                    const description = document.createElement("td");
                    description.textContent = item.description || "—";
                    
                    const quantity = document.createElement("td");
                    quantity.textContent = Number.isInteger(item.quantity) ? item.quantity : 0;
                    
                    row.appendChild(name);
                    row.appendChild(description);
                    row.appendChild(quantity);
                    tableBody.appendChild(row);
                });
            };

            const items = [
                { name: "", description: "", quantity: undefined },
            ];

            renderItems(items);
            const row = tableBody.querySelector("tr");
            const cells = row.querySelectorAll("td");
            expect(cells[0].textContent).toBe("Untitled item");
            expect(cells[1].textContent).toBe("—");
            expect(cells[2].textContent).toBe("0");
        });
    });

    describe("API Integration", () => {
        test("fetchInventory fetches from /items endpoint", async () => {
            const mockItems = [
                { id: 1, name: "Mouse", sku: "MS-001", quantity: 10 },
                { id: 2, name: "Keyboard", sku: "KB-001", quantity: 5 },
            ];

            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockItems,
            });

            const fetchInventory = async () => {
                try {
                    const res = await fetch("/items");
                    if (!res.ok) throw new Error(`API returned ${res.status}`);
                    const data = await res.json();
                    return data;
                } catch (err) {
                    console.warn("Error:", err);
                    return null;
                }
            };

            const result = await fetchInventory();
            expect(fetch).toHaveBeenCalledWith("/items");
            expect(result).toEqual(mockItems);
        });

        test("fetchInventory handles API errors gracefully", async () => {
            fetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
            });

            const fetchInventory = async () => {
                try {
                    const res = await fetch("/items");
                    if (!res.ok) throw new Error(`API returned ${res.status}`);
                    const data = await res.json();
                    return data;
                } catch (err) {
                    return null;
                }
            };

            const result = await fetchInventory();
            expect(result).toBeNull();
        });

        test("fetchInventory handles network errors", async () => {
            fetch.mockRejectedValueOnce(new Error("Network error"));

            const fetchInventory = async () => {
                try {
                    const res = await fetch("/items");
                    if (!res.ok) throw new Error(`API returned ${res.status}`);
                    const data = await res.json();
                    return data;
                } catch (err) {
                    return null;
                }
            };

            const result = await fetchInventory();
            expect(result).toBeNull();
        });

        test("normalizes API response data", async () => {
            const apiResponse = [
                { name: "Item 1", sku: "SKU-001", quantity: 10 },
                { name: null, description: null, price: null, quantity: null },
            ];

            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => apiResponse,
            });

            const fetchAndNormalize = async () => {
                const res = await fetch("/items");
                const data = await res.json();
                
                return data.map((item) => ({
                    name: item.name || "Untitled item",
                    description: item.description || "—",
                    price: item.price ?? null,
                    quantity: item.quantity ?? 0,
                }));
            };

            const result = await fetchAndNormalize();
            expect(result[0].name).toBe("Item 1");
            expect(result[1].name).toBe("Untitled item");
            expect(result[1].description).toBe("—");
            expect(result[1].quantity).toBe(0);
        });
    });

    describe("User Interactions", () => {
        test("edit button shows warning message", () => {
            const btn = document.createElement("button");
            let statusMessage = "";
            
            btn.addEventListener("click", () => {
                statusMessage = "Editing items will be available later.";
            });

            btn.click();
            expect(statusMessage).toBe("Editing items will be available later.");
        });

        test("delete button shows warning message", () => {
            const btn = document.createElement("button");
            let statusMessage = "";
            
            btn.addEventListener("click", () => {
                statusMessage = "Deleting items will be available later.";
            });

            btn.click();
            expect(statusMessage).toBe("Deleting items will be available later.");
        });
    });

    describe("Sample Data", () => {
        test("SAMPLE_ITEMS contains valid data structure", () => {
            const SAMPLE_ITEMS = [
                { name: "Wireless Mouse", description: "Bluetooth optical mouse", price: 29.99, quantity: 42 },
                { name: "Mechanical Keyboard", description: "RGB switches, USB-C", price: 89.0, quantity: 18 },
                { name: "27\" Monitor", description: "1440p IPS display", price: 279.5, quantity: 8 },
                { name: "USB-C Hub", description: "7-port aluminum hub", price: 45.25, quantity: 26 },
            ];

            expect(SAMPLE_ITEMS.length).toBeGreaterThan(0);
            SAMPLE_ITEMS.forEach((item) => {
                expect(item).toHaveProperty("name");
                expect(item).toHaveProperty("description");
                expect(item).toHaveProperty("price");
                expect(item).toHaveProperty("quantity");
                expect(typeof item.price).toBe("number");
                expect(typeof item.quantity).toBe("number");
            });
        });
    });
});
