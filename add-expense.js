document.addEventListener('DOMContentLoaded', () => {
    // --- 1. ELEMENT REFERENCES ---
    // Get references to all the interactive elements on the page.
    const expenseForm = document.getElementById('expenseForm');
    const historyDiv = document.getElementById('expenseHistory');
    const addPersonBtn = document.getElementById('addPersonBtn');
    const newPersonNameInput = document.getElementById('newPersonName');
    const peopleList = document.getElementById('peopleList');
    const paidBySelect = document.getElementById('paidBy');
    const participantsContainer = document.getElementById('participantsContainer');

    // --- 2. STATE MANAGEMENT ---
    // Load the list of people from the browser's local storage.
    // If no list exists, create a default one.
    let people = JSON.parse(localStorage.getItem('people')) || ["Anmol", "Pinki Mishra", "Bhumi"];
    // In a real app with logins, this would be set dynamically.
    let currentUser = "Anmol"; 

    // --- 3. PEOPLE MANAGEMENT FUNCTIONS ---

    // Saves the current list of people to local storage.
    function savePeople() {
        localStorage.setItem('people', JSON.stringify(people));
    }

    // Renders the list of people and updates the form dropdowns/checkboxes.
    function renderPeople() {
        // Part A: Render the list of people with delete buttons
        peopleList.innerHTML = '';
        people.forEach(person => {
            const li = document.createElement('li');
            li.textContent = person;
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '×'; // A nice 'x' for delete
            deleteBtn.className = 'delete-person-btn';
            deleteBtn.title = `Delete ${person}`;
            deleteBtn.onclick = () => {
                if (people.length <= 1) {
                    alert("You cannot delete the last person!");
                    return;
                }
                // Confirm before deleting a person who might be in expenses
                if (confirm(`Are you sure you want to remove ${person}? This won't remove them from past expenses but will remove them from future ones.`)) {
                    people = people.filter(p => p !== person);
                    savePeople();
                    renderPeople(); // Re-render everything
                }
            };
            li.appendChild(deleteBtn);
            peopleList.appendChild(li);
        });

        // Part B: Render the 'Paid By' dropdown menu
        paidBySelect.innerHTML = '<option value="" disabled selected>Who Paid?</option>';
        people.forEach(person => {
            const option = document.createElement('option');
            option.value = person;
            option.textContent = person;
            paidBySelect.appendChild(option);
        });

        // Part C: Render the 'Split Between' checkboxes
        participantsContainer.innerHTML = '<legend>Split Between:</legend>';
        people.forEach(person => {
            const label = document.createElement('label');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.name = 'participants';
            checkbox.value = person;
            checkbox.checked = true; // Default to everyone being included
            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(` ${person}`));
            participantsContainer.appendChild(label);
        });
    }

    // Event listener for the "Add Person" button.
    addPersonBtn.addEventListener('click', () => {
        const newName = newPersonNameInput.value.trim();
        if (newName && !people.find(p => p.toLowerCase() === newName.toLowerCase())) {
            people.push(newName);
            savePeople();
            renderPeople();
            newPersonNameInput.value = ''; // Clear the input field
        } else if (!newName) {
            alert('Please enter a name.');
        } else {
            alert('This person already exists in the list.');
        }
    });

    // --- 4. EXPENSE HISTORY FUNCTIONS ---
    function loadHistory() {
        const expenses = JSON.parse(localStorage.getItem('expenses')) || [];
        const personFilter = document.getElementById('filterPerson').value.toLowerCase();
        const categoryFilter = document.getElementById('filterCategory').value.toLowerCase();
        const fromDate = document.getElementById('fromDate').value;
        const toDate = document.getElementById('toDate').value;
        const from = fromDate ? new Date(fromDate) : null;
        const to = toDate ? new Date(toDate) : null;
        historyDiv.innerHTML = "";

        const filteredExpenses = expenses.filter(exp => {
            const expDate = new Date(exp.isoDate); // Use the reliable ISO date for filtering
            const personMatch = !personFilter || exp.paidBy.toLowerCase().includes(personFilter) || exp.participants.join(", ").toLowerCase().includes(personFilter);
            const categoryMatch = !categoryFilter || exp.category.toLowerCase().includes(categoryFilter);
            const fromDateMatch = !from || expDate >= from;
            const toDateMatch = !to || expDate <= to;
            return personMatch && categoryMatch && fromDateMatch && toDateMatch;
        });
        
        // Sort expenses by date, newest first
        const sortedExpenses = filteredExpenses.sort((a, b) => new Date(b.isoDate) - new Date(a.isoDate));

        sortedExpenses.forEach((exp) => {
            const row = document.createElement("div");
            row.className = "expense-row";
            const info = document.createElement("div");
            info.innerHTML = `
                <p><strong>${exp.item}</strong> — ₹${exp.amount} (${exp.category})</p>
                <p style="font-size: 0.9em; color: var(--light-text);">Paid by <strong>${exp.paidBy}</strong> on ${exp.dateTime}</p>
                <p style="font-size: 0.9em; color: var(--light-text);">Split: ${exp.participants.join(", ")} (Each: ₹${exp.share})</p>
            `;
            row.appendChild(info);

            // Only show delete button for the person who added the expense
            if (exp.addedBy === currentUser) {
                const delBtn = document.createElement("button");
                delBtn.textContent = "Delete";
                delBtn.className = "delete-btn";
                delBtn.onclick = () => {
                    const allExpenses = JSON.parse(localStorage.getItem('expenses')) || [];
                    // Find the exact expense to delete using its unique ISO date
                    const originalIndex = allExpenses.findIndex(originalExp => originalExp.isoDate === exp.isoDate && originalExp.item === exp.item);
                    if (originalIndex > -1) {
                        allExpenses.splice(originalIndex, 1);
                        localStorage.setItem("expenses", JSON.stringify(allExpenses));
                        loadHistory(); // Refresh the list
                    }
                };
                row.appendChild(delBtn);
            }
            historyDiv.appendChild(row);
        });
    }

    // --- 5. FORM SUBMISSION ---
    expenseForm.addEventListener("submit", function(e) {
        e.preventDefault(); // Prevent page reload
        const item = document.getElementById("item").value;
        const amount = parseFloat(document.getElementById("amount").value);
        const category = document.getElementById("category").value;
        const paidBy = document.getElementById("paidBy").value;
        const participants = Array.from(document.querySelectorAll('input[name="participants"]:checked')).map(cb => cb.value);
        
        if (!paidBy || participants.length === 0) {
            alert("Please select who paid and at least one participant.");
            return;
        }

        const now = new Date();
        const dateTime = now.toLocaleString('en-IN'); // For display e.g., "27/7/2025, 2:15:05 am"
        const isoDate = now.toISOString(); // For reliable sorting/filtering e.g., "2025-07-26T20:45:05.324Z"
        const share = (amount / participants.length).toFixed(2);

        const expense = { item, amount, category, paidBy, participants, share, dateTime, isoDate, addedBy: currentUser };
        const expenses = JSON.parse(localStorage.getItem("expenses")) || [];
        expenses.push(expense);
        localStorage.setItem("expenses", JSON.stringify(expenses));
        
        expenseForm.reset(); // Clear the form
        document.querySelectorAll('input[name="participants"]').forEach(cb => cb.checked = true); // Re-check all boxes
        loadHistory(); // Update the history list
    });

    // --- 6. INITIALIZATION ---
    // Attach event listeners to all filter inputs to auto-refresh the history
    document.getElementById("filterPerson").addEventListener("input", loadHistory);
    document.getElementById("filterCategory").addEventListener("input", loadHistory);
    document.getElementById("fromDate").addEventListener("change", loadHistory);
    document.getElementById("toDate").addEventListener("change", loadHistory);

    // Initial render of the page content when it first loads
    renderPeople();
    loadHistory();
});

// --- GLOBAL FUNCTIONS (accessible by HTML onclick attributes) ---
function exportCSV() {
    const expenses = JSON.parse(localStorage.getItem("expenses")) || [];
    let csv = "Item,Amount,Category,PaidBy,Participants,Share,DateTime\n";
    expenses.forEach(exp => {
        const participantsStr = `"${exp.participants.join(", ")}"`;
        csv += `${exp.item},${exp.amount},${exp.category},${exp.paidBy},${participantsStr},${exp.share},${exp.dateTime}\n`;
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
a.download = "expenses_history.csv";
    a.click();
}

function clearExpenses() {
    if (confirm("Are you sure you want to delete ALL expense history? This cannot be undone.")) {
        localStorage.removeItem("expenses");
        window.location.reload(); // Reload the page to show the empty state
    }
}
