const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const PDFDocument = require('pdfkit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'claim-management-app-super-secret-key-12345';

app.use(cors());
app.use(express.json());

// Paths to JSON storage
const usersPath = path.join(__dirname, 'data', 'users.json');
const claimsPath = path.join(__dirname, 'data', 'claims.json');
const notificationsPath = path.join(__dirname, 'data', 'notifications.json');
const auditLogsPath = path.join(__dirname, 'data', 'auditLogs.json');

// Ensure data folder exists
const ensureDataFolder = () => {
  const dir = path.join(__dirname, 'data');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Seed Users if not present or empty
const seedUsers = () => {
  ensureDataFolder();
  if (!fs.existsSync(usersPath) || fs.readFileSync(usersPath, 'utf8').trim() === '' || fs.readFileSync(usersPath, 'utf8').trim() === '[]') {
    const defaultUsers = [
      {
        id: 1,
        username: 'admin',
        password: bcrypt.hashSync('password123', 10),
        name: 'Administrator',
        role: 'Admin'
      },
      {
        id: 2,
        username: 'clerk1',
        password: bcrypt.hashSync('password123', 10),
        name: 'Clerk Analyst',
        role: 'Clerk'
      },
      {
        id: 3,
        username: 'manager1',
        password: bcrypt.hashSync('password123', 10),
        name: 'Operations Manager',
        role: 'Manager'
      },
      {
        id: 4,
        username: 'exec1',
        password: bcrypt.hashSync('password123', 10),
        name: 'Senior Executive',
        role: 'Executive'
      }
    ];
    fs.writeFileSync(usersPath, JSON.stringify(defaultUsers, null, 2));
    console.log('Seeded default users database');
  }
};

// Seed Claims if not present
const seedClaims = () => {
  ensureDataFolder();
  if (!fs.existsSync(claimsPath) || fs.readFileSync(claimsPath, 'utf8').trim() === '' || fs.readFileSync(claimsPath, 'utf8').trim() === '[]') {
    const defaultClaims = [
      {
        id: 'CLM-1001',
        accountNumber: 'LN987654321',
        borrowerName: 'John Doe',
        loanAmount: 250000,
        outstandingAmount: 210000,
        interestRate: 8.5,
        dpd: 125,
        lastPaymentDate: '2026-01-20',
        npaStatus: true,
        npaCategory: 'Substandard',
        status: 'Pending Review',
        aiRecommendation: 'Approve',
        aiConfidence: 92,
        justification: 'Loan is overdue by 125 days (NPA status confirmed). Outstanding balance is 84% of the original loan. Recommend filing for collateral guarantee recovery.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        history: [
          {
            user: 'system',
            action: 'CREATED',
            comment: 'Claim created and auto-evaluated by AI rules.',
            timestamp: new Date().toISOString()
          }
        ],
        documents: [],
        fraudAlerts: [],
        fraudStatus: 'Safe',
        legalAction: {
          caseStatus: 'None',
          caseNumber: '',
          lawyerName: '',
          settlementAmount: 0,
          settlementDate: '',
          auctionDetails: {
            assetType: '',
            reservePrice: 0,
            currentBid: 0,
            auctionDate: '',
            status: ''
          }
        },
        refundDetails: {
          refundAmount: 0,
          beneficiaryName: '',
          bankDetails: '',
          refundStatus: 'None',
          requestedBy: '',
          requestedAt: '',
          resolvedBy: '',
          resolvedAt: '',
          notes: ''
        }
      }
    ];
    fs.writeFileSync(claimsPath, JSON.stringify(defaultClaims, null, 2));
    console.log('Seeded default claims database');
  }
};

// Helper methods to read/write files safely
const readJsonFile = (filePath) => {
  try {
    if (!fs.existsSync(filePath)) return [];
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error(`Error reading file ${filePath}:`, err);
    return [];
  }
};

const writeJsonFile = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.error(`Error writing file ${filePath}:`, err);
    return false;
  }
};

// Seeding helpers
seedUsers();
seedClaims();

// Add Audit Log
const addAuditLog = (username, action, details) => {
  const logs = readJsonFile(auditLogsPath);
  const log = {
    id: 'LOG-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    username,
    action,
    details,
    timestamp: new Date().toISOString()
  };
  logs.unshift(log); // Keep latest logs at top
  writeJsonFile(auditLogsPath, logs);
};

// Create In-App Notification
const createNotification = (userId, message) => {
  const notifications = readJsonFile(notificationsPath);
  const notif = {
    id: 'NTF-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    userId: userId || 'all', // "all" or specific role/username
    message,
    read: false,
    createdAt: new Date().toISOString()
  };
  notifications.unshift(notif);
  writeJsonFile(notificationsPath, notifications);
};

// Middleware: Verify JWT
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Access denied. No token provided.' });

  const token = authHeader.split(' ')[1];
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token.' });
    req.user = user;
    next();
  });
};

// Middleware: Require Roles
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to perform this action.' });
    }
    next();
  };
};

// NPA evaluation rule engine function
const evaluateClaimLogic = (loanData) => {
  const dpd = parseInt(loanData.dpd) || 0;
  const outstandingAmount = parseFloat(loanData.outstandingAmount) || 0;
  
  const npaStatus = dpd > 90;
  let npaCategory = 'Standard';
  let aiRecommendation = 'Reject';
  let aiConfidence = 95;
  let justification = '';

  if (npaStatus) {
    if (dpd > 360) {
      npaCategory = 'Loss';
      aiRecommendation = 'Approve';
      aiConfidence = 99;
      justification = `Account is non-performing for over 360 days (classified as Loss Asset). Immediate claim approval is recommended for total outstanding amount of $${outstandingAmount.toLocaleString()}.`;
    } else if (dpd > 180) {
      npaCategory = 'Doubtful';
      aiRecommendation = 'Approve';
      aiConfidence = 95;
      justification = `Account is non-performing for over 180 days (classified as Doubtful Asset). Claim approval recommended due to prolonged default.`;
    } else {
      npaCategory = 'Substandard';
      aiRecommendation = 'Manual Review';
      aiConfidence = 85;
      justification = `Account is overdue by ${dpd} days (classified as Substandard Asset). Recommended for manual claim review to determine recovery options.`;
    }
  } else {
    npaCategory = 'Standard';
    aiRecommendation = 'Reject';
    aiConfidence = 98;
    justification = `Account is overdue by only ${dpd} days, which is within the standard asset threshold (<= 90 days). Claim cannot be recommended for approval.`;
  }

  return {
    npaStatus,
    npaCategory,
    aiRecommendation,
    aiConfidence,
    justification
  };
};

// Fraud checks engine
const evaluateFraudCheck = (loanData, existingClaims) => {
  const alerts = [];
  const dpd = parseInt(loanData.dpd) || 0;
  const loanAmount = parseFloat(loanData.loanAmount) || 0;
  const outstandingAmount = parseFloat(loanData.outstandingAmount) || 0;
  const interestRate = parseFloat(loanData.interestRate) || 0;
  
  // 1. Duplicate claim account check
  const duplicateAccount = existingClaims.find(
    c => c.accountNumber.toLowerCase() === loanData.accountNumber.toLowerCase()
  );
  if (duplicateAccount) {
    alerts.push({
      type: 'DuplicateAccount',
      severity: 'High',
      message: `Account number ${loanData.accountNumber} already has an active claim registered under ID: ${duplicateAccount.id}.`
    });
  }

  // 2. Mismatched outstanding amount check (e.g. outstanding principal exceeds original loan amount)
  if (outstandingAmount > loanAmount * 1.1) {
    alerts.push({
      type: 'OutstandingMismatch',
      severity: 'High',
      message: `Outstanding principal amount ($${outstandingAmount.toLocaleString()}) exceeds original loan principal ($${loanAmount.toLocaleString()}) by more than 10%.`
    });
  }

  // 3. Extremely high interest rates
  if (interestRate > 24) {
    alerts.push({
      type: 'ExcessiveInterest',
      severity: 'Medium',
      message: `Interest rate of ${interestRate}% is excessively high and exceeds regulatory guidelines.`
    });
  }

  // 4. Mismatched DPD and NPA Status
  if (dpd <= 90 && loanData.npaStatus) {
    alerts.push({
      type: 'SuspiciousNPA',
      severity: 'Medium',
      message: `Claim is flagged as NPA but Days Past Due is ${dpd} days (regulatory standard requires >90 days).`
    });
  }

  return alerts;
};

// Route: Auth Login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const users = readJsonFile(usersPath);
  const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  addAuditLog(user.username, 'LOGIN', 'Logged into the system successfully');

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role
    }
  });
});

// Route: Auth Current User
app.get('/api/auth/me', authenticateJWT, (req, res) => {
  res.json({ user: req.user });
});

// Route: User Access & Role Management (CRUD) - Admin only
app.get('/api/users', authenticateJWT, requireRole(['Admin']), (req, res) => {
  const users = readJsonFile(usersPath);
  // Remove password from responses for safety
  const safeUsers = users.map(({ password, ...u }) => u);
  res.json(safeUsers);
});

app.post('/api/users', authenticateJWT, requireRole(['Admin']), (req, res) => {
  const { username, password, name, role } = req.body;
  if (!username || !password || !name || !role) {
    return res.status(400).json({ error: 'Missing required user fields' });
  }

  const users = readJsonFile(usersPath);
  if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
    return res.status(400).json({ error: 'Username already exists' });
  }

  const nextId = users.reduce((max, u) => u.id > max ? u.id : max, 0) + 1;
  const newUser = {
    id: nextId,
    username,
    password: bcrypt.hashSync(password, 10),
    name,
    role
  };

  users.push(newUser);
  writeJsonFile(usersPath, users);
  addAuditLog(req.user.username, 'USER_CREATE', `Created new user ${username} with role ${role}`);
  
  const { password: _, ...safeUser } = newUser;
  res.status(201).json(safeUser);
});

app.put('/api/users/:id', authenticateJWT, requireRole(['Admin']), (req, res) => {
  const users = readJsonFile(usersPath);
  const id = parseInt(req.params.id);
  const index = users.findIndex(u => u.id === id);

  if (index === -1) return res.status(404).json({ error: 'User not found' });

  const { name, role, password } = req.body;
  
  users[index].name = name || users[index].name;
  users[index].role = role || users[index].role;
  if (password) {
    users[index].password = bcrypt.hashSync(password, 10);
  }

  writeJsonFile(usersPath, users);
  addAuditLog(req.user.username, 'USER_UPDATE', `Modified user profile for ${users[index].username}`);

  const { password: _, ...safeUser } = users[index];
  res.json(safeUser);
});

app.delete('/api/users/:id', authenticateJWT, requireRole(['Admin']), (req, res) => {
  const users = readJsonFile(usersPath);
  const id = parseInt(req.params.id);
  const userToDelete = users.find(u => u.id === id);

  if (!userToDelete) return res.status(404).json({ error: 'User not found' });
  if (userToDelete.username === req.user.username) {
    return res.status(400).json({ error: 'Cannot delete your own active session account' });
  }

  const filtered = users.filter(u => u.id !== id);
  writeJsonFile(usersPath, filtered);
  addAuditLog(req.user.username, 'USER_DELETE', `Deleted user account ${userToDelete.username}`);
  res.json({ success: true });
});

// Route: Evaluate Claim details without saving
app.post('/api/claims/evaluate', authenticateJWT, (req, res) => {
  const loanData = req.body;
  const evaluation = evaluateClaimLogic(loanData);
  res.json(evaluation);
});

// Route: Get all Claims
app.get('/api/claims', authenticateJWT, (req, res) => {
  const claims = readJsonFile(claimsPath);
  
  // Clerks only see claims they handled or all claims, let's allow general view but filter actions by roles.
  // In the real system we might restrict views, but here we'll provide all claims and gate actions.
  res.json(claims);
});

// Route: Get Claim by ID
app.get('/api/claims/:id', authenticateJWT, (req, res) => {
  const claims = readJsonFile(claimsPath);
  const claim = claims.find(c => c.id === req.params.id);
  if (!claim) return res.status(404).json({ error: 'Claim not found' });
  res.json(claim);
});

// Route: Create Claim
app.post('/api/claims', authenticateJWT, (req, res) => {
  const loanData = req.body;
  
  if (!loanData.accountNumber || !loanData.borrowerName || !loanData.loanAmount || !loanData.outstandingAmount) {
    return res.status(400).json({ error: 'Missing required loan information.' });
  }

  const claims = readJsonFile(claimsPath);
  
  // Calculate evaluation and fraud detection
  const evaluation = evaluateClaimLogic(loanData);
  const fraudAlerts = evaluateFraudCheck(loanData, claims);
  const fraudStatus = fraudAlerts.length > 0 ? 'Suspicious' : 'Safe';
  
  // Generate claim ID
  const nextIdNum = claims.reduce((max, c) => {
    const num = parseInt(c.id.split('-')[1]);
    return num > max ? num : max;
  }, 1000) + 1;
  
  const newClaim = {
    id: `CLM-${nextIdNum}`,
    accountNumber: loanData.accountNumber,
    borrowerName: loanData.borrowerName,
    loanAmount: parseFloat(loanData.loanAmount),
    outstandingAmount: parseFloat(loanData.outstandingAmount),
    interestRate: parseFloat(loanData.interestRate) || 0,
    dpd: parseInt(loanData.dpd) || 0,
    lastPaymentDate: loanData.lastPaymentDate || '',
    npaStatus: evaluation.npaStatus,
    npaCategory: evaluation.npaCategory,
    status: 'Pending Review',
    aiRecommendation: loanData.aiRecommendation || evaluation.aiRecommendation,
    aiConfidence: evaluation.aiConfidence,
    justification: loanData.justification || evaluation.justification,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    history: [
      {
        user: req.user.username,
        action: 'CREATED',
        comment: 'Claim created and submitted for review.',
        timestamp: new Date().toISOString()
      }
    ],
    documents: [],
    fraudAlerts,
    fraudStatus,
    legalAction: {
      caseStatus: 'None',
      caseNumber: '',
      lawyerName: '',
      settlementAmount: 0,
      settlementDate: '',
      auctionDetails: {
        assetType: '',
        reservePrice: 0,
        currentBid: 0,
        auctionDate: '',
        status: ''
      }
    },
    refundDetails: {
      refundAmount: 0,
      beneficiaryName: '',
      bankDetails: '',
      refundStatus: 'None',
      requestedBy: '',
      requestedAt: '',
      resolvedBy: '',
      resolvedAt: '',
      notes: ''
    }
  };

  claims.push(newClaim);
  
  if (writeJsonFile(claimsPath, claims)) {
    addAuditLog(req.user.username, 'CLAIM_CREATE', `Created claim ${newClaim.id} for ${newClaim.borrowerName}`);
    createNotification('Manager', `New Claim ${newClaim.id} ($${newClaim.outstandingAmount.toLocaleString()}) created and needs review.`);
    
    if (fraudStatus === 'Suspicious') {
      createNotification('Manager', `⚠️ FRAUD ALERT: Claim ${newClaim.id} has suspicious elements and has been flagged.`);
    }

    res.status(201).json(newClaim);
  } else {
    res.status(500).json({ error: 'Failed to write claim data' });
  }
});

// Route: Update Claim Details / Template
app.put('/api/claims/:id', authenticateJWT, (req, res) => {
  const claims = readJsonFile(claimsPath);
  const index = claims.findIndex(c => c.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Claim not found' });
  }

  // Preserve history, fraud status, documents, etc. unless specifically updating them
  const originalClaim = claims[index];
  
  const updatedClaim = {
    ...originalClaim,
    ...req.body,
    updatedAt: new Date().toISOString()
  };

  // Log edit history
  if (!updatedClaim.history) updatedClaim.history = originalClaim.history || [];
  updatedClaim.history.push({
    user: req.user.username,
    action: 'UPDATED',
    comment: 'Claim details or template text updated.',
    timestamp: new Date().toISOString()
  });

  claims[index] = updatedClaim;
  if (writeJsonFile(claimsPath, claims)) {
    addAuditLog(req.user.username, 'CLAIM_UPDATE', `Modified claim details for ${originalClaim.id}`);
    res.json(updatedClaim);
  } else {
    res.status(500).json({ error: 'Failed to update claim data' });
  }
});

// Route: Escalate Claim (Approval workflow)
app.post('/api/claims/:id/escalate', authenticateJWT, requireRole(['Manager']), (req, res) => {
  const claims = readJsonFile(claimsPath);
  const index = claims.findIndex(c => c.id === req.params.id);

  if (index === -1) return res.status(404).json({ error: 'Claim not found' });
  
  const claim = claims[index];
  const { reason } = req.body;

  claim.status = 'Escalated';
  claim.updatedAt = new Date().toISOString();
  
  if (!claim.history) claim.history = [];
  claim.history.push({
    user: req.user.username,
    action: 'ESCALATED',
    comment: reason || 'Claim escalated to Senior Executive for higher authority review.',
    timestamp: new Date().toISOString()
  });

  claims[index] = claim;
  writeJsonFile(claimsPath, claims);

  addAuditLog(req.user.username, 'CLAIM_ESCALATE', `Escalated claim ${claim.id} to Executive`);
  createNotification('Executive', `High-priority Claim ${claim.id} has been escalated for your review. Reason: ${reason || 'None provided'}`);

  res.json(claim);
});

// Route: Approve Claim (Approval workflow)
app.post('/api/claims/:id/approve', authenticateJWT, requireRole(['Manager', 'Executive', 'Admin']), (req, res) => {
  const claims = readJsonFile(claimsPath);
  const index = claims.findIndex(c => c.id === req.params.id);

  if (index === -1) return res.status(404).json({ error: 'Claim not found' });
  
  const claim = claims[index];
  const { comment } = req.body;

  // Verify that a Manager isn't approving an Escalated claim (only Executives/Admins should)
  if (claim.status === 'Escalated' && req.user.role === 'Manager') {
    return res.status(403).json({ error: 'Manager cannot approve escalated claims. Senior Executive authority required.' });
  }

  claim.status = 'Approved';
  claim.updatedAt = new Date().toISOString();

  if (!claim.history) claim.history = [];
  claim.history.push({
    user: req.user.username,
    action: 'APPROVED',
    comment: comment || 'Claim approved.',
    timestamp: new Date().toISOString()
  });

  claims[index] = claim;
  writeJsonFile(claimsPath, claims);

  addAuditLog(req.user.username, 'CLAIM_APPROVE', `Approved claim ${claim.id}`);
  createNotification('Clerk', `Claim ${claim.id} has been APPROVED by ${req.user.name}.`);

  res.json(claim);
});

// Route: Reject Claim (Approval workflow)
app.post('/api/claims/:id/reject', authenticateJWT, requireRole(['Manager', 'Executive', 'Admin']), (req, res) => {
  const claims = readJsonFile(claimsPath);
  const index = claims.findIndex(c => c.id === req.params.id);

  if (index === -1) return res.status(404).json({ error: 'Claim not found' });
  
  const claim = claims[index];
  const { comment } = req.body;

  if (claim.status === 'Escalated' && req.user.role === 'Manager') {
    return res.status(403).json({ error: 'Manager cannot reject escalated claims. Senior Executive authority required.' });
  }

  claim.status = 'Rejected';
  claim.updatedAt = new Date().toISOString();

  if (!claim.history) claim.history = [];
  claim.history.push({
    user: req.user.username,
    action: 'REJECTED',
    comment: comment || 'Claim rejected.',
    timestamp: new Date().toISOString()
  });

  claims[index] = claim;
  writeJsonFile(claimsPath, claims);

  addAuditLog(req.user.username, 'CLAIM_REJECT', `Rejected claim ${claim.id}`);
  createNotification('Clerk', `Claim ${claim.id} has been REJECTED by ${req.user.name}. Comment: ${comment || 'N/A'}`);

  res.json(claim);
});

// Route: Legal Action Update (Litigation/Auction updates)
app.put('/api/claims/:id/legal', authenticateJWT, requireRole(['Manager', 'Executive', 'Admin']), (req, res) => {
  const claims = readJsonFile(claimsPath);
  const index = claims.findIndex(c => c.id === req.params.id);

  if (index === -1) return res.status(404).json({ error: 'Claim not found' });
  
  const claim = claims[index];
  const legalData = req.body; // Expecting caseStatus, caseNumber, lawyerName, settlementAmount, settlementDate, auctionDetails

  claim.legalAction = {
    ...claim.legalAction,
    ...legalData
  };

  // Auto update claim status based on legal action status
  if (claim.legalAction.caseStatus === 'Settled') {
    claim.status = 'Settled';
  } else if (claim.legalAction.caseStatus === 'Auction Completed') {
    claim.status = 'Auction Completed';
  } else if (claim.legalAction.caseStatus === 'Auction Scheduled') {
    claim.status = 'Auction Scheduled';
  } else if (claim.legalAction.caseStatus === 'In Court') {
    claim.status = 'Legal Action';
  }

  claim.updatedAt = new Date().toISOString();

  if (!claim.history) claim.history = [];
  claim.history.push({
    user: req.user.username,
    action: 'LEGAL_UPDATE',
    comment: `Legal actions profile updated. Status changed to: ${claim.legalAction.caseStatus}`,
    timestamp: new Date().toISOString()
  });

  claims[index] = claim;
  writeJsonFile(claimsPath, claims);

  addAuditLog(req.user.username, 'LEGAL_UPDATE', `Updated legal case details for ${claim.id}. Action: ${claim.legalAction.caseStatus}`);
  createNotification('all', `Claim ${claim.id} legal details updated. Current litigation status: ${claim.legalAction.caseStatus}`);

  res.json(claim);
});

// Route: Request Refund
app.post('/api/claims/:id/refund', authenticateJWT, requireRole(['Clerk', 'Manager', 'Admin']), (req, res) => {
  const claims = readJsonFile(claimsPath);
  const index = claims.findIndex(c => c.id === req.params.id);

  if (index === -1) return res.status(404).json({ error: 'Claim not found' });
  
  const claim = claims[index];
  const { refundAmount, beneficiaryName, bankDetails, notes } = req.body;

  if (!refundAmount || !beneficiaryName || !bankDetails) {
    return res.status(400).json({ error: 'Refund amount, beneficiary, and bank details are required.' });
  }

  claim.refundDetails = {
    refundAmount: parseFloat(refundAmount),
    beneficiaryName,
    bankDetails,
    refundStatus: 'Pending Approval',
    requestedBy: req.user.username,
    requestedAt: new Date().toISOString(),
    resolvedBy: '',
    resolvedAt: '',
    notes: notes || ''
  };

  claim.status = 'Refund Pending';
  claim.updatedAt = new Date().toISOString();

  if (!claim.history) claim.history = [];
  claim.history.push({
    user: req.user.username,
    action: 'REFUND_REQUESTED',
    comment: `Initiated claim refund of $${parseFloat(refundAmount).toLocaleString()} for ${beneficiaryName}.`,
    timestamp: new Date().toISOString()
  });

  claims[index] = claim;
  writeJsonFile(claimsPath, claims);

  addAuditLog(req.user.username, 'REFUND_REQUEST', `Requested refund of $${refundAmount} for claim ${claim.id}`);
  
  // If > $10,000 notify Executive, else notify Manager
  const targetRole = parseFloat(refundAmount) > 10000 ? 'Executive' : 'Manager';
  createNotification(targetRole, `Refund request of $${parseFloat(refundAmount).toLocaleString()} for ${claim.id} requires approval.`);

  res.json(claim);
});

// Route: Resolve Refund (Approve/Process/Reject)
app.put('/api/claims/:id/refund', authenticateJWT, requireRole(['Manager', 'Executive', 'Admin']), (req, res) => {
  const claims = readJsonFile(claimsPath);
  const index = claims.findIndex(c => c.id === req.params.id);

  if (index === -1) return res.status(404).json({ error: 'Claim not found' });
  
  const claim = claims[index];
  const { action } = req.body; // Expecting 'approve', 'process', 'reject'
  
  if (!claim.refundDetails || claim.refundDetails.refundStatus === 'None') {
    return res.status(400).json({ error: 'No active refund request found on this claim.' });
  }

  const refundAmt = claim.refundDetails.refundAmount;

  // Threshold validation: Manager can only approve up to $10,000
  if (refundAmt > 10000 && req.user.role === 'Manager' && action === 'approve') {
    return res.status(403).json({ error: 'Manager cannot approve refunds exceeding $10,000. Senior Executive approval required.' });
  }

  if (action === 'approve') {
    claim.refundDetails.refundStatus = 'Approved';
    claim.status = 'Refund Approved';
    createNotification('Clerk', `Refund for claim ${claim.id} has been APPROVED. Proceed with payment process.`);
  } else if (action === 'process') {
    claim.refundDetails.refundStatus = 'Processed';
    claim.status = 'Refund Processed';
    createNotification('all', `Refund of $${refundAmt.toLocaleString()} for claim ${claim.id} has been successfully processed/paid.`);
  } else if (action === 'reject') {
    claim.refundDetails.refundStatus = 'Rejected';
    claim.status = 'Refund Rejected';
    createNotification('Clerk', `Refund for claim ${claim.id} was REJECTED by ${req.user.name}.`);
  }

  claim.refundDetails.resolvedBy = req.user.username;
  claim.refundDetails.resolvedAt = new Date().toISOString();
  claim.updatedAt = new Date().toISOString();

  if (!claim.history) claim.history = [];
  claim.history.push({
    user: req.user.username,
    action: `REFUND_${action.toUpperCase()}`,
    comment: `Refund request resolved: ${action.toUpperCase()}.`,
    timestamp: new Date().toISOString()
  });

  claims[index] = claim;
  writeJsonFile(claimsPath, claims);

  addAuditLog(req.user.username, `REFUND_${action.toUpperCase()}`, `Resolved refund request for ${claim.id} as ${action}`);

  res.json(claim);
});

// Route: Document uploads (Simulated)
app.post('/api/claims/:id/documents', authenticateJWT, (req, res) => {
  const claims = readJsonFile(claimsPath);
  const index = claims.findIndex(c => c.id === req.params.id);

  if (index === -1) return res.status(404).json({ error: 'Claim not found' });
  
  const claim = claims[index];
  const { name, type, size } = req.body;

  if (!name || !type) return res.status(400).json({ error: 'Document name and type are required' });

  const docId = 'DOC-' + Date.now();
  const newDoc = {
    id: docId,
    name,
    type,
    size: size || '1.0 MB',
    uploadedBy: req.user.username,
    uploadedAt: new Date().toISOString()
  };

  if (!claim.documents) claim.documents = [];
  claim.documents.push(newDoc);
  claim.updatedAt = new Date().toISOString();

  if (!claim.history) claim.history = [];
  claim.history.push({
    user: req.user.username,
    action: 'DOC_UPLOAD',
    comment: `Uploaded document: ${name} (${type})`,
    timestamp: new Date().toISOString()
  });

  claims[index] = claim;
  writeJsonFile(claimsPath, claims);

  addAuditLog(req.user.username, 'DOC_UPLOAD', `Uploaded document ${name} to claim ${claim.id}`);

  res.status(201).json(newDoc);
});

// Route: Delete Document
app.delete('/api/claims/:id/documents/:docId', authenticateJWT, (req, res) => {
  const claims = readJsonFile(claimsPath);
  const index = claims.findIndex(c => c.id === req.params.id);

  if (index === -1) return res.status(404).json({ error: 'Claim not found' });
  
  const claim = claims[index];
  const { docId } = req.params;

  if (!claim.documents) claim.documents = [];
  const initialCount = claim.documents.length;
  claim.documents = claim.documents.filter(d => d.id !== docId);

  if (claim.documents.length === initialCount) {
    return res.status(404).json({ error: 'Document not found' });
  }

  claim.updatedAt = new Date().toISOString();
  
  if (!claim.history) claim.history = [];
  claim.history.push({
    user: req.user.username,
    action: 'DOC_DELETE',
    comment: `Removed document reference: ${docId}`,
    timestamp: new Date().toISOString()
  });

  claims[index] = claim;
  writeJsonFile(claimsPath, claims);

  addAuditLog(req.user.username, 'DOC_DELETE', `Removed document ${docId} from claim ${claim.id}`);

  res.json({ success: true });
});

// Route: Resolve Fraud Alert (Mute/Confirm)
app.post('/api/claims/:id/fraud/resolve', authenticateJWT, requireRole(['Manager', 'Executive', 'Admin']), (req, res) => {
  const claims = readJsonFile(claimsPath);
  const index = claims.findIndex(c => c.id === req.params.id);

  if (index === -1) return res.status(404).json({ error: 'Claim not found' });
  
  const claim = claims[index];
  const { status } = req.body; // Expecting 'Safe', 'Muted', or 'Confirmed'

  if (!['Safe', 'Muted', 'Confirmed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid fraud status value' });
  }

  claim.fraudStatus = status;
  claim.updatedAt = new Date().toISOString();

  if (!claim.history) claim.history = [];
  claim.history.push({
    user: req.user.username,
    action: 'FRAUD_RESOLVED',
    comment: `Fraud status manually marked as: ${status}`,
    timestamp: new Date().toISOString()
  });

  claims[index] = claim;
  writeJsonFile(claimsPath, claims);

  addAuditLog(req.user.username, 'FRAUD_RESOLVE', `Marked claim ${claim.id} fraud status as ${status}`);
  createNotification('all', `Claim ${claim.id} fraud checks resolved by ${req.user.name}. Status: ${status}`);

  res.json(claim);
});

// Route: Get Notifications
app.get('/api/notifications', authenticateJWT, (req, res) => {
  const notifications = readJsonFile(notificationsPath);
  
  // Filter notifications for the current user's role or username, or "all"
  const filtered = notifications.filter(
    n => n.userId === 'all' || 
         n.userId === req.user.role || 
         n.userId === req.user.username
  );

  res.json(filtered);
});

// Route: Read Notification
app.put('/api/notifications/:id/read', authenticateJWT, (req, res) => {
  const notifications = readJsonFile(notificationsPath);
  const index = notifications.findIndex(n => n.id === req.params.id);

  if (index === -1) return res.status(404).json({ error: 'Notification not found' });

  notifications[index].read = true;
  writeJsonFile(notificationsPath, notifications);
  res.json({ success: true });
});

// Route: Get Audit Logs (Admin/Executive only)
app.get('/api/audit-logs', authenticateJWT, requireRole(['Admin', 'Executive']), (req, res) => {
  const logs = readJsonFile(auditLogsPath);
  res.json(logs);
});

// Route: Analytics Dashboard Endpoint
app.get('/api/analytics/dashboard', authenticateJWT, (req, res) => {
  const claims = readJsonFile(claimsPath);
  const totalClaims = claims.length;
  
  // Math metrics
  let totalOutstanding = 0;
  let totalLoanVal = 0;
  let approvedCount = 0;
  let pendingCount = 0;
  let escalatedCount = 0;
  let rejectedCount = 0;
  
  // NPA Categories
  const npaBreakdown = { Standard: 0, Substandard: 0, Doubtful: 0, Loss: 0 };
  
  // Refunds
  let totalRefundsValue = 0;
  let refundsRequested = 0;
  let refundsProcessed = 0;
  
  // Legal
  let activeLawsuits = 0;
  let activeAuctions = 0;
  let totalAuctionRecovery = 0;
  
  // Fraud
  let fraudAlertsCount = 0;

  claims.forEach(c => {
    totalOutstanding += c.outstandingAmount || 0;
    totalLoanVal += c.loanAmount || 0;

    if (c.status === 'Approved') approvedCount++;
    else if (c.status === 'Pending Review' || c.status === 'Refund Pending' || c.status === 'Refund Approved') pendingCount++;
    else if (c.status === 'Escalated') escalatedCount++;
    else if (c.status === 'Rejected') rejectedCount++;

    const npaCat = c.npaCategory || 'Standard';
    npaBreakdown[npaCat] = (npaBreakdown[npaCat] || 0) + 1;

    // Refund details
    if (c.refundDetails && c.refundDetails.refundStatus !== 'None') {
      refundsRequested++;
      if (c.refundDetails.refundStatus === 'Processed') {
        refundsProcessed++;
        totalRefundsValue += c.refundDetails.refundAmount || 0;
      }
    }

    // Legal status details
    if (c.legalAction && c.legalAction.caseStatus !== 'None') {
      if (['In Court', 'Legal Action'].includes(c.legalAction.caseStatus)) {
        activeLawsuits++;
      } else if (c.legalAction.caseStatus === 'Auction Scheduled') {
        activeAuctions++;
      } else if (c.legalAction.caseStatus === 'Auction Completed') {
        totalAuctionRecovery += c.legalAction.auctionDetails?.currentBid || 0;
      } else if (c.legalAction.caseStatus === 'Settled') {
        totalAuctionRecovery += c.legalAction.settlementAmount || 0;
      }
    }

    // Fraud
    if (c.fraudStatus === 'Suspicious') {
      fraudAlertsCount++;
    }
  });

  // Average Settlement Timelines (Mocked or calculated based on creation to settled dates if available)
  const averageSettlementTimeline = 14.5; // days

  // Monthly trends for SVG charts (Past 6 months mock data)
  const monthlyStats = [
    { month: 'Jan', claimsCreated: 12, approved: 10, recovered: 45000 },
    { month: 'Feb', claimsCreated: 15, approved: 12, recovered: 62000 },
    { month: 'Mar', claimsCreated: 18, approved: 14, recovered: 80000 },
    { month: 'Apr', claimsCreated: 24, approved: 19, recovered: 125000 },
    { month: 'May', claimsCreated: 29, approved: 22, recovered: 190000 },
    { month: 'Jun', claimsCreated: totalClaims, approved: approvedCount, recovered: totalAuctionRecovery }
  ];

  res.json({
    totalClaims,
    totalOutstanding,
    totalLoanVal,
    approvedCount,
    pendingCount,
    escalatedCount,
    rejectedCount,
    npaBreakdown,
    refundsRequested,
    refundsProcessed,
    totalRefundsValue,
    activeLawsuits,
    activeAuctions,
    totalAuctionRecovery,
    fraudAlertsCount,
    averageSettlementTimeline,
    monthlyStats
  });
});

// Route: Generate Downloadable PDF Claim Letter (Auth-supported)
app.get('/api/claims/:id/pdf', (req, res) => {
  const claims = readJsonFile(claimsPath);
  const claim = claims.find(c => c.id === req.params.id);
  
  if (!claim) {
    return res.status(404).json({ error: 'Claim not found' });
  }

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  
  // Set headers for download
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=Claim_Letter_${claim.id}.pdf`);
  
  doc.pipe(res);

  // Styling properties
  const primaryColor = '#1e3a8a'; // dark blue
  const accentColor = '#3b82f6'; // light blue
  const darkTextColor = '#1f2937'; // dark grey
  
  // Header Logo / Info
  doc.rect(0, 0, 595.28, 15).fill(primaryColor);
  doc.moveDown(2);
  
  doc.fillColor(primaryColor).fontSize(22).font('Helvetica-Bold').text('CLAIM ASSESSMENT REPORT', { align: 'center' });
  doc.fillColor(darkTextColor).fontSize(9).font('Helvetica').text('Automated Claim Management AI System', { align: 'center' });
  
  doc.moveDown(1.5);
  doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(50, doc.y).lineTo(545.28, doc.y).stroke();
  doc.moveDown(1.5);

  // Meta details (Claim ID and Date)
  const metaY = doc.y;
  doc.fontSize(10).font('Helvetica-Bold').text(`Claim ID: ${claim.id}`, 50, metaY);
  doc.font('Helvetica').text(`Current Status: ${claim.status.toUpperCase()}`, 50, metaY + 15);
  
  doc.font('Helvetica-Bold').text(`Generated Date: ${new Date(claim.createdAt).toLocaleDateString()}`, 350, metaY);
  doc.font('Helvetica').text(`Last Updated: ${new Date(claim.updatedAt).toLocaleDateString()}`, 350, metaY + 15);
  
  doc.moveDown(2.5);

  // Section 1: Borrower Information
  doc.fillColor(primaryColor).fontSize(14).font('Helvetica-Bold').text('1. Borrower & Account Details');
  doc.strokeColor(accentColor).lineWidth(1.5).moveTo(50, doc.y + 2).lineTo(250, doc.y + 2).stroke();
  doc.moveDown(0.8);
  
  doc.fillColor(darkTextColor).fontSize(10).font('Helvetica');
  
  const detailsY = doc.y;
  doc.font('Helvetica-Bold').text('Borrower Name:', 60, detailsY);
  doc.font('Helvetica').text(claim.borrowerName, 170, detailsY);
  
  doc.font('Helvetica-Bold').text('Account Number:', 60, detailsY + 15);
  doc.font('Helvetica').text(claim.accountNumber, 170, detailsY + 15);
  
  doc.font('Helvetica-Bold').text('Loan Amount:', 320, detailsY);
  doc.font('Helvetica').text(`$${claim.loanAmount.toLocaleString()}`, 450, detailsY);
  
  doc.font('Helvetica-Bold').text('Outstanding Bal:', 320, detailsY + 15);
  doc.font('Helvetica').text(`$${claim.outstandingAmount.toLocaleString()}`, 450, detailsY + 15);
  
  doc.font('Helvetica-Bold').text('Interest Rate:', 60, detailsY + 30);
  doc.font('Helvetica').text(`${claim.interestRate}% per annum`, 170, detailsY + 30);

  doc.moveDown(3);

  // Section 2: NPA Evaluation Details
  doc.fillColor(primaryColor).fontSize(14).font('Helvetica-Bold').text('2. NPA Assessment');
  doc.strokeColor(accentColor).lineWidth(1.5).moveTo(50, doc.y + 2).lineTo(200, doc.y + 2).stroke();
  doc.moveDown(0.8);
  
  doc.fillColor(darkTextColor).fontSize(10);
  const npaY = doc.y;
  doc.font('Helvetica-Bold').text('Days Past Due (DPD):', 60, npaY);
  doc.font('Helvetica').text(`${claim.dpd} days`, 170, npaY);
  
  doc.font('Helvetica-Bold').text('Last Payment Date:', 60, npaY + 15);
  doc.font('Helvetica').text(claim.lastPaymentDate || 'N/A', 170, npaY + 15);

  doc.font('Helvetica-Bold').text('NPA Status:', 320, npaY);
  doc.font('Helvetica-Bold').fillColor(claim.npaStatus ? '#dc2626' : '#16a34a').text(claim.npaStatus ? 'YES (Non-Performing)' : 'NO (Standard)', 450, npaY);
  
  doc.fillColor(darkTextColor).font('Helvetica-Bold').text('NPA Classification:', 320, npaY + 15);
  doc.font('Helvetica').text(claim.npaCategory, 450, npaY + 15);

  doc.moveDown(3);

  // Section 3: Recommendation Details
  doc.fillColor(primaryColor).fontSize(14).font('Helvetica-Bold').text('3. Claim Recommendation');
  doc.strokeColor(accentColor).lineWidth(1.5).moveTo(50, doc.y + 2).lineTo(230, doc.y + 2).stroke();
  doc.moveDown(0.8);

  // Shaded Box for recommendation
  const recBoxY = doc.y;
  doc.rect(50, recBoxY, 495.28, 90).fill('#f3f4f6');
  
  doc.fillColor(darkTextColor).fontSize(10);
  doc.font('Helvetica-Bold').text('AI Recommendation Decision:', 65, recBoxY + 12);
  
  let recColor = '#3b82f6'; // manual review (blue)
  if (claim.aiRecommendation === 'Approve') recColor = '#16a34a'; // green
  if (claim.aiRecommendation === 'Reject') recColor = '#dc2626'; // red
  
  doc.font('Helvetica-Bold').fillColor(recColor).fontSize(12).text(claim.aiRecommendation.toUpperCase(), 230, recBoxY + 11);
  
  doc.fillColor(darkTextColor).fontSize(10).font('Helvetica-Bold').text('AI Confidence Index:', 350, recBoxY + 12);
  doc.font('Helvetica').text(`${claim.aiConfidence}%`, 460, recBoxY + 12);
  
  doc.font('Helvetica-Bold').text('Justification Report:', 65, recBoxY + 35);
  doc.font('Helvetica').fontSize(9).text(claim.justification || 'No justification provided.', 65, recBoxY + 50, { width: 460 });

  // Add details about Legal actions or Refunds if active
  if (claim.legalAction && claim.legalAction.caseStatus !== 'None') {
    doc.addPage();
    doc.rect(0, 0, 595.28, 15).fill(primaryColor);
    doc.moveDown(2);
    doc.fillColor(primaryColor).fontSize(14).font('Helvetica-Bold').text('4. Legal Actions & Asset Recovery status');
    doc.strokeColor(accentColor).lineWidth(1.5).moveTo(50, doc.y + 2).lineTo(300, doc.y + 2).stroke();
    doc.moveDown(1);
    
    doc.fillColor(darkTextColor).fontSize(10);
    const legalY = doc.y;
    doc.font('Helvetica-Bold').text('Litigation Status:', 60, legalY);
    doc.font('Helvetica').text(claim.legalAction.caseStatus, 170, legalY);
    doc.font('Helvetica-Bold').text('Case Number:', 60, legalY + 15);
    doc.font('Helvetica').text(claim.legalAction.caseNumber || 'Pending Filing', 170, legalY + 15);
    doc.font('Helvetica-Bold').text('Handling Counsel:', 60, legalY + 30);
    doc.font('Helvetica').text(claim.legalAction.lawyerName || 'N/A', 170, legalY + 30);

    if (claim.legalAction.caseStatus.includes('Auction')) {
      doc.font('Helvetica-Bold').text('Auctioned Asset:', 320, legalY);
      doc.font('Helvetica').text(claim.legalAction.auctionDetails?.assetType || 'N/A', 440, legalY);
      doc.font('Helvetica-Bold').text('Reserve Price:', 320, legalY + 15);
      doc.font('Helvetica').text(`$${claim.legalAction.auctionDetails?.reservePrice?.toLocaleString() || 0}`, 440, legalY + 15);
      doc.font('Helvetica-Bold').text('Highest Bid:', 320, legalY + 30);
      doc.font('Helvetica').text(`$${claim.legalAction.auctionDetails?.currentBid?.toLocaleString() || 0}`, 440, legalY + 30);
    } else if (claim.legalAction.caseStatus === 'Settled') {
      doc.font('Helvetica-Bold').text('Settlement Agreed:', 320, legalY);
      doc.font('Helvetica').text(`$${claim.legalAction.settlementAmount?.toLocaleString() || 0}`, 440, legalY);
      doc.font('Helvetica-Bold').text('Settlement Date:', 320, legalY + 15);
      doc.font('Helvetica').text(claim.legalAction.settlementDate || 'N/A', 440, legalY + 15);
    }
  }

  doc.moveDown(7.5);

  // Signature Block
  const sigY = doc.y;
  doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(50, sigY).lineTo(545.28, sigY).stroke();
  doc.moveDown(2);
  
  const signatureLineY = doc.y + 40;
  doc.fontSize(9).font('Helvetica');
  doc.text('Prepared By: System AI Audit Engine', 50, signatureLineY);
  doc.text('Date: ' + new Date().toLocaleDateString(), 50, signatureLineY + 15);
  
  // Pull authorization history
  let authorizedSigner = '________________________';
  let authorizedRole = 'Authorized Approver';
  
  if (claim.history && claim.history.length > 0) {
    const approvalEvent = [...claim.history].reverse().find(h => h.action === 'APPROVED');
    if (approvalEvent) {
      authorizedSigner = approvalEvent.user.toUpperCase();
      authorizedRole = 'Approving Authority';
    }
  }

  doc.text(`Authorized Approver: ${authorizedSigner}`, 300, signatureLineY);
  doc.text(`Designation: ${authorizedRole}`, 300, signatureLineY + 15);
  doc.text('Signature: ________________________', 300, signatureLineY + 30);
  
  // Footer
  doc.fontSize(8).fillColor('#9ca3af').text('Confidential - Claims Management Internal System Document', 50, 770, { align: 'center' });

  doc.end();
});

// Serve frontend static assets in production (Render single service deployment)
if (process.env.NODE_ENV === 'production' || process.env.RENDER === 'true') {
  const distPath = path.join(__dirname, '..', 'frontend', 'dist');
  app.use(express.static(distPath));
  
  // Any request that doesn't match API endpoints should serve index.html
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
}

app.listen(PORT, () => {
  console.log(`Backend server is running on port ${PORT}`);
});
