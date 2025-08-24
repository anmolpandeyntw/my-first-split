document.addEventListener('DOMContentLoaded', () => {
    // This function runs once the HTML page is fully loaded.
    // It gets the expenses from localStorage, or creates an empty array if none exist.
    const expenses = JSON.parse(localStorage.getItem('expenses')) || [];
    
    // It then calls the two main functions to build the page.
    renderSummary(expenses);
    renderHistory(expenses);
});

function renderSummary(expenses) {
    const summary = {};
    const summaryContainer = document.getElementById('summary');

    // If there are no expenses, display a helpful message.
    if (expenses.length === 0) {
        summaryContainer.innerHTML = "<p>No expense data found. Go to 'Add Expense' to get started!</p>";
        return;
    }

    // --- Calculation Logic ---
    // Loop through each expense to calculate totals.
    expenses.forEach(exp => {
        // Initialize a person in the summary if they don't exist yet.
        if (!summary[exp.paidBy]) {
            summary[exp.paidBy] = { paid: 0, owed: 0 };
        }
        // Add the full amount to the person who paid.
        summary[exp.paidBy].paid += parseFloat(exp.amount);

        // For each person involved in the split...
        exp.participants.forEach(name => {
            if (!summary[name]) {
                summary[name] = { paid: 0, owed: 0 };
            }
            // ...add their share of the cost to their 'owed' total.
            summary[name].owed += parseFloat(exp.share);
        });
    });

    summaryContainer.innerHTML = ''; // Clear any previous summary content.

    // --- Display Logic ---
    // Loop through the calculated summary to display it on the page.
    for (const [name, data] of Object.entries(summary)) {
        const net = data.paid - data.owed; // Calculate the net balance.
        const row = document.createElement('div');
        row.className = 'expense-row';
        
        // Determine if the person gets money back or owes money.
        let netStatus = net >= 0 ? 'gets back' : 'owes';
        let netColor = net >= 0 ? 'var(--success-color)' : 'var(--danger-color)';

        // Create the HTML for the summary row.
        row.innerHTML = `
            <div>
                <p style="font-size: 1.2em; color: var(--text-color);"><strong>${name}</strong></p>
                <p style="font-size: 1em; color: ${netColor};"><strong>Overall, ${name} ${netStatus} ₹${Math.abs(net).toFixed(2)}</strong></p>
                <p style="font-size: 0.9em; color: var(--light-text);">Paid: ₹${data.paid.toFixed(2)} | Share of expenses: ₹${data.owed.toFixed(2)}</p>
            </div>
        `;
        summaryContainer.appendChild(row);
    }
}

function renderHistory(expenses) {
    const historyDiv = document.getElementById('expenseHistory');
    historyDiv.innerHTML = ""; // Clear previous history.

    if (expenses.length === 0) {
        historyDiv.innerHTML = "<p>No history to display.</p>";
        return;
    }

    // Sort expenses by date to show the newest ones first.
    const sortedExpenses = expenses.sort((a, b) => {
        // This handles the date format 'dd/mm/yyyy, hh:mm:ss' from toLocaleString('en-IN')
        const dateA = new Date(a.dateTime.split(', ')[0].split('/').reverse().join('-'));
        const dateB = new Date(b.dateTime.split(', ')[0].split('/').reverse().join('-'));
        return dateB - dateA;
    });

    // Create and display a row for each expense item.
    sortedExpenses.forEach(exp => {
        const row = document.createElement("div");
        row.className = "expense-row";
        row.innerHTML = `
            <div>
                <p><strong>${exp.item}</strong> — ₹${exp.amount} (${exp.category})</p>
                <p style="font-size: 0.9em; color: var(--light-text);">Paid by <strong>${exp.paidBy}</strong> on ${exp.dateTime}</p>
                <p style="font-size: 0.9em; color: var(--light-text);">Split: ${exp.participants.join(", ")} (Each: ₹${exp.share})</p>
            </div>
        `;
        historyDiv.appendChild(row);
    });
}


function downloadSummaryCSV() {
    const expenses = JSON.parse(localStorage.getItem('expenses')) || [];
    const summary = {};

    // This calculation is repeated here to ensure the CSV is self-contained.
    expenses.forEach(exp => {
        if (!summary[exp.paidBy]) summary[exp.paidBy] = { paid: 0, owed: 0 };
        summary[exp.paidBy].paid += parseFloat(exp.amount);
        exp.participants.forEach(name => {
            if (!summary[name]) summary[name] = { paid: 0, owed: 0 };
            summary[name].owed += parseFloat(exp.share);
        });
    });

    let csv = 'Name,Total Paid,Total Share,Net Balance\n';
    for (const [name, data] of Object.entries(summary)) {
        const net = data.paid - data.owed;
        csv += `${name},${data.paid.toFixed(2)},${data.owed.toFixed(2)},${net.toFixed(2)}\n`;
    }

    // Create a temporary link to trigger the download.
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'split_summary.csv';
    a.click();
}
