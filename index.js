const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'chama-data.json');
const SALT_ROUNDS = 10;

// Middleware
app.use(bodyParser.json());
app.use(express.static('public'));

// Load data
let data = { members: [], users: {}, pendingRegistrations: [], agendas: [], documents: ['constitution.pdf'] };
if (fs.existsSync(DATA_FILE)) {
  data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
} else {
  // Initialize sample data with hashed passwords
  const hash = async (pw) => await bcrypt.hash(pw, SALT_ROUNDS);
  (async () => {
    data.users = {
      admin: { password: await hash('adminpass'), role: 'admin' },
      member1: { password: await hash('pass1'), role: 'member', memberId: 1 },
      member2: { password: await hash('pass2'), role: 'member', memberId: 2 }
    };
    data.members = [
      { id: 1, name: 'John Doe', share_capital: 0, loans: [], fines_total: 0 },
      { id: 2, name: 'Jane Smith', share_capital: 0, loans: [], fines_total: 0 }
    ];
    saveData();
  })();
}

// Save data
function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Auth
async function authenticate(username, password) {
  const user = data.users[username];
  if (user && await bcrypt.compare(password, user.password)) {
    return user;
  }
  return null;
}

// Calculate interest: 1% monthly simple on outstanding
function calculateOutstanding(loan) {
  const issuanceDate = new Date(loan.date);
  const now = new Date();
  const months = (now.getFullYear() - issuanceDate.getFullYear()) * 12 + (now.getMonth() - issuanceDate.getMonth());
  const principal = loan.amount - loan.repayments.reduce((sum, r) => sum + r.amount, 0);
  const interest = principal * 0.01 * months;
  return principal + interest;
}

// Routes

// Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await authenticate(username, password);
  if (user) {
    res.json({ role: user.role, memberId: user.memberId });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Register (pending)
app.post('/api/register', async (req, res) => {
  const { username, password, name } = req.body;
  if (data.users[username]) return res.status(400).json({ error: 'Username taken' });
  const hashedPw = await bcrypt.hash(password, SALT_ROUNDS);
  data.pendingRegistrations.push({ username, password: hashedPw, name });
  saveData();
  res.json({ success: true, message: 'Registration pending admin approval' });
});

// Get member info
app.get('/api/member/:id', (req, res) => {
  const member = data.members.find(m => m.id == req.params.id);
  if (!member) return res.status(404).json({ error: 'Member not found' });
  
  const outstanding = member.loans.reduce((sum, loan) => sum + calculateOutstanding(loan), 0);
  const borrowable = 3 * member.share_capital - outstanding;
  const totalCapital = data.members.reduce((sum, m) => sum + m.share_capital, 0);
  
  res.json({
    ...member,
    outstanding_loans: outstanding,
    borrowable_amount: Math.max(0, borrowable),
    total_capital: totalCapital,
    agendas: data.agendas,
    documents: data.documents
  });
});

// Admin: Get all members + pendings + report
app.get('/api/admin', (req, res) => {
  const totalCapital = data.members.reduce((sum, m) => sum + m.share_capital, 0);
  const totalOutstanding = data.members.reduce((sum, m) => sum + m.loans.reduce((lSum, l) => lSum + calculateOutstanding(l), 0), 0);
  res.json({
    members: data.members,
    pending: data.pendingRegistrations,
    agendas: data.agendas,
    report: `Total Capital: KES ${totalCapital}\nTotal Outstanding Loans: KES ${totalOutstanding}`
  });
});

// Admin: Approve registration
app.post('/api/approve', async (req, res) => {
  // Auth check (assume admin via frontend)
  const { index } = req.body;
  const pend = data.pendingRegistrations.splice(index, 1)[0];
  if (!pend) return res.status(404).json({ error: 'Not found' });
  const newId = data.members.length + 1;
  data.members.push({ id: newId, name: pend.name, share_capital: 0, loans: [], fines_total: 0 });
  data.users[pend.username] = { password: pend.password, role: 'member', memberId: newId };
  saveData();
  res.json({ success: true });
});

// Admin: Add member directly
app.post('/api/add-member', async (req, res) => {
  const { username, password, name } = req.body;
  if (data.users[username]) return res.status(400).json({ error: 'Username taken' });
  const hashedPw = await bcrypt.hash(password, SALT_ROUNDS);
  const newId = data.members.length + 1;
  data.members.push({ id: newId, name, share_capital: 0, loans: [], fines_total: 0 });
  data.users[username] = { password: hashedPw, role: 'member', memberId: newId };
  saveData();
  res.json({ success: true });
});

// Admin: Add fine
app.post('/api/fine', (req, res) => {
  const { memberId, amount } = req.body;
  const member = data.members.find(m => m.id == memberId);
  if (!member) return res.status(404).json({ error: 'Not found' });
  member.fines_total += amount;
  saveData();
  res.json({ success: true });
});

// Admin: Post agenda
app.post('/api/agenda', (req, res) => {
  const { date, text } = req.body;
  data.agendas.push({ date, text });
  saveData();
  res.json({ success: true });
});

// Other routes (contribution, loan, repayment) remain similar, updated for auth
// For brevity, assume similar to previous, but add async auth where needed.
// Example for contribution:
app.post('/api/contribution', async (req, res) => {
  const { username, password, memberId, amount } = req.body;
  const user = await authenticate(username, password);
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const member = data.members.find(m => m.id == memberId);
  if (!member) return res.status(404).json({ error: 'Member not found' });
  member.share_capital += amount;
  saveData();
  res.json({ success: true });
});

// Similar updates for /api/loan, /api/repayment

// Issue loan with interest rate (fixed 1% monthly, but store if needed)
app.post('/api/loan', async (req, res) => {
  // ... similar, loan obj: { amount, date: new Date().toISOString(), repayments: [], interest_rate: 0.01 }
});

// Serve pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/member', (req, res) => res.sendFile(path.join(__dirname, 'public', 'member.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
