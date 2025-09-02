// Login and register functions similar, but add register
document.getElementById('registerForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const username = document.getElementById('regUsername').value;
    const password = document.getElementById('regPassword').value;
    const name = document.getElementById('regName').value;
    fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, name })
    }).then(res => res.json()).then(data => {
        if (data.error) alert(data.error);
        else alert(data.message);
    });
});

// loadMemberDashboard updated to show new fields
function loadMemberDashboard() {
    // ... similar, plus
    document.getElementById('fines_total').textContent = data.fines_total;
    document.getElementById('total_capital').textContent = data.total_capital;
    const agendasList = document.getElementById('agendas');
    data.agendas.forEach(a => {
        const li = document.createElement('li');
        li.textContent = `${a.date}: ${a.text}`;
        agendasList.appendChild(li);
    });
    const docsList = document.getElementById('documents');
    data.documents.forEach(d => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = `/docs/${d}`;
        a.textContent = d;
        a.download = d;
        li.appendChild(a);
        docsList.appendChild(li);
    });
}

// loadAdminDashboard updated with new forms
function loadAdminDashboard() {
    fetch('/api/admin')
    .then(res => res.json())
    .then(adminData => {
        // Populate members, pending, etc.
        // For pending: list with approve buttons
        const pendingList = document.getElementById('pending');
        adminData.pending.forEach((p, idx) => {
            const li = document.createElement('li');
            li.textContent = `${p.name} (${p.username})`;
            const btn = document.createElement('button');
            btn.textContent = 'Approve';
            btn.onclick = () => {
                fetch('/api/approve', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ index: idx, username: 'admin', password: 'adminpass' }) // Update to prompt or store token later
                }).then(() => location.reload());
            };
            li.appendChild(btn);
            pendingList.appendChild(li);
        });
        
        // Report
        document.getElementById('report').textContent = adminData.report;
        
        // Other populates similar
        
        // New forms: addMemberForm, fineForm, agendaForm
        document.getElementById('addMemberForm').addEventListener('submit', e => {
            e.preventDefault();
            const username = document.getElementById('addUsername').value;
            const password = document.getElementById('addPassword').value;
            const name = document.getElementById('addName').value;
            fetch('/api/add-member', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, name })
            }).then(() => alert('Member added!'));
        });
        
        document.getElementById('fineForm').addEventListener('submit', e => {
            e.preventDefault();
            const memberId = document.getElementById('fineMember').value;
            const amount = parseFloat(document.getElementById('fineAmount').value);
            fetch('/api/fine', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ memberId, amount, username: 'admin', password: 'adminpass' })
            }).then(() => alert('Fine added!'));
        });
        
        document.getElementById('agendaForm').addEventListener('submit', e => {
            e.preventDefault();
            const date = document.getElementById('agendaDate').value;
            const text = document.getElementById('agendaText').value;
            fetch('/api/agenda', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date, text, username: 'admin', password: 'adminpass' })
            }).then(() => alert('Agenda posted!'));
        });
        
        // Populate selects for fineMember, etc. similar to others
    });
}

// Update other forms to include admin credentials (temp; better to use sessions/JWT later)
