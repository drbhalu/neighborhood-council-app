const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const PROFILE_PICTURES_DIR = path.join(__dirname, 'profile-pictures');
const COMPLAINT_PHOTOS_DIR = path.join(__dirname, 'complaint-photos');
const MEETING_MINUTES_DIR = path.join(__dirname, 'meeting-minutes');

// Ensure upload directories exist even if the server starts from a different CWD.
[PROFILE_PICTURES_DIR, COMPLAINT_PHOTOS_DIR, MEETING_MINUTES_DIR].forEach((dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

// --- MULTER CONFIGURATION FOR PROFILE PICTURES ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, PROFILE_PICTURES_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
    }
  }
});

// Serve profile pictures as static files
app.use('/profile-pictures', express.static(PROFILE_PICTURES_DIR));

// --- MULTER CONFIGURATION FOR COMPLAINT PHOTOS ---
const complaintStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, COMPLAINT_PHOTOS_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const complaintUpload = multer({ 
  storage: complaintStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
    }
  }
});

// Serve complaint photos as static files
app.use('/complaint-photos', express.static(COMPLAINT_PHOTOS_DIR));
// Backward-compat fallback: some meeting evidence was saved with /complaint-photos
// path while the file is actually stored in meeting-minutes.
app.use('/complaint-photos', express.static(MEETING_MINUTES_DIR));

// --- MULTER CONFIGURATION FOR COMMITTEE MEETING EVIDENCE (IMAGE/PDF) ---
const meetingMinutesStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, MEETING_MINUTES_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const meetingMinutesUpload = multer({
  storage: meetingMinutesStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: function (req, file, cb) {
    const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF or image files (JPEG, PNG, GIF, WebP) are allowed.'));
    }
  }
});

// Serve meeting minutes as static files
app.use('/meeting-minutes', express.static(MEETING_MINUTES_DIR));

// --- CONFIGURATION ---
const dbConfig = {
  user: 'sa',
  password: '12345',
  server: 'DESKTOP-J53S96B\\SQLEXPRESS', 
  database: 'NHC_DB',
  options: {
    encrypt: false, 
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

// --- HELPER FUNCTION: Convert relative profile image URLs to absolute URLs ---
function ensureFullProfileImageUrl(profileImage) {
  if (!profileImage) return profileImage;
  if (profileImage.startsWith('http://') || profileImage.startsWith('https://')) {
    return profileImage; // Already a full URL
  }
  return `http://localhost:3001${profileImage}`;
}

// --- GLOBAL ERROR HANDLING ------------------------------------------------
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at', promise, 'reason:', reason);
});

// --- INIT DB ---
async function initDB() {
  try {
    console.log("--- Step 1: Connecting to Master ---");
    const masterPool = new sql.ConnectionPool({ ...dbConfig, database: 'master' });
    await masterPool.connect();
    console.log("✓ Connected to Master successfully.");

    await masterPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'NHC_DB')
      CREATE DATABASE NHC_DB
    `);
    console.log("✓ Database NHC_DB created/checked.");

    await masterPool.close();

    console.log("--- Step 2: Connecting to NHC_DB ---");
    const nhcPool = new sql.ConnectionPool(dbConfig);
    await nhcPool.connect();
    console.log("✓ Connected to NHC_DB successfully.");

    // Create Table Users
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Users' AND xtype='U')
      CREATE TABLE Users (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        FirstName NVARCHAR(50),
        LastName NVARCHAR(50),
        Gender NVARCHAR(10),
        CNIC NVARCHAR(20) UNIQUE,
        Phone NVARCHAR(20),
        Address NVARCHAR(200),
        Email NVARCHAR(100),
        Password NVARCHAR(100),
        NHC_Code NVARCHAR(100),
        ProfileImage NVARCHAR(MAX),
        CreatedDate DATETIME DEFAULT GETDATE(),
        Role NVARCHAR(20) DEFAULT 'User'
      )
    `);
    console.log("✓ Table Users ready.");

    // Legacy support: column will be dropped after migration below.
    // Only create the column if the mapping table doesn't yet exist – once we
    // have UserNHCs we no longer need to add this field.
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='UserNHCs' AND xtype='U')
      BEGIN
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'NHC_Code' AND Object_ID = OBJECT_ID('Users'))
          ALTER TABLE Users ADD NHC_Code NVARCHAR(100);
      END
    `);

    // Committee size configuration so the frontend can adapt dynamically.
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='CommitteeSettings' AND xtype='U')
      CREATE TABLE CommitteeSettings (
        SettingKey NVARCHAR(100) PRIMARY KEY,
        SettingValue INT NOT NULL,
        UpdatedDate DATETIME DEFAULT GETDATE()
      )
    `);
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT 1 FROM CommitteeSettings WHERE SettingKey = 'CommitteeMemberCount')
      INSERT INTO CommitteeSettings (SettingKey, SettingValue) VALUES ('CommitteeMemberCount', 3)
    `);
    console.log('✓ Table CommitteeSettings ready.');

    // --- NEW: Create NHC budget table for available budget entries ---
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='NHCBudgets' AND xtype='U')
      CREATE TABLE NHCBudgets (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        NHC_Code NVARCHAR(100) NOT NULL,
        AvailableBudget DECIMAL(18,2) DEFAULT 0,
        UpdatedDate DATETIME DEFAULT GETDATE(),
        CONSTRAINT UQ_NHCBudgets_NHC_Code UNIQUE (NHC_Code)
      )
    `);
    console.log('✓ Table NHCBudgets ready.');

    // Add ProfileImage column if missing
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'ProfileImage' AND Object_ID = OBJECT_ID('Users'))
      ALTER TABLE Users ADD ProfileImage NVARCHAR(MAX);
    `);

    // Clean up any base64 data in ProfileImage (keep only file paths)
    await nhcPool.request().query(`
      UPDATE Users 
      SET ProfileImage = NULL 
      WHERE ProfileImage LIKE 'data:image%'
    `);
    console.log("✓ Cleaned up base64 data from ProfileImage column.");

    // Add Location column if missing
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'Location' AND Object_ID = OBJECT_ID('Users'))
      ALTER TABLE Users ADD Location NVARCHAR(MAX);
    `);

    // --- NEW: CREATE NOTIFICATIONS TABLE ---
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Notifications' AND xtype='U')
      CREATE TABLE Notifications (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        RecipientCNIC NVARCHAR(20),
        Message NVARCHAR(MAX),
        PanelId INT NULL,
        Role NVARCHAR(50) NULL,
        CreatedDate DATETIME DEFAULT GETDATE()
      )
    `);
    // add PanelId column if missing (for invitations)
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'PanelId' AND Object_ID = OBJECT_ID('Notifications'))
      ALTER TABLE Notifications ADD PanelId INT NULL;
    `);
    // add Role column if missing
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'Role' AND Object_ID = OBJECT_ID('Notifications'))
      ALTER TABLE Notifications ADD Role NVARCHAR(50) NULL;
    `);
    // add NHC_Code column if missing (to track which NHC the notification is for)
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'NHC_Code' AND Object_ID = OBJECT_ID('Notifications'))
      ALTER TABLE Notifications ADD NHC_Code NVARCHAR(100) NULL;
    `);
    console.log("✓ Table Notifications ready.");

    // --- NEW: CREATE POSITIONS TABLE ---
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Positions' AND xtype='U')
      CREATE TABLE Positions (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Name NVARCHAR(100) UNIQUE,
        CreatedDate DATETIME DEFAULT GETDATE()
      )
    `);

    // Seed default positions if table is empty (President, Treasurer, Vice President)
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT 1 FROM Positions)
      BEGIN
        INSERT INTO Positions (Name) VALUES ('President');
        INSERT INTO Positions (Name) VALUES ('Treasurer');
        INSERT INTO Positions (Name) VALUES ('Vice President');
      END
    `);
    console.log("✓ Table Positions ready and seeded.");

    // Create Table Requests
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Requests' AND xtype='U')
      CREATE TABLE Requests (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        FirstName NVARCHAR(50),
        LastName NVARCHAR(50),
        CNIC NVARCHAR(20),
        RequestType NVARCHAR(50),
        Message NVARCHAR(MAX),
        Location NVARCHAR(MAX),
        Status NVARCHAR(20) DEFAULT 'Pending',
        CreatedDate DATETIME DEFAULT GETDATE()
      )
    `);
    // Add AssignedNHC column if missing
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'AssignedNHC' AND Object_ID = OBJECT_ID('Requests'))
      ALTER TABLE Requests ADD AssignedNHC NVARCHAR(100);
    `);
    // Add Location column if missing
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'Location' AND Object_ID = OBJECT_ID('Requests'))
      ALTER TABLE Requests ADD Location NVARCHAR(MAX);
    `);

    // Create Table NHC_Zones
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='NHC_Zones' AND xtype='U')
      CREATE TABLE NHC_Zones (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Name NVARCHAR(100),
        ZoneData NVARCHAR(MAX)
      )
    `);

    // --- NEW: mapping table for many-to-many user<->nhc relationships ---
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='UserNHCs' AND xtype='U')
      CREATE TABLE UserNHCs (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        UserCNIC NVARCHAR(20),
        NHC_Code NVARCHAR(100),
        Role NVARCHAR(50) DEFAULT 'Member',
        CONSTRAINT UQ_UserNHC UNIQUE (UserCNIC, NHC_Code)
      )
    `);
    
    // Add Role column if missing (for existing databases)
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'Role' AND Object_ID = OBJECT_ID('UserNHCs'))
      ALTER TABLE UserNHCs ADD Role NVARCHAR(50) DEFAULT 'Member';
    `);
    console.log("✓ Table UserNHCs ready.");

    // migrate existing Users.NHC_Code values into mapping table (split comma-separated list)
    try {
      const nhcCodeColumnExists = await nhcPool.request().query(`
        SELECT 1 AS Found
        FROM sys.columns
        WHERE Name = N'NHC_Code' AND Object_ID = OBJECT_ID('Users')
      `);

      if (nhcCodeColumnExists.recordset.length > 0) {
        const users = await nhcPool.request().query("SELECT CNIC, NHC_Code, Role FROM Users WHERE NHC_Code IS NOT NULL AND LTRIM(RTRIM(NHC_Code)) <> ''");
        for (const u of users.recordset) {
          const cnicVal = u.CNIC;
          const userRole = u.Role || 'Member';
          const codes = (u.NHC_Code || '')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);
          for (const code of codes) {
            try {
              await nhcPool.request()
                .input('UserCNIC', sql.NVarChar, cnicVal)
                .input('NHC_Code', sql.NVarChar, code)
                .input('Role', sql.NVarChar, userRole)
                .query('INSERT INTO UserNHCs (UserCNIC, NHC_Code, Role) VALUES (@UserCNIC, @NHC_Code, @Role)');
            } catch (e) {
              // ignore duplicate key errors
            }
          }
        }
        console.log(`✓ Migrated ${users.recordset.length} users to UserNHCs with roles`);
      } else {
        console.log('✓ Skipped Users.NHC_Code migration (column not found)');
      }
    } catch (migErr) {
      console.error('Migration to UserNHCs failed:', migErr);
    }
    // once data copied, drop obsolete column
    try {
      await nhcPool.request().query(`
        IF EXISTS (SELECT * FROM sys.columns WHERE Name = N'NHC_Code' AND Object_ID = OBJECT_ID('Users'))
        ALTER TABLE Users DROP COLUMN NHC_Code;
      `);
      console.log('✓ Dropped Users.NHC_Code column');
    } catch (dropErr) {
      console.error('Failed to drop Users.NHC_Code column:', dropErr);
    }

    // Drop NominationDate column if it exists
    await nhcPool.request().query(`
      IF EXISTS (SELECT * FROM sys.columns WHERE Name = N'NominationDate' AND Object_ID = OBJECT_ID('NHC_Zones'))
      ALTER TABLE NHC_Zones DROP COLUMN NominationDate;
    `);

    // Drop ElectionDate column if it exists
    await nhcPool.request().query(`
      IF EXISTS (SELECT * FROM sys.columns WHERE Name = N'ElectionDate' AND Object_ID = OBJECT_ID('NHC_Zones'))
      ALTER TABLE NHC_Zones DROP COLUMN ElectionDate;
    `);

    // Create Nominations Table
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Nominations' AND xtype='U')
      CREATE TABLE Nominations (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        NHC_Id INT NOT NULL,
        NominationStartDate DATE,
        NominationEndDate DATE,
        CreatedDate DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (NHC_Id) REFERENCES NHC_Zones(Id)
      )
    `);
    
    // Add NominationStartDate column if missing
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'NominationStartDate' AND Object_ID = OBJECT_ID('Nominations'))
      ALTER TABLE Nominations ADD NominationStartDate DATE;
    `);
    
    // Add NominationEndDate column if missing
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'NominationEndDate' AND Object_ID = OBJECT_ID('Nominations'))
      ALTER TABLE Nominations ADD NominationEndDate DATE;
    `);
    
    // Drop old NominationDate column if it exists
    await nhcPool.request().query(`
      IF EXISTS (SELECT * FROM sys.columns WHERE Name = N'NominationDate' AND Object_ID = OBJECT_ID('Nominations'))
      ALTER TABLE Nominations DROP COLUMN NominationDate;
    `);
    
    // Add CreatedDate column if missing
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'CreatedDate' AND Object_ID = OBJECT_ID('Nominations'))
      ALTER TABLE Nominations ADD CreatedDate DATETIME DEFAULT GETDATE();
    `);
    console.log("✓ Table Nominations ready.");

    // Create Elections Table
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Elections' AND xtype='U')
      CREATE TABLE Elections (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        NHC_Id INT NOT NULL,
        ElectionStartDate DATE,
        ElectionEndDate DATE,
        CreatedDate DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (NHC_Id) REFERENCES NHC_Zones(Id)
      )
    `);
    
    // Add ElectionStartDate column if missing
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'ElectionStartDate' AND Object_ID = OBJECT_ID('Elections'))
      ALTER TABLE Elections ADD ElectionStartDate DATE;
    `);
    
    // Add ElectionEndDate column if missing
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'ElectionEndDate' AND Object_ID = OBJECT_ID('Elections'))
      ALTER TABLE Elections ADD ElectionEndDate DATE;
    `);
    
    // Drop old ElectionDate column if it exists
    await nhcPool.request().query(`
      IF EXISTS (SELECT * FROM sys.columns WHERE Name = N'ElectionDate' AND Object_ID = OBJECT_ID('Elections'))
      ALTER TABLE Elections DROP COLUMN ElectionDate;
    `);
    
    // Add CreatedDate column if missing
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'CreatedDate' AND Object_ID = OBJECT_ID('Elections'))
      ALTER TABLE Elections ADD CreatedDate DATETIME DEFAULT GETDATE();
    `);
    console.log("✓ Table Elections ready.");

    // Create ElectionVotes Table (for tracking votes during election period)
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ElectionVotes' AND xtype='U')
      CREATE TABLE ElectionVotes (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        ElectionId INT NOT NULL,
        NHC_Id INT,
        VoterCNIC NVARCHAR(20) NOT NULL,
        CandidateId INT,
        ElectionEndDate DATE,
        CreatedDate DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (ElectionId) REFERENCES Elections(Id)
      )
    `);
    
    // Add NHC_Id column if missing
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'NHC_Id' AND Object_ID = OBJECT_ID('ElectionVotes'))
      ALTER TABLE ElectionVotes ADD NHC_Id INT;
    `);
    
    // Add VoterCNIC column if missing
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'VoterCNIC' AND Object_ID = OBJECT_ID('ElectionVotes'))
      ALTER TABLE ElectionVotes ADD VoterCNIC NVARCHAR(20);
    `);
    
    // Add CandidateId column if missing
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'CandidateId' AND Object_ID = OBJECT_ID('ElectionVotes'))
      ALTER TABLE ElectionVotes ADD CandidateId INT;
    `);
    
    // Add ElectionEndDate column if missing
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'ElectionEndDate' AND Object_ID = OBJECT_ID('ElectionVotes'))
      ALTER TABLE ElectionVotes ADD ElectionEndDate DATE;
    `);
    
    console.log("✓ Table ElectionVotes ready.");
    console.log("✓ Table Elections ready.");

    // Create Candidates Table (self-nominations)
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Candidates' AND xtype='U')
      CREATE TABLE Candidates (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        CNIC NVARCHAR(20) NOT NULL,
        NHC_Id INT NOT NULL,
        Category NVARCHAR(50) NOT NULL,
        Status NVARCHAR(50) DEFAULT 'Pending',
        NominationEndDate DATE,
        TotalVotes INT DEFAULT 0,
        IsEligible BIT DEFAULT 0,
        CreatedDate DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (NHC_Id) REFERENCES NHC_Zones(Id)
      )
    `);
    
    // Add NominationEndDate column if missing
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'NominationEndDate' AND Object_ID = OBJECT_ID('Candidates'))
      ALTER TABLE Candidates ADD NominationEndDate DATE;
    `);
    
    // Add TotalVotes column if missing
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'TotalVotes' AND Object_ID = OBJECT_ID('Candidates'))
      ALTER TABLE Candidates ADD TotalVotes INT DEFAULT 0;
    `);
    
    // Add IsEligible column if missing
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'IsEligible' AND Object_ID = OBJECT_ID('Candidates'))
      ALTER TABLE Candidates ADD IsEligible BIT DEFAULT 0;
    `);
    
    // Add NominationId FK if missing (link each candidate to a specific nomination period)
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'NominationId' AND Object_ID = OBJECT_ID('Candidates'))
      ALTER TABLE Candidates ADD NominationId INT, FOREIGN KEY (NominationId) REFERENCES Nominations(Id);
    `);
    
    console.log("✓ Table Candidates ready with NominationId FK.");

    // --- PANEL FEATURE TABLES ---
    // Keep schema migrations non-destructive so startup never fails because of FK dependencies.
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Panels' AND xtype='U')
      CREATE TABLE Panels (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        PanelName NVARCHAR(100),
        PresidentCNIC NVARCHAR(20) NOT NULL,
        NHC_Id INT NOT NULL,
        ComplaintId INT NULL,
        Description NVARCHAR(MAX) NULL,
        IsCommittee BIT DEFAULT 0,
        Status NVARCHAR(20) DEFAULT 'pending',
        CreatedDate DATETIME DEFAULT GETDATE()
      )
    `);

    // Add Panels columns if missing (for older databases)
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'PanelName' AND Object_ID = OBJECT_ID('Panels'))
      ALTER TABLE Panels ADD PanelName NVARCHAR(100);
    `);
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'PresidentCNIC' AND Object_ID = OBJECT_ID('Panels'))
      ALTER TABLE Panels ADD PresidentCNIC NVARCHAR(20) NULL;
    `);
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'NHC_Id' AND Object_ID = OBJECT_ID('Panels'))
      ALTER TABLE Panels ADD NHC_Id INT NULL;
    `);
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'ComplaintId' AND Object_ID = OBJECT_ID('Panels'))
      ALTER TABLE Panels ADD ComplaintId INT NULL;
    `);
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'Description' AND Object_ID = OBJECT_ID('Panels'))
      ALTER TABLE Panels ADD Description NVARCHAR(MAX) NULL;
    `);
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'IsCommittee' AND Object_ID = OBJECT_ID('Panels'))
      ALTER TABLE Panels ADD IsCommittee BIT DEFAULT 0;
    `);
    await nhcPool.request().query(`
      IF EXISTS (SELECT * FROM sysobjects WHERE name='PanelMembers' AND xtype='U')
      BEGIN
        UPDATE p
        SET p.IsCommittee = 1
        FROM Panels p
        WHERE ISNULL(p.IsCommittee, 0) = 0
          AND EXISTS (
            SELECT 1 FROM PanelMembers pm
            WHERE pm.PanelId = p.Id AND LOWER(ISNULL(pm.Role, '')) = 'head'
          );
      END
    `);
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'Status' AND Object_ID = OBJECT_ID('Panels'))
      ALTER TABLE Panels ADD Status NVARCHAR(20) DEFAULT 'pending';
    `);
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'CreatedDate' AND Object_ID = OBJECT_ID('Panels'))
      ALTER TABLE Panels ADD CreatedDate DATETIME DEFAULT GETDATE();
    `);

    // Create Complaints Table (must be before PanelComplaints which references it)
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Complaints' AND xtype='U')
      CREATE TABLE Complaints (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        UserCNIC NVARCHAR(20) NOT NULL,
        UserName NVARCHAR(100),
        NHC_Code NVARCHAR(100),
        Category NVARCHAR(100),
        Description NVARCHAR(MAX),
        HasBudget BIT DEFAULT 0,
        PhotoPath NVARCHAR(MAX),
        PhotoPaths NVARCHAR(MAX),
        ComplaintType NVARCHAR(20) DEFAULT 'normal',
        AgainstMemberCNIC NVARCHAR(20),
        AgainstMemberName NVARCHAR(100),
        ResolutionPhotoPaths NVARCHAR(MAX),
        CommitteeRemarks NVARCHAR(MAX),
        MeetingDecision NVARCHAR(100),
        MeetingMinutesPath NVARCHAR(MAX),
        MeetingDate DATETIME,
        Status NVARCHAR(50) DEFAULT 'Pending',
        CreatedDate DATETIME DEFAULT GETDATE(),
        UpdatedDate DATETIME DEFAULT GETDATE(),

        -- Budget Allocation Fields
        BudgetAllocatedAmount DECIMAL(18,2) DEFAULT 0,
        BudgetAllocatedDate DATETIME NULL,
        BudgetAllocatedByCNIC NVARCHAR(20) NULL,
        BudgetAllocationStatus NVARCHAR(50) DEFAULT 'pending', -- pending, allocated, released
        BudgetCategory NVARCHAR(100) NULL,
        BudgetReleasedDate DATETIME NULL,
        BudgetReleasedByCNIC NVARCHAR(20) NULL
      )
    `);

    // Add complaint columns if missing (for existing databases)
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'PhotoPaths' AND Object_ID = OBJECT_ID('Complaints'))
      ALTER TABLE Complaints ADD PhotoPaths NVARCHAR(MAX);
    `);
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'ComplaintType' AND Object_ID = OBJECT_ID('Complaints'))
      ALTER TABLE Complaints ADD ComplaintType NVARCHAR(20) DEFAULT 'normal';
    `);
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'AgainstMemberCNIC' AND Object_ID = OBJECT_ID('Complaints'))
      ALTER TABLE Complaints ADD AgainstMemberCNIC NVARCHAR(20);
    `);
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'AgainstMemberName' AND Object_ID = OBJECT_ID('Complaints'))
      ALTER TABLE Complaints ADD AgainstMemberName NVARCHAR(100);
    `);
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'ResolutionPhotoPaths' AND Object_ID = OBJECT_ID('Complaints'))
      ALTER TABLE Complaints ADD ResolutionPhotoPaths NVARCHAR(MAX);
    `);
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'CommitteeRemarks' AND Object_ID = OBJECT_ID('Complaints'))
      ALTER TABLE Complaints ADD CommitteeRemarks NVARCHAR(MAX);
    `);
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'MeetingDecision' AND Object_ID = OBJECT_ID('Complaints'))
      ALTER TABLE Complaints ADD MeetingDecision NVARCHAR(100);
    `);
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'MeetingMinutesPath' AND Object_ID = OBJECT_ID('Complaints'))
      ALTER TABLE Complaints ADD MeetingMinutesPath NVARCHAR(MAX);
    `);
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'MeetingDate' AND Object_ID = OBJECT_ID('Complaints'))
      ALTER TABLE Complaints ADD MeetingDate DATETIME;
    `);
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'UpdatedDate' AND Object_ID = OBJECT_ID('Complaints'))
      ALTER TABLE Complaints ADD UpdatedDate DATETIME DEFAULT GETDATE();
    `);
    console.log("✓ Table Complaints ready.");

    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ComplaintActivityLog' AND xtype='U')
      CREATE TABLE ComplaintActivityLog (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        ComplaintId INT NOT NULL,
        ActorCNIC NVARCHAR(20) NULL,
        ActorRole NVARCHAR(50) NULL,
        ActionType NVARCHAR(50) NOT NULL,
        RemarksSnapshot NVARCHAR(MAX) NULL,
        DecisionSnapshot NVARCHAR(100) NULL,
        MinutesPathSnapshot NVARCHAR(MAX) NULL,
        ResolutionPhotosSnapshot NVARCHAR(MAX) NULL,
        StatusSnapshot NVARCHAR(50) NULL,
        CreatedDate DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (ComplaintId) REFERENCES Complaints(Id)
      )
    `);
    console.log("✓ Table ComplaintActivityLog ready.");

    // Create PanelMembers table for treasurer/vice invitations
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='PanelMembers' AND xtype='U')
      CREATE TABLE PanelMembers (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        PanelId INT NOT NULL,
        CNIC NVARCHAR(20) NOT NULL,
        Role NVARCHAR(50) NOT NULL,
        InviteStatus NVARCHAR(20) DEFAULT 'pending',
        CreatedDate DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (PanelId) REFERENCES Panels(Id)
      )
    `);

    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='PanelComplaints' AND xtype='U')
      CREATE TABLE PanelComplaints (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        PanelId INT NOT NULL,
        ComplaintId INT NOT NULL,
        CreatedDate DATETIME DEFAULT GETDATE(),
        CONSTRAINT UQ_PanelComplaints_Panel_Complaint UNIQUE (PanelId, ComplaintId),
        FOREIGN KEY (PanelId) REFERENCES Panels(Id),
        FOREIGN KEY (ComplaintId) REFERENCES Complaints(Id)
      )
    `);

    await nhcPool.request().query(`
      IF NOT EXISTS (
        SELECT 1 FROM sys.indexes WHERE name = 'UQ_PanelComplaints_Panel_Complaint' AND object_id = OBJECT_ID('PanelComplaints')
      )
      ALTER TABLE PanelComplaints ADD CONSTRAINT UQ_PanelComplaints_Panel_Complaint UNIQUE (PanelId, ComplaintId);
    `);

    console.log("✓ Table Panels, PanelMembers and PanelComplaints ready.");

    // --- Update Candidates table to link to panels ---
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'PanelId' AND Object_ID = OBJECT_ID('Candidates'))
      ALTER TABLE Candidates ADD PanelId INT NULL;
    `);

    // If a foreign key on PanelId doesn't exist yet, add one (only if Panels table exists)
    await nhcPool.request().query(`
      IF NOT EXISTS (
        SELECT * FROM sys.foreign_keys WHERE parent_object_id = OBJECT_ID('Candidates') AND name = 'FK_Candidates_Panels'
      )
      ALTER TABLE Candidates ADD CONSTRAINT FK_Candidates_Panels FOREIGN KEY (PanelId) REFERENCES Panels(Id);
    `);

    // Create CandidateSupports Table (for tracking supports/votes)
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='CandidateSupports' AND xtype='U')
      CREATE TABLE CandidateSupports (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        CandidateId INT NOT NULL,
        SupporterCNIC NVARCHAR(20) NOT NULL,
        NHC_Id INT,
        NominationEndDate DATE,
        CreatedDate DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (CandidateId) REFERENCES Candidates(Id)
      )
    `);
    
    // Add NHC_Id column if missing
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'NHC_Id' AND Object_ID = OBJECT_ID('CandidateSupports'))
      ALTER TABLE CandidateSupports ADD NHC_Id INT;
    `);
    
    // Add NominationEndDate column if missing
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'NominationEndDate' AND Object_ID = OBJECT_ID('CandidateSupports'))
      ALTER TABLE CandidateSupports ADD NominationEndDate DATE;
    `);
    
    console.log("✓ Table CandidateSupports ready.");

    // Create ElectionResults Table (stores finalized results when election ends)
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ElectionResults' AND xtype='U')
      CREATE TABLE ElectionResults (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        ElectionId INT NOT NULL,
        NHC_Id INT NOT NULL,
        CandidateId INT NOT NULL,
        CNIC NVARCHAR(20),
        FirstName NVARCHAR(50),
        LastName NVARCHAR(50),
        Category NVARCHAR(50),
        TotalVotes INT DEFAULT 0,
        CreatedDate DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (ElectionId) REFERENCES Elections(Id),
        FOREIGN KEY (NHC_Id) REFERENCES NHC_Zones(Id),
        FOREIGN KEY (CandidateId) REFERENCES Candidates(Id)
      )
    `);
    console.log("✓ Table ElectionResults ready.");

    // Create Table Suggestions
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Suggestions')
      CREATE TABLE Suggestions (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        UserCNIC NVARCHAR(20) NOT NULL,
        UserName NVARCHAR(100),
        NHC_Code NVARCHAR(100),
        Title NVARCHAR(200),
        Description NVARCHAR(MAX),
        Status NVARCHAR(50) DEFAULT 'New',
        CreatedDate DATETIME DEFAULT GETDATE()
      )
    `);
    console.log("✓ Table Suggestions ready.");

    // === PRESIDENT APPROVAL FEATURE - NEW COLUMNS ===
    // Add new columns to Complaints table for president approval tracking
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'PresidentApprovalStatus' AND Object_ID = OBJECT_ID('Complaints'))
      ALTER TABLE Complaints ADD PresidentApprovalStatus NVARCHAR(50) DEFAULT 'pending';
    `);
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'PresidentApprovalComments' AND Object_ID = OBJECT_ID('Complaints'))
      ALTER TABLE Complaints ADD PresidentApprovalComments NVARCHAR(MAX) NULL;
    `);
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'PresidentApprovingCNIC' AND Object_ID = OBJECT_ID('Complaints'))
      ALTER TABLE Complaints ADD PresidentApprovingCNIC NVARCHAR(20) NULL;

      -- Budget Allocation Columns
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'BudgetAllocatedAmount' AND Object_ID = OBJECT_ID('Complaints'))
      ALTER TABLE Complaints ADD BudgetAllocatedAmount DECIMAL(18,2) DEFAULT 0;

      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'BudgetAllocatedDate' AND Object_ID = OBJECT_ID('Complaints'))
      ALTER TABLE Complaints ADD BudgetAllocatedDate DATETIME NULL;

      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'BudgetAllocatedByCNIC' AND Object_ID = OBJECT_ID('Complaints'))
      ALTER TABLE Complaints ADD BudgetAllocatedByCNIC NVARCHAR(20) NULL;

      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'BudgetAllocationStatus' AND Object_ID = OBJECT_ID('Complaints'))
      ALTER TABLE Complaints ADD BudgetAllocationStatus NVARCHAR(50) DEFAULT 'pending';

      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'BudgetCategory' AND Object_ID = OBJECT_ID('Complaints'))
      ALTER TABLE Complaints ADD BudgetCategory NVARCHAR(100) NULL;

      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'BudgetReleasedDate' AND Object_ID = OBJECT_ID('Complaints'))
      ALTER TABLE Complaints ADD BudgetReleasedDate DATETIME NULL;

      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'BudgetReleasedByCNIC' AND Object_ID = OBJECT_ID('Complaints'))
      ALTER TABLE Complaints ADD BudgetReleasedByCNIC NVARCHAR(20) NULL;
    `);
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'ApprovedDate' AND Object_ID = OBJECT_ID('Complaints'))
      ALTER TABLE Complaints ADD ApprovedDate DATETIME NULL;
    `);
    console.log("✓ Complaints table: President approval columns added.");

    // Add new columns to Panels table for tracking completion
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'CompletedDate' AND Object_ID = OBJECT_ID('Panels'))
      ALTER TABLE Panels ADD CompletedDate DATETIME NULL;
    `);
    console.log("✓ Panels table: CompletedDate column added.");

    // === PANEL COMPLAINT HISTORY TABLE ===
    // Tracks history of panel assignments for auditing and statistics
    await nhcPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='PanelComplaintHistory' AND xtype='U')
      CREATE TABLE PanelComplaintHistory (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        PanelId INT NOT NULL,
        ComplaintId INT NOT NULL,
        AssignedDate DATETIME,
        CompletedDate DATETIME NULL,
        CompletionStatus NVARCHAR(50) NULL,
        PresidentComments NVARCHAR(MAX) NULL,
        PresidentCNIC NVARCHAR(20) NULL,
        CreatedDate DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (PanelId) REFERENCES Panels(Id),
        FOREIGN KEY (ComplaintId) REFERENCES Complaints(Id)
      )
    `);
    console.log("✓ Table PanelComplaintHistory created.");

    console.log("✓ All tables initialized successfully.");
    await nhcPool.close();

  } catch (err) {
    console.error("❌ DATABASE INITIALIZATION FAILED:");
    console.error("Error Details:", err); 
    throw err;
  }
}

async function ensureSuggestionsTableExists(pool) {
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Suggestions')
    CREATE TABLE Suggestions (
      Id INT IDENTITY(1,1) PRIMARY KEY,
      UserCNIC NVARCHAR(20) NOT NULL,
      UserName NVARCHAR(100),
      NHC_Code NVARCHAR(100),
      Title NVARCHAR(200),
      Description NVARCHAR(MAX),
      Status NVARCHAR(50) DEFAULT 'New',
      CreatedDate DATETIME DEFAULT GETDATE()
    )
  `);
}

// --- ROUTES ---

// root health check / informational
app.get('/', (req, res) => {
  res.send('NHC server is running');
});

// 1. GET NHC Zones
app.get('/api/nhc', async (req, res) => {
  console.log("GET /api/nhc called...");
  try {
    let pool = await sql.connect(dbConfig);
    let result = await pool.request().query("SELECT * FROM NHC_Zones");
    const zones = result.recordset.map(z => ({ 
        id: z.Id, 
        name: z.Name, 
        points: JSON.parse(z.ZoneData) 
    }));
    res.json(zones);
  } catch (err) {
    console.error("❌ GET Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// 2. CREATE NHC Zone
app.post('/api/nhc', async (req, res) => {
  console.log("POST /api/nhc called...");
  const { name, points } = req.body;
  let pool;
  try {
    pool = await sql.connect(dbConfig);
    const query = "INSERT INTO NHC_Zones (Name, ZoneData) VALUES (@Name, @ZoneData); SELECT SCOPE_IDENTITY() as id";
    const result = await pool.request()
      .input('Name', sql.NVarChar, name)
      .input('ZoneData', sql.NVarChar(sql.MAX), JSON.stringify(points))
      .query(query);
    const id = result.recordset[0].id;
    res.status(201).json({ message: "NHC Created", id: id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (pool) await pool.close();
  }
});

// 2.5 SET NOMINATION DATE FOR NHC
app.put('/api/nhc/nomination', async (req, res) => {
  console.log("PUT /api/nhc/nomination called...");
  const { nhcId, nominationStartDate, nominationEndDate } = req.body;
  console.log("📥 Received data:", { nhcId, nominationStartDate, nominationEndDate });
  let pool;
  try {
    pool = await sql.connect(dbConfig);
    
    // Validate dates
    if (!nominationStartDate || !nominationEndDate) {
      return res.status(400).json({ error: 'Both start and end dates are required' });
    }
    
    if (nominationStartDate > nominationEndDate) {
      return res.status(400).json({ error: 'Start date cannot be after end date' });
    }
    
    // Get NHC name
    const nhcResult = await pool.request()
      .input('Id', sql.Int, nhcId)
      .query('SELECT Name FROM NHC_Zones WHERE Id = @Id');
    
    if (nhcResult.recordset.length === 0) {
      return res.status(404).json({ error: 'NHC not found' });
    }
    
    const nhcName = nhcResult.recordset[0].Name;
    
    // Keep historical nominations; DO NOT delete previous records.
    // Deleting old nominations would break FK relationships (Candidates -> Nominations).
    // We insert a new nomination record and keep history for auditing.
    
    // Insert new nomination record
    const result = await pool.request()
      .input('NHC_Id', sql.Int, nhcId)
      .input('NominationStartDate', sql.Date, nominationStartDate)
      .input('NominationEndDate', sql.Date, nominationEndDate)
      .query('INSERT INTO Nominations (NHC_Id, NominationStartDate, NominationEndDate) VALUES (@NHC_Id, @NominationStartDate, @NominationEndDate); SELECT SCOPE_IDENTITY() as id');
    
    const id = result.recordset[0].id;
    console.log("✓ Inserted new nomination record with ID:", id);
    
    // Send notifications to all members of this NHC (lookup via mapping table)
    const membersResult = await pool.request()
      .input('NHC_Code', sql.NVarChar, nhcName)
      .query("SELECT u.CNIC FROM Users u JOIN UserNHCs m ON u.CNIC = m.UserCNIC WHERE m.NHC_Code = @NHC_Code");
    
    console.log(`📢 Found ${membersResult.recordset.length} members in NHC: ${nhcName}`);
    
    for (const member of membersResult.recordset) {
      try {
        await pool.request()
          .input('RecipientCNIC', sql.NVarChar, member.CNIC)
          .input('Message', sql.NVarChar(sql.MAX), `Nomination period for ${nhcName} is set from ${nominationStartDate} to ${nominationEndDate}`)
          .query("INSERT INTO Notifications (RecipientCNIC, Message) VALUES (@RecipientCNIC, @Message)");
        console.log(`✓ Notification sent to ${member.CNIC}`);
      } catch (noteErr) {
        console.error(`❌ Failed to send notification to ${member.CNIC}:`, noteErr);
      }
    }
    
    res.status(200).json({ message: "Nomination dates set successfully and notifications sent", id: id });
  } catch (err) {
    console.error("❌ Error setting nomination date:", err);
    res.status(500).json({ error: err.message });
  } finally {
    if (pool) await pool.close();
  }
});

// 2.5 END NOMINATION FOR NHC (mark as ended, preserve history)
app.delete('/api/nhc/nomination/:nhcId', async (req, res) => {
  console.log("DELETE /api/nhc/nomination called...");
  const nhcId = parseInt(req.params.nhcId, 10);
  if (!nhcId) return res.status(400).json({ error: 'nhcId is required' });

  let pool;
  try {
    pool = await sql.connect(dbConfig);
    
    // Mark nomination as ended immediately by setting end date to yesterday
    // This ensures it no longer appears in the "active nominations" query (which is inclusive of today)
    const result = await pool.request()
      .input('NHC_Id', sql.Int, nhcId)
      .query(`
        UPDATE Nominations 
        SET NominationEndDate = DATEADD(day, -1, CAST(GETDATE() AS DATE)) 
        WHERE NHC_Id = @NHC_Id 
        AND NominationEndDate >= CAST(GETDATE() AS DATE)
      `);

    console.log("✓ Marked nomination as ended (set end date to yesterday) for NHC_Id:", nhcId);

    res.status(200).json({ message: "Nomination period ended successfully (history preserved)" });
  } catch (err) {
    console.error("❌ Error ending nomination:", err);
    res.status(500).json({ error: err.message });
  } finally {
    if (pool) await pool.close();
  }
});

// 2.6 SET ELECTION DATE FOR NHC
app.put('/api/nhc/election', async (req, res) => {
  console.log("PUT /api/nhc/election called...");
  const { nhcId, electionStartDate, electionEndDate } = req.body;
  console.log("📥 Received data:", { nhcId, electionStartDate, electionEndDate });
  let pool;
  try {
    pool = await sql.connect(dbConfig);
    
    // Validate dates
    if (!electionStartDate || !electionEndDate) {
      return res.status(400).json({ error: 'Both start and end dates are required' });
    }
    
    if (electionStartDate > electionEndDate) {
      return res.status(400).json({ error: 'Start date cannot be after end date' });
    }
    
    // Get NHC name
    const nhcResult = await pool.request()
      .input('Id', sql.Int, nhcId)
      .query('SELECT Name FROM NHC_Zones WHERE Id = @Id');
    
    if (nhcResult.recordset.length === 0) {
      return res.status(404).json({ error: 'NHC not found' });
    }
    
    const nhcName = nhcResult.recordset[0].Name;
    
    // Keep historical election records and votes for audit purposes.
    // Insert new election record (do not delete previous Elections or ElectionVotes)
    
    // Insert new election record
    const result = await pool.request()
      .input('NHC_Id', sql.Int, nhcId)
      .input('ElectionStartDate', sql.Date, electionStartDate)
      .input('ElectionEndDate', sql.Date, electionEndDate)
      .query('INSERT INTO Elections (NHC_Id, ElectionStartDate, ElectionEndDate) VALUES (@NHC_Id, @ElectionStartDate, @ElectionEndDate); SELECT SCOPE_IDENTITY() as id');
    
    const id = result.recordset[0].id;
    console.log("✓ Inserted new election record with ID:", id);
    
    // Send notifications to all members of this NHC (lookup via mapping table)
    const membersResult = await pool.request()
      .input('NHC_Code', sql.NVarChar, nhcName)
      .query("SELECT u.CNIC FROM Users u JOIN UserNHCs m ON u.CNIC = m.UserCNIC WHERE m.NHC_Code = @NHC_Code");
    
    console.log(`📢 Found ${membersResult.recordset.length} members in NHC: ${nhcName}`);
    
    for (const member of membersResult.recordset) {
      try {
        await pool.request()
          .input('RecipientCNIC', sql.NVarChar, member.CNIC)
          .input('Message', sql.NVarChar(sql.MAX), `Election period for ${nhcName} is set from ${electionStartDate} to ${electionEndDate}`)
          .query("INSERT INTO Notifications (RecipientCNIC, Message) VALUES (@RecipientCNIC, @Message)");
        console.log(`✓ Notification sent to ${member.CNIC}`);
      } catch (noteErr) {
        console.error(`❌ Failed to send notification to ${member.CNIC}:`, noteErr);
      }
    }
    
    res.status(200).json({ message: "Election dates set successfully and notifications sent", id: id });
  } catch (err) {
    console.error("❌ Error setting election date:", err);
    res.status(500).json({ error: err.message });
  } finally {
    if (pool) await pool.close();
  }
});

// 2.6A DELETE ELECTIONS FOR NHC
app.delete('/api/nhc/election/:nhcId', async (req, res) => {
  console.log("DELETE /api/nhc/election called...");
  const nhcId = parseInt(req.params.nhcId, 10);
  if (!nhcId) return res.status(400).json({ error: 'nhcId is required' });

  let pool;
  try {
    pool = await sql.connect(dbConfig);
    
    // Get the latest election for this NHC
    const elRes = await pool.request()
      .input('NHC_Id', sql.Int, nhcId)
      .query(`
        SELECT TOP 1 Id, NHC_Id FROM Elections 
        WHERE NHC_Id = @NHC_Id 
        ORDER BY CreatedDate DESC
      `);

    if (elRes.recordset.length === 0) {
      return res.status(404).json({ error: 'Election not found for this NHC' });
    }

    const electionId = elRes.recordset[0].Id;

    // First, calculate and store results from ElectionVotes before marking as ended
    // IMPORTANT: Only include candidates from the LATEST nomination period using NominationId
    const latestNomRes = await pool.request()
      .input('NHC_Id', sql.Int, nhcId)
      .query(`SELECT TOP 1 Id FROM Nominations WHERE NHC_Id = @NHC_Id ORDER BY CreatedDate DESC`);
    
    const latestNominationId = latestNomRes.recordset.length > 0 ? latestNomRes.recordset[0].Id : null;
    
    const resultsData = await pool.request()
      .input('ElectionId', sql.Int, electionId)
      .input('NHC_Id', sql.Int, nhcId)
      .input('NominationId', sql.Int, latestNominationId)
      .query(`
        SELECT 
          c.Id as CandidateId,
          c.CNIC,
          c.PanelId,
          ISNULL(u.FirstName, '') AS FirstName,
          ISNULL(u.LastName, '') AS LastName,
          c.Category,
          ISNULL(v.TotalVotes, 0) AS TotalVotes
        FROM Candidates c
        LEFT JOIN Users u ON c.CNIC = u.CNIC
        LEFT JOIN (
          SELECT CandidateId, COUNT(*) AS TotalVotes FROM ElectionVotes WHERE ElectionId = @ElectionId GROUP BY CandidateId
        ) v ON v.CandidateId = c.Id
        WHERE c.NHC_Id = @NHC_Id AND c.IsEligible = 1
          AND (@NominationId IS NULL OR c.NominationId = @NominationId)
      `);

    // Insert results into ElectionResults table
    for (const candidate of resultsData.recordset) {
      await pool.request()
        .input('ElectionId', sql.Int, electionId)
        .input('NHC_Id', sql.Int, nhcId)
        .input('CandidateId', sql.Int, candidate.CandidateId)
        .input('CNIC', sql.NVarChar, candidate.CNIC)
        .input('FirstName', sql.NVarChar, candidate.FirstName)
        .input('LastName', sql.NVarChar, candidate.LastName)
        .input('Category', sql.NVarChar, candidate.Category)
        .input('TotalVotes', sql.Int, candidate.TotalVotes)
        .query(`
          INSERT INTO ElectionResults (ElectionId, NHC_Id, CandidateId, CNIC, FirstName, LastName, Category, TotalVotes, CreatedDate)
          VALUES (@ElectionId, @NHC_Id, @CandidateId, @CNIC, @FirstName, @LastName, @Category, @TotalVotes, GETDATE())
        `);
    }

    // --- Assign Roles to Winners and reset previous role-holders for this NHC ---
    try {
      // Resolve NHC name
      const nhcNameRes = await pool.request()
        .input('NHC_Id', sql.Int, nhcId)
        .query('SELECT Name FROM NHC_Zones WHERE Id = @NHC_Id');
      const nhcName = nhcNameRes.recordset.length > 0 ? nhcNameRes.recordset[0].Name : null;

      // Reset roles for all positions for users in this NHC (set back to 'User')
      const posRes = await pool.request().query('SELECT Name FROM Positions');
      for (const p of posRes.recordset) {
        try {
          // Reset in Users table
          await pool.request()
            .input('NHC_Code', sql.NVarChar, nhcName)
            .input('RoleName', sql.NVarChar, p.Name)
            .query("UPDATE Users SET Role = 'User' WHERE CNIC IN (SELECT UserCNIC FROM UserNHCs WHERE NHC_Code = @NHC_Code) AND Role = @RoleName");
          
          // Also reset in UserNHCs table for this specific NHC
          await pool.request()
            .input('NHC_Code', sql.NVarChar, nhcName)
            .input('RoleName', sql.NVarChar, p.Name)
            .query("UPDATE UserNHCs SET Role = 'Member' WHERE NHC_Code = @NHC_Code AND Role = @RoleName");
        } catch (e) {
          console.error('Failed to reset role for position', p.Name, e);
        }
      }

      // Assign roles for winners.  If the candidate belongs to a panel, update every
      // member of that panel according to the role stored in PanelMembers.  Otherwise
      // fall back to the old behaviour (independent candidates).
      const processedPanels = new Set();
      for (const candidate of resultsData.recordset) {
        if (candidate.PanelId) {
          // Avoid processing the same panel twice
          if (processedPanels.has(candidate.PanelId)) continue;
          processedPanels.add(candidate.PanelId);

          try {
            const memRes = await pool.request()
              .input('PanelId', sql.Int, candidate.PanelId)
              .query(`
                SELECT CNIC, Role FROM PanelMembers
                WHERE PanelId = @PanelId AND InviteStatus = 'accepted'
              `);
            for (const m of memRes.recordset) {
              try {
                // Update Users table
                await pool.request()
                  .input('CNIC', sql.NVarChar, m.CNIC)
                  .input('RoleName', sql.NVarChar, m.Role)
                  .query('UPDATE Users SET Role = @RoleName WHERE CNIC = @CNIC');
                
                // Also update UserNHCs table for this specific NHC
                await pool.request()
                  .input('CNIC', sql.NVarChar, m.CNIC)
                  .input('NHC_Code', sql.NVarChar, nhcName)
                  .input('RoleName', sql.NVarChar, m.Role)
                  .query('UPDATE UserNHCs SET Role = @RoleName WHERE UserCNIC = @CNIC AND NHC_Code = @NHC_Code');
                
                console.log(`✓ Assigned panel member role ${m.Role} to user ${m.CNIC}`);
              } catch (innerErr) {
                console.error('Failed to update role for panel member', m.CNIC, innerErr);
              }
            }
          } catch (pErr) {
            console.error('Error loading panel members for PanelId', candidate.PanelId, pErr);
          }
        } else {
          // Individual candidate (not panel-based)
          try {
            // Update Users table
            await pool.request()
              .input('CNIC', sql.NVarChar, candidate.CNIC)
              .input('RoleName', sql.NVarChar, candidate.Category)
              .query('UPDATE Users SET Role = @RoleName WHERE CNIC = @CNIC');
            
            // Also update UserNHCs table for this specific NHC
            await pool.request()
              .input('CNIC', sql.NVarChar, candidate.CNIC)
              .input('NHC_Code', sql.NVarChar, nhcName)
              .input('RoleName', sql.NVarChar, candidate.Category)
              .query('UPDATE UserNHCs SET Role = @RoleName WHERE UserCNIC = @CNIC AND NHC_Code = @NHC_Code');
            
            console.log(`✓ Assigned role ${candidate.Category} to user ${candidate.CNIC}`);
          } catch (e) {
            console.error('Failed to assign role to winner', candidate.CNIC, e);
          }
        }
      }
    } catch (roleErr) {
      console.error('Error assigning roles after election:', roleErr);
    }

    // Update the ElectionEndDate to today ONLY for the current election (preserve votes for results/audit)
    await pool.request()
      .input('Id', sql.Int, electionId)
      .query("UPDATE Elections SET ElectionEndDate = CAST(GETDATE() AS DATE) WHERE Id = @Id");

    console.log("✓ Marked election as ended for NHC_Id:", nhcId);
    console.log("✓ Stored", resultsData.recordset.length, "results in ElectionResults table");

    res.status(200).json({ 
      message: "Election ended successfully and results stored",
      resultsStored: resultsData.recordset.length
    });
  } catch (err) {
    console.error("❌ Error deleting election date:", err);
    res.status(500).json({ error: err.message });
  } finally {
    if (pool) await pool.close();
  }
});

// 2.7 GET ALL NOMINATIONS (filtered by NHC if nhcId provided)
app.get('/api/nominations', async (req, res) => {
  console.log("GET /api/nominations called...", req.query);
  const { nhcId } = req.query;
  let pool;
  try {
    pool = await sql.connect(dbConfig);
    
    let query = `
      SELECT n.Id, n.NHC_Id, n.NominationStartDate, n.NominationEndDate, n.CreatedDate, nz.Name as NHCName 
      FROM Nominations n
      LEFT JOIN NHC_Zones nz ON n.NHC_Id = nz.Id
      WHERE n.CreatedDate = (
        SELECT MAX(CreatedDate) 
        FROM Nominations n2 
        WHERE n2.NHC_Id = n.NHC_Id
      )
      AND CAST(GETDATE() AS DATE) <= n.NominationEndDate
    `;
    
    // If specific NHC requested, filter by it
    if (nhcId) {
      query += ` AND n.NHC_Id = ${parseInt(nhcId, 10)}`;
    }
    
    query += ` ORDER BY n.NominationStartDate DESC`;
    
    const result = await pool.request().query(query);
    console.log("✓ Fetched active nominations:", result.recordset.length);
    res.json(result.recordset);
  } catch (err) {
    console.error("❌ Error fetching nominations:", err);
    res.status(500).json({ error: err.message });
  } finally {
    if (pool) await pool.close();
  }
});

// 2.8 GET ALL ELECTIONS (filtered by NHC if nhcId provided)
app.get('/api/elections', async (req, res) => {
  console.log("GET /api/elections called...", req.query);
  const { nhcId } = req.query;
  let pool;
  try {
    pool = await sql.connect(dbConfig);
    
    let query = `
      SELECT e.Id, e.NHC_Id, e.ElectionStartDate, e.ElectionEndDate, e.CreatedDate, nz.Name as NHCName 
      FROM Elections e
      LEFT JOIN NHC_Zones nz ON e.NHC_Id = nz.Id
      WHERE e.CreatedDate = (
        SELECT MAX(CreatedDate) 
        FROM Elections e2 
        WHERE e2.NHC_Id = e.NHC_Id
      )
      AND CAST(GETDATE() AS DATE) < e.ElectionEndDate
    `;
    
    // If specific NHC requested, filter by it
    if (nhcId) {
      query += ` AND e.NHC_Id = ${parseInt(nhcId, 10)}`;
    }
    
    query += ` ORDER BY e.ElectionStartDate DESC`;
    
    const result = await pool.request().query(query);
    console.log("✓ Fetched active elections:", result.recordset.length);
    res.json(result.recordset);
  } catch (err) {
    console.error("❌ Error fetching elections:", err);
    res.status(500).json({ error: err.message });
  } finally {
    if (pool) await pool.close();
  }
});

// Get latest election for NHC (including ended elections) - for status checking
app.get('/api/election-by-nhc/:nhcId', async (req, res) => {
  console.log("GET /api/election-by-nhc/:nhcId called...", req.params.nhcId);
  const { nhcId } = req.params;
  let pool;
  try {
    pool = await sql.connect(dbConfig);
    const result = await pool.request()
      .input('NHC_Id', sql.Int, nhcId)
      .query(`
        SELECT e.Id, e.NHC_Id, e.ElectionStartDate, e.ElectionEndDate, e.CreatedDate, nz.Name as NHCName 
        FROM Elections e
        LEFT JOIN NHC_Zones nz ON e.NHC_Id = nz.Id
        WHERE e.NHC_Id = @NHC_Id
        AND e.CreatedDate = (
          SELECT MAX(CreatedDate) 
          FROM Elections e2 
          WHERE e2.NHC_Id = @NHC_Id
        )
        ORDER BY e.CreatedDate DESC
      `);
    console.log("✓ Fetched election for NHC", nhcId, ":", result.recordset.length > 0 ? result.recordset[0] : "None");
    if (result.recordset.length > 0) {
      res.json(result.recordset[0]);
    } else {
      res.status(404).json({ error: 'No election found for this NHC' });
    }
  } catch (err) {
    console.error("❌ Error fetching election by NHC:", err);
    res.status(500).json({ error: err.message });
  } finally {
    if (pool) await pool.close();
  }
});

// Get past election results from ElectionResults table
app.get('/api/election-results/:nhcId', async (req, res) => {
  console.log("GET /api/election-results/:nhcId called...", req.params.nhcId);
  const { nhcId } = req.params;
  let pool;
  try {
    pool = await sql.connect(dbConfig);

    // Fetch results for ALL elections for this NHC, newest first
    const result = await pool.request()
      .input('NHC_Id', sql.Int, nhcId)
      .query(`
        SELECT er.*, c.PanelId, e.ElectionStartDate, e.ElectionEndDate FROM ElectionResults er
        JOIN Elections e ON er.ElectionId = e.Id
        LEFT JOIN Candidates c ON er.CandidateId = c.Id
        WHERE er.NHC_Id = @NHC_Id
        ORDER BY er.ElectionId DESC, er.Category ASC, er.TotalVotes DESC
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'No past election results found' });
    }

    // Group results by election, then by position/category and include panel members
    const resultsByElection = {};
    for (const row of result.recordset) {
      const r = { ...row };
      // attach panel members if available
      if (r.PanelId) {
        try {
          const mres = await pool.request()
            .input('PanelId', sql.Int, r.PanelId)
            .query(`SELECT pm.CNIC, pm.Role, pm.InviteStatus, ISNULL(u.FirstName,'') AS FirstName, ISNULL(u.LastName,'') AS LastName FROM PanelMembers pm LEFT JOIN Users u ON pm.CNIC = u.CNIC WHERE pm.PanelId = @PanelId ORDER BY pm.Role`);
          r.PanelMembers = mres.recordset || [];
        } catch (e) {
          console.error('Failed to load panel members for election result PanelId', r.PanelId, e);
          r.PanelMembers = [];
        }
      } else {
        r.PanelMembers = [];
      }

      const electionId = r.ElectionId;
      if (!resultsByElection[electionId]) {
        resultsByElection[electionId] = {
          electionId,
          electionStartDate: r.ElectionStartDate,
          electionEndDate: r.ElectionEndDate,
          positions: {}
        };
      }

      const category = r.Category || 'Unknown';
      if (!resultsByElection[electionId].positions[category]) {
        resultsByElection[electionId].positions[category] = [];
      }

      resultsByElection[electionId].positions[category].push({
        Id: r.CandidateId,
        CNIC: r.CNIC,
        FirstName: r.FirstName,
        LastName: r.LastName,
        Category: category,
        TotalVotes: r.TotalVotes,
        PanelMembers: r.PanelMembers
      });
    }

    console.log("✓ Fetched past election results for NHC", nhcId);
    res.json(resultsByElection);
  } catch (err) {
    console.error("❌ Error fetching past election results:", err);
    res.status(500).json({ error: err.message });
  } finally {
    if (pool) await pool.close();
  }
});

// 3. SIGN UP USER
app.post('/api/signup', async (req, res) => {
  console.log("POST /api/signup called...");
  const { firstName, lastName, gender, cnic, phone, address, location, email, password, nhcCode, profileImage } = req.body;
  let pool;
  try {
    pool = await sql.connect(dbConfig);
    const result = await pool.request()
      .input('FirstName', sql.NVarChar, firstName)
      .input('LastName', sql.NVarChar, lastName)
      .input('Gender', sql.NVarChar, gender)
      .input('CNIC', sql.NVarChar, cnic)
      .input('Phone', sql.NVarChar, phone)
      .input('Address', sql.NVarChar, address)
      .input('Location', sql.NVarChar(sql.MAX), location)
      .input('Email', sql.NVarChar, email)
      .input('Password', sql.NVarChar, password)
      .input('ProfileImage', sql.NVarChar(sql.MAX), profileImage)
      .query("INSERT INTO Users (FirstName, LastName, Gender, CNIC, Phone, Address, Location, Email, Password, ProfileImage) VALUES (@FirstName, @LastName, @Gender, @CNIC, @Phone, @Address, @Location, @Email, @Password, @ProfileImage); SELECT SCOPE_IDENTITY() as id");
    const id = result.recordset[0].id;

    // add mapping record if NHC was detected during signup
    if (nhcCode) {
      const codes = nhcCode.split(',').map(s => s.trim()).filter(Boolean);
      for (const code of codes) {
        try {
          await pool.request()
            .input('UserCNIC', sql.NVarChar, cnic)
            .input('NHC_Code', sql.NVarChar, code)
            .input('Role', sql.NVarChar, 'Member')
            .query('INSERT INTO UserNHCs (UserCNIC, NHC_Code, Role) VALUES (@UserCNIC, @NHC_Code, @Role)');
        } catch(e) {
          // ignore duplicates
        }
      }
    }

    res.status(201).json({ message: "User Registered", id: id });
  } catch (err) {
    console.error("❌ Signup Error:", err);
    if (err.number === 2627) res.status(400).json({ error: "CNIC already exists" });
    else res.status(500).json({ error: err.message });
  } finally {
    if (pool) await pool.close();
  }
});

// 4. LOGIN USER
app.post('/api/login', async (req, res) => {
  console.log("POST /api/login called...");
  const { cnic, password } = req.body;
  let pool;
  try {
    pool = await sql.connect(dbConfig);
    let result = await pool.request()
      .input('CNIC', sql.NVarChar, cnic)
      .input('Password', sql.NVarChar, password)
      .query("SELECT * FROM Users WHERE CNIC = @CNIC AND Password = @Password");
      
    if (result.recordset.length > 0) {
      const user = result.recordset[0];
      
      // fetch multiple codes from mapping table first
      let codes = [];
      try {
        const cRes = await pool.request()
          .input('CNIC', sql.NVarChar, user.CNIC)
          .query('SELECT NHC_Code FROM UserNHCs WHERE UserCNIC = @CNIC');
        codes = cRes.recordset
          .map(r => r.NHC_Code)
          .filter(code => code && code.trim() && code !== 'No NHC Found');  // Filter out null, empty, and "No NHC Found"
      } catch(e) {
        console.error('Error fetching codes for', user.CNIC, e);
      }

      // Get NHC_Id from first mapped code if any
      let nhcId = null;
      if (codes && codes.length > 0) {
        try {
          const nhcResult = await pool.request()
            .input('Name', sql.NVarChar, codes[0])
            .query("SELECT Id FROM NHC_Zones WHERE Name = @Name");
          if (nhcResult.recordset.length > 0) {
            nhcId = nhcResult.recordset[0].Id;
          }
        } catch(e) {
          console.error('lookup nhcId failed:', e);
        }
      }

      res.status(200).json({ 
        message: "Login Successful", 
        role: user.Role,
        firstName: user.FirstName,
        lastName: user.LastName,
        cnic: user.CNIC,
        nhcCode: codes.length > 0 ? codes[0] : null,
        nhcCodes: codes,
        nhcId: nhcId,
        address: user.Address,
        profileImage: ensureFullProfileImageUrl(user.ProfileImage)
      });
    } else {
      res.status(401).json({ error: "Invalid CNIC or Password" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (pool) await pool.close();
  }
});

// 5. UPDATE USER PROFILE
app.put('/api/user', async (req, res) => {
  console.log("PUT /api/user (Update Profile) called...");
  const { cnic, firstName, lastName, email, phone, address, nhcCode } = req.body;
  let pool;
  try {
    pool = await sql.connect(dbConfig);
    // basic profile fields
    await pool.request()
      .input('CNIC', sql.NVarChar, cnic)
      .input('FirstName', sql.NVarChar, firstName)
      .input('LastName', sql.NVarChar, lastName)
      .input('Email', sql.NVarChar, email)
      .input('Phone', sql.NVarChar, phone)
      .input('Address', sql.NVarChar, address)
      .query("UPDATE Users SET FirstName = @FirstName, LastName = @LastName, Email = @Email, Phone = @Phone, Address = @Address WHERE CNIC = @CNIC");

    // if an NHC code was submitted, save mapping
    if (nhcCode) {
      const codes = nhcCode.split(',').map(s => s.trim()).filter(Boolean);
      for (const code of codes) {
        try {
          await pool.request()
            .input('UserCNIC', sql.NVarChar, cnic)
            .input('NHC_Code', sql.NVarChar, code)
            .input('Role', sql.NVarChar, 'Member')
            .query('INSERT INTO UserNHCs (UserCNIC, NHC_Code, Role) VALUES (@UserCNIC, @NHC_Code, @Role)');
        } catch(e) {
          // ignore duplicate entries
        }
      }
    }

    res.status(200).json({ message: "Profile Updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (pool) await pool.close();
  }
});

// 6. GET ALL USERS
app.get('/api/users', async (req, res) => {
  let pool;
  try {
    pool = await sql.connect(dbConfig);
    let result = await pool.request().query(
      `SELECT u.Id, u.FirstName, u.LastName, u.CNIC, u.Email, u.Role,
              -- aggregate codes from mapping table
              STUFF((SELECT ', ' + m.NHC_Code
                     FROM UserNHCs m
                     WHERE m.UserCNIC = u.CNIC
                     FOR XML PATH('')),1,2,'') AS NHC_Code,
              u.CreatedDate
       FROM Users u
       ORDER BY u.CreatedDate DESC`
    );
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (pool) await pool.close();
  }
});

// 6.1 DELETE USER (Admin)
app.delete('/api/users/:id', async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  let pool;
  let transaction;

  if (!userId) {
    return res.status(400).json({ error: 'Valid user id is required' });
  }

  try {
    pool = await sql.connect(dbConfig);
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    const request = new sql.Request(transaction);
    const userRes = await request
      .input('Id', sql.Int, userId)
      .query('SELECT Id, CNIC FROM Users WHERE Id = @Id');

    if (userRes.recordset.length === 0) {
      await transaction.rollback();
      return res.status(404).json({ error: 'User not found' });
    }

    const userCnic = String(userRes.recordset[0].CNIC || '').trim();

    // Remove or detach related records that can block user deletion.
    await new sql.Request(transaction)
      .input('CNIC', sql.NVarChar, userCnic)
      .input('Id', sql.Int, userId)
      .query(`
        DELETE FROM Notifications WHERE RecipientCNIC = @CNIC;
        DELETE FROM UserNHCs WHERE UserCNIC = @CNIC;
        DELETE FROM PanelMembers WHERE CNIC = @CNIC;
        DELETE FROM Requests WHERE CNIC = @CNIC;
        DELETE FROM Suggestions WHERE UserCNIC = @CNIC;
        DELETE FROM ElectionVotes WHERE VoterCNIC = @CNIC;
        DELETE FROM CandidateSupports WHERE SupporterCNIC = @CNIC;
        DELETE FROM Candidates WHERE CNIC = @CNIC;

        UPDATE Complaints SET AgainstMemberCNIC = NULL, AgainstMemberName = NULL WHERE AgainstMemberCNIC = @CNIC;

        DELETE cal
        FROM ComplaintActivityLog cal
        INNER JOIN Complaints c ON c.Id = cal.ComplaintId
        WHERE c.UserCNIC = @CNIC;

        DELETE pc
        FROM PanelComplaints pc
        INNER JOIN Complaints c ON c.Id = pc.ComplaintId
        WHERE c.UserCNIC = @CNIC;

        UPDATE Panels
        SET ComplaintId = NULL
        WHERE ComplaintId IN (SELECT Id FROM Complaints WHERE UserCNIC = @CNIC);

        DELETE FROM Complaints WHERE UserCNIC = @CNIC;

        DELETE FROM Users WHERE Id = @Id;
      `);

    await transaction.commit();
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    if (transaction) {
      try { await transaction.rollback(); } catch (_) {}
    }
    console.error('Delete user error:', err);
    res.status(500).json({ error: err.message || 'Failed to delete user' });
  } finally {
    if (pool) await pool.close();
  }
});

// 7. CREATE REQUEST
app.post('/api/request', async (req, res) => {
  console.log("POST /api/request called...");
  const { firstName, lastName, cnic, requestType, message, location } = req.body;
  let pool;
  try {
    pool = await sql.connect(dbConfig);
    const result = await pool.request()
      .input('FirstName', sql.NVarChar, firstName)
      .input('LastName', sql.NVarChar, lastName)
      .input('CNIC', sql.NVarChar, cnic)
      .input('RequestType', sql.NVarChar, requestType)
      .input('Message', sql.NVarChar(sql.MAX), message)
      .input('Location', sql.NVarChar(sql.MAX), location)
      .query("INSERT INTO Requests (FirstName, LastName, CNIC, RequestType, Message, Location) VALUES (@FirstName, @LastName, @CNIC, @RequestType, @Message, @Location); SELECT SCOPE_IDENTITY() as id");
    const id = result.recordset[0].id;
    res.status(201).json({ message: "Request Sent", id: id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (pool) await pool.close();
  }
});

// --- NEW NOTIFICATION ROUTES ---

// 8. SEND NOTIFICATION (From Admin)
app.post('/api/notification', async (req, res) => {
  console.log("POST /api/notification called...");
  const { recipientCnic, message, nhcCode } = req.body;
  let pool;
  try {
    pool = await sql.connect(dbConfig);
    const result = await pool.request()
      .input('RecipientCNIC', sql.NVarChar, recipientCnic)
      .input('Message', sql.NVarChar(sql.MAX), message)
      .input('NHC_Code', sql.NVarChar, nhcCode || null)
      .query("INSERT INTO Notifications (RecipientCNIC, Message, NHC_Code) VALUES (@RecipientCNIC, @Message, @NHC_Code); SELECT SCOPE_IDENTITY() as id");
    
    const id = result.recordset[0].id;
    console.log("✓ Notification Sent with ID:", id);
    res.status(201).json({ message: "Notification Sent", id: id });
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ error: err.message });
  } finally {
    if (pool) await pool.close();
  }
});

// 9. SCHEDULE COMMITTEE MEETING / SEND NOTIFICATIONS
app.post('/api/panels/:id/schedule-meeting', async (req, res) => {
  const panelId = parseInt(req.params.id, 10);
  const { meetingDate, meetingTime, reason, scheduledByCnic } = req.body;

  console.log('🔵 Schedule meeting request:', { panelId, meetingDate, meetingTime, reason, scheduledByCnic });

  if (!panelId || !meetingDate || !meetingTime || !reason || !scheduledByCnic) {
    console.error('❌ Missing required fields:', { panelId, meetingDate, meetingTime, reason, scheduledByCnic });
    return res.status(400).json({ error: 'panel id, meeting date, time, reason, and scheduledByCnic are required' });
  }

  let pool;
  try {
    pool = await sql.connect(dbConfig);

    const panelRes = await pool.request()
      .input('PanelId', sql.Int, panelId)
      .query('SELECT Id, PanelName FROM Panels WHERE Id = @PanelId');

    console.log('✓ Panel query result:', panelRes.recordset);

    if (panelRes.recordset.length === 0) {
      console.error('❌ Committee not found with ID:', panelId);
      return res.status(404).json({ error: 'Committee not found' });
    }

    const panelName = panelRes.recordset[0].PanelName || `Committee ${panelId}`;

    const membersRes = await pool.request()
      .input('PanelId', sql.Int, panelId)
      .query('SELECT CNIC FROM PanelMembers WHERE PanelId = @PanelId');

    console.log('✓ Members query result:', membersRes.recordset);

    if (membersRes.recordset.length === 0) {
      console.error('❌ No committee members found for panel:', panelId);
      return res.status(404).json({ error: 'Committee members not found' });
    }

    const message = `Meeting called for ${panelName} on ${meetingDate} at ${meetingTime}. Reason: ${reason}`;

    console.log('✓ Notification message:', message);
    console.log('✓ Sending notifications to', membersRes.recordset.length, 'members');

    let notifySent = 0;
    for (const member of membersRes.recordset) {
      try {
        await pool.request()
          .input('RecipientCNIC', sql.NVarChar, member.CNIC)
          .input('Message', sql.NVarChar(sql.MAX), message)
          .input('PanelId', sql.Int, panelId)
          .query('INSERT INTO Notifications (RecipientCNIC, Message, PanelId) VALUES (@RecipientCNIC, @Message, @PanelId)');
        notifySent++;
        console.log('✓ Notification sent to', member.CNIC);
      } catch (notifyErr) {
        console.error('❌ Notification insert failed for', member.CNIC, notifyErr);
      }
    }

    console.log('✓ Successfully sent', notifySent, 'notifications');
    res.status(200).json({ message: 'Meeting scheduled and notifications sent successfully.', notificationsSent: notifySent });
  } catch (err) {
    console.error('❌ Schedule committee meeting error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (pool) await pool.close();
  }
});

// 10. GET NOTIFICATIONS (For User Dashboard)
app.get('/api/notifications', async (req, res) => {
  const { cnic, nhcCode } = req.query;
  let pool;
  try {
    pool = await sql.connect(dbConfig);
    let result = await pool.request()
      .input('CNIC', sql.NVarChar, cnic)
      .input('NHC_Code', sql.NVarChar, nhcCode || null)
      .query("SELECT * FROM Notifications WHERE RecipientCNIC = @CNIC AND (NHC_Code = @NHC_Code OR NHC_Code IS NULL) ORDER BY CreatedDate DESC");
    
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (pool) await pool.close();
  }
});

// 10. GET USER ROLE IN SPECIFIC NHC
app.get('/api/user-role', async (req, res) => {
  const { cnic, nhcCode } = req.query;

  if (!cnic || !nhcCode) {
    return res.status(400).json({ error: 'Missing cnic or nhcCode' });
  }

  let pool;
  try {
    pool = await sql.connect(dbConfig);
    
    // Query UserNHCs table for this user's role in this specific NHC
    const result = await pool.request()
      .input('CNIC', sql.NVarChar, cnic)
      .input('NHC_Code', sql.NVarChar, nhcCode)
      .query(`
        SELECT Role 
        FROM UserNHCs 
        WHERE UserCNIC = @CNIC 
        AND NHC_Code = @NHC_Code
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'User not found in this NHC' });
    }

    const role = result.recordset[0].Role || 'Member';
    res.json({ role });
  } catch (err) {
    console.error('Error fetching user role:', err);
    res.status(500).json({ error: 'Failed to fetch user role' });
  } finally {
    if (pool) await pool.close();
  }
});

// GET single user by CNIC
app.get('/api/user', async (req, res) => {
  const { cnic } = req.query;
  let pool;
  try {
    pool = await sql.connect(dbConfig);
    const result = await pool.request()
      .input('CNIC', sql.NVarChar, cnic)
      .query("SELECT * FROM Users WHERE CNIC = @CNIC");
    if (result.recordset.length > 0) {
      const user = result.recordset[0];
      user.ProfileImage = ensureFullProfileImageUrl(user.ProfileImage);
      // fetch nhcCodes mapping
      try {
        const cRes = await pool.request()
          .input('CNIC', sql.NVarChar, user.CNIC)
          .query('SELECT NHC_Code FROM UserNHCs WHERE UserCNIC = @CNIC');
        const codes = cRes.recordset.map(r => r.NHC_Code);
        user.nhcCodes = codes;
        user.nhcCode = codes.length > 0 ? codes[0] : null;
      } catch (e) {
        console.error('Error fetching codes for user', user.CNIC, e);
      }
      res.json(user);
    }
    else res.status(404).json({ error: 'User not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (pool) await pool.close();
  }
});

// GET all requests (for admin)
app.get('/api/requests', async (req, res) => {
  let pool;
  try {
    pool = await sql.connect(dbConfig);
    const result = await pool.request().query("SELECT * FROM Requests ORDER BY CreatedDate DESC");
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (pool) await pool.close();
  }
});

app.get('/api/committee-settings', async (req, res) => {
  let pool;
  try {
    pool = await sql.connect(dbConfig);
    const result = await pool.request().query(`
      SELECT TOP 1 SettingValue
      FROM CommitteeSettings
      WHERE SettingKey = 'CommitteeMemberCount'
    `);
    const committeeMemberCount = result.recordset.length > 0 ? Number(result.recordset[0].SettingValue) || 3 : 3;
    res.json({ committeeMemberCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (pool) await pool.close();
  }
});

// POST: Submit Complaint
app.post('/api/complaint', complaintUpload.fields([
  { name: 'photos', maxCount: 5 },
  { name: 'photo', maxCount: 1 } // backward compatibility
]), async (req, res) => {
  let pool;
  try {
    const {
      userCnic,
      userName,
      nhcCode,
      category,
      description,
      hasBudget,
      complaintType,
      againstMemberCnic,
      againstMemberName
    } = req.body;

    const normalizedComplaintType = String(complaintType || 'normal').toLowerCase() === 'against' ? 'against' : 'normal';

    // Validate required fields
    if (!userCnic || !category || !description) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (normalizedComplaintType === 'against' && !againstMemberCnic) {
      return res.status(400).json({ error: 'Please select the member this complaint is against' });
    }

    // Support multiple photos; keep PhotoPath for backward compatibility.
    const uploadedPhotos = [
      ...((req.files && req.files.photos) || []),
      ...((req.files && req.files.photo) || [])
    ];
    const photoPaths = uploadedPhotos.map((f) => `/complaint-photos/${f.filename}`);
    const photoPath = photoPaths.length > 0 ? photoPaths[0] : null;
    const photoPathsJson = photoPaths.length > 0 ? JSON.stringify(photoPaths) : null;

    pool = await sql.connect(dbConfig);

    // Resolve and normalize NHC code. If client did not send it, infer from user mapping.
    let effectiveNhcCode = String(nhcCode || '').trim();
    if (!effectiveNhcCode) {
      const mapped = await pool.request()
        .input('UserCNIC', sql.NVarChar, userCnic)
        .query('SELECT TOP 1 NHC_Code FROM UserNHCs WHERE UserCNIC = @UserCNIC ORDER BY Id DESC');
      if (mapped.recordset.length > 0) {
        effectiveNhcCode = String(mapped.recordset[0].NHC_Code || '').trim();
      }
    }

    if (!effectiveNhcCode) {
      return res.status(400).json({ error: 'NHC not found for user. Please re-login and try again.' });
    }
    
    // Check if NHC has a panel assigned
    const nhcIdRes = await pool.request()
      .input('NHC_Code', sql.NVarChar, effectiveNhcCode)
      .query('SELECT Id FROM NHC_Zones WHERE Name = @NHC_Code');
    
    if (nhcIdRes.recordset.length === 0) {
      return res.status(400).json({ error: 'NHC not found' });
    }
    
    const nhcId = nhcIdRes.recordset[0].Id;
    
    // Verify that NHC has at least one panel
    const panelRes = await pool.request()
      .input('NHC_Id', sql.Int, nhcId)
      .query('SELECT TOP 1 Id FROM Panels WHERE NHC_Id = @NHC_Id');
    
    if (!panelRes.recordset || panelRes.recordset.length === 0) {
      return res.status(403).json({ error: 'No panel has been assigned to your NHC yet. Complaints cannot be filed until a panel is set up. Please contact your NHC administrator.' });
    }
    
    // Insert complaint into database
    const result = await pool.request()
      .input('UserCNIC', sql.NVarChar, userCnic)
      .input('UserName', sql.NVarChar, userName || '')
      .input('NHC_Code', sql.NVarChar, effectiveNhcCode)
      .input('Category', sql.NVarChar, category)
      .input('Description', sql.NVarChar(sql.MAX), description)
      .input('HasBudget', sql.Bit, hasBudget === '1' ? 1 : 0)
      .input('PhotoPath', sql.NVarChar(sql.MAX), photoPath)
      .input('PhotoPaths', sql.NVarChar(sql.MAX), photoPathsJson)
      .input('ComplaintType', sql.NVarChar, normalizedComplaintType)
      .input('AgainstMemberCNIC', sql.NVarChar, normalizedComplaintType === 'against' ? againstMemberCnic : null)
      .input('AgainstMemberName', sql.NVarChar, normalizedComplaintType === 'against' ? (againstMemberName || '') : null)
      .query(`
        INSERT INTO Complaints (
          UserCNIC, UserName, NHC_Code, Category, Description, HasBudget,
          PhotoPath, PhotoPaths, ComplaintType, AgainstMemberCNIC, AgainstMemberName, Status, UpdatedDate
        )
        VALUES (
          @UserCNIC, @UserName, @NHC_Code, @Category, @Description, @HasBudget,
          @PhotoPath, @PhotoPaths, @ComplaintType, @AgainstMemberCNIC, @AgainstMemberName, 'Pending', GETDATE()
        );
        SELECT SCOPE_IDENTITY() as id;
      `);

    const complaintId = result.recordset[0].id;

    await logComplaintActivity(pool, {
      complaintId,
      actorCnic: userCnic,
      actorRole: 'User',
      actionType: 'complaint-created',
      remarksSnapshot: description,
      decisionSnapshot: null,
      minutesPathSnapshot: null,
      resolutionPhotosSnapshot: photoPathsJson,
      statusSnapshot: 'Pending',
    });

    // Notify presidents of the same NHC so they can see/respond quickly.
    try {
      const presidentRes = await pool.request()
        .input('NHC_Code', sql.NVarChar, effectiveNhcCode)
        .query(`
          SELECT DISTINCT u.CNIC
          FROM Users u
          INNER JOIN UserNHCs m ON m.UserCNIC = u.CNIC
          WHERE LOWER(LTRIM(RTRIM(m.NHC_Code))) = LOWER(LTRIM(RTRIM(@NHC_Code)))
            AND LOWER(LTRIM(RTRIM(u.Role))) = 'president'
        `);

      for (const p of presidentRes.recordset) {
        try {
          await pool.request()
            .input('RecipientCNIC', sql.NVarChar, p.CNIC)
            .input('Message', sql.NVarChar(sql.MAX), `New complaint filed in ${effectiveNhcCode}: ${category}`)
            .query('INSERT INTO Notifications (RecipientCNIC, Message) VALUES (@RecipientCNIC, @Message)');
        } catch (notifyErr) {
          console.error('Failed to notify president for complaint:', notifyErr);
        }
      }
    } catch (presErr) {
      console.error('Failed to lookup presidents for complaint notification:', presErr);
    }

    res.status(201).json({ 
      message: 'Complaint submitted successfully', 
      complaintId: complaintId,
      photoPath: photoPath,
      photoPaths: photoPaths
    });
  } catch (err) {
    console.error('Error submitting complaint:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (pool) await pool.close();
  }
});

// GET: All Complaints (for admin)
app.get('/api/complaints', async (req, res) => {
  let pool;
  try {
    pool = await sql.connect(dbConfig);
    const result = await pool.request().query('SELECT * FROM Complaints ORDER BY CreatedDate DESC');
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (pool) await pool.close();
  }
});

// GET: User's Complaints
app.get('/api/complaints/:userCnic', async (req, res) => {
  let pool;
  try {
    const { userCnic } = req.params;
    const nhcCode = req.query.nhcCode ? String(req.query.nhcCode).trim() : null;
    pool = await sql.connect(dbConfig);
    
    let query = 'SELECT * FROM Complaints WHERE UserCNIC = @UserCNIC';
    const reqSql = pool.request().input('UserCNIC', sql.NVarChar, userCnic);
    
    // Optional NHC filtering for multi-NHC scenarios
    if (nhcCode) {
      query += ' AND NHC_Code = @NHC_Code';
      reqSql.input('NHC_Code', sql.NVarChar, nhcCode);
    }
    
    query += ' ORDER BY CreatedDate DESC';
    const result = await reqSql.query(query);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (pool) await pool.close();
  }
});

// GET: Complaints by NHC Code (for president/chairman dashboard)
app.get('/api/complaints-by-nhc/:nhcCode', async (req, res) => {
  let pool;
  try {
    const nhcCode = String(req.params.nhcCode || '').trim();
    if (!nhcCode || nhcCode.toLowerCase() === 'undefined' || nhcCode.toLowerCase() === 'null') {
      return res.status(400).json({ error: 'Valid nhcCode is required' });
    }
    pool = await sql.connect(dbConfig);
    const result = await pool.request()
      .input('NHC_Code', sql.NVarChar, nhcCode)
      .query(`
        SELECT *
        FROM Complaints
        WHERE LOWER(LTRIM(RTRIM(NHC_Code))) = LOWER(LTRIM(RTRIM(@NHC_Code)))
        ORDER BY CreatedDate DESC
      `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (pool) await pool.close();
  }
});

app.get('/api/complaints/:id/history', async (req, res) => {
  let pool;
  try {
    const complaintId = parseInt(req.params.id, 10);
    const actorCnic = String(req.query.actorCnic || '').trim();

    if (!complaintId) {
      return res.status(400).json({ error: 'Valid complaint id is required' });
    }
    if (!actorCnic) {
      return res.status(400).json({ error: 'actorCnic is required' });
    }

    pool = await sql.connect(dbConfig);

    const actorRes = await pool.request()
      .input('CNIC', sql.NVarChar, actorCnic)
      .query('SELECT CNIC, Role FROM Users WHERE CNIC = @CNIC');

    if (actorRes.recordset.length === 0) {
      return res.status(404).json({ error: 'Actor user not found' });
    }

    const actorRole = String(actorRes.recordset[0].Role || '').toLowerCase();

    const complaintRes = await pool.request()
      .input('Id', sql.Int, complaintId)
      .query('SELECT Id, NHC_Code FROM Complaints WHERE Id = @Id');

    if (complaintRes.recordset.length === 0) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    const complaintNhcCode = String(complaintRes.recordset[0].NHC_Code || '').trim();

    let allowed = actorRole === 'admin';

    if (!allowed && actorRole === 'president') {
      const nhcMapRes = await pool.request()
        .input('UserCNIC', sql.NVarChar, actorCnic)
        .input('NHC_Code', sql.NVarChar, complaintNhcCode)
        .query(`
          SELECT 1
          FROM UserNHCs
          WHERE UserCNIC = @UserCNIC
            AND LOWER(LTRIM(RTRIM(NHC_Code))) = LOWER(LTRIM(RTRIM(@NHC_Code)))
        `);
      allowed = nhcMapRes.recordset.length > 0;
    }

    if (!allowed) {
      const panelMemberRes = await pool.request()
        .input('ComplaintId', sql.Int, complaintId)
        .input('MemberCNIC', sql.NVarChar, actorCnic)
        .query(`
          SELECT 1
          FROM PanelMembers pm
          INNER JOIN Panels p ON p.Id = pm.PanelId
          LEFT JOIN PanelComplaints pc ON pc.PanelId = p.Id
          WHERE pm.CNIC = @MemberCNIC
            AND LOWER(ISNULL(pm.InviteStatus, 'accepted')) = 'accepted'
            AND (p.ComplaintId = @ComplaintId OR pc.ComplaintId = @ComplaintId)
        `);
      allowed = panelMemberRes.recordset.length > 0;
    }

    if (!allowed) {
      return res.status(403).json({ error: 'You are not allowed to view this complaint history' });
    }

    const historyRes = await pool.request()
      .input('ComplaintId', sql.Int, complaintId)
      .query(`
        SELECT Id, ComplaintId, ActorCNIC, ActorRole, ActionType,
               RemarksSnapshot, DecisionSnapshot, MinutesPathSnapshot,
               ResolutionPhotosSnapshot, StatusSnapshot, CreatedDate
        FROM ComplaintActivityLog
        WHERE ComplaintId = @ComplaintId
        ORDER BY CreatedDate DESC, Id DESC
      `);

    res.json(historyRes.recordset || []);
  } catch (err) {
    console.error('Error fetching complaint history:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (pool) await pool.close();
  }
});

// PUT: Update complaint resolution details (committee evidence + remarks)
app.put('/api/complaints/:id/resolution', complaintUpload.array('resolutionPhotos', 5), async (req, res) => {
  let pool;
  try {
    const complaintId = parseInt(req.params.id, 10);
    const actorCnic = String(req.body?.actorCnic || '').trim();
    const remarks = String(req.body?.remarks || '').trim();
    const status = String(req.body?.status || 'Resolved').trim() || 'Resolved';

    if (!complaintId) {
      return res.status(400).json({ error: 'Valid complaint id is required' });
    }

    pool = await sql.connect(dbConfig);

    const currentRes = await pool.request()
      .input('Id', sql.Int, complaintId)
      .query('SELECT ResolutionPhotoPaths, UserCNIC, Category FROM Complaints WHERE Id = @Id');

    if (currentRes.recordset.length === 0) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    let existingPaths = [];
    try {
      existingPaths = currentRes.recordset[0].ResolutionPhotoPaths
        ? JSON.parse(currentRes.recordset[0].ResolutionPhotoPaths)
        : [];
    } catch (_) {
      existingPaths = [];
    }

    const newPaths = (req.files || []).map((f) => `/complaint-photos/${f.filename}`);
    const mergedPaths = [...existingPaths, ...newPaths].slice(0, 10);

    await pool.request()
      .input('Id', sql.Int, complaintId)
      .input('CommitteeRemarks', sql.NVarChar(sql.MAX), remarks || null)
      .input('ResolutionPhotoPaths', sql.NVarChar(sql.MAX), mergedPaths.length > 0 ? JSON.stringify(mergedPaths) : null)
      .input('Status', sql.NVarChar, status)
      .query(`
        UPDATE Complaints
        SET CommitteeRemarks = @CommitteeRemarks,
            ResolutionPhotoPaths = @ResolutionPhotoPaths,
            Status = @Status,
            UpdatedDate = GETDATE()
        WHERE Id = @Id
      `);

    let actorRole = null;
    if (actorCnic) {
      try {
        const actorRes = await pool.request()
          .input('CNIC', sql.NVarChar, actorCnic)
          .query('SELECT Role FROM Users WHERE CNIC = @CNIC');
        actorRole = actorRes.recordset.length > 0 ? String(actorRes.recordset[0].Role || '') : null;
      } catch (_) {
        actorRole = null;
      }
    }

    await logComplaintActivity(pool, {
      complaintId,
      actorCnic,
      actorRole,
      actionType: 'resolution-update',
      remarksSnapshot: remarks || null,
      decisionSnapshot: null,
      minutesPathSnapshot: null,
      resolutionPhotosSnapshot: mergedPaths.length > 0 ? JSON.stringify(mergedPaths) : null,
      statusSnapshot: status,
    });

    try {
      const owner = currentRes.recordset[0];
      await pool.request()
        .input('RecipientCNIC', sql.NVarChar, owner.UserCNIC)
        .input('Message', sql.NVarChar(sql.MAX), `Committee updated your complaint (${owner.Category || 'Complaint'}) with resolution details.`)
        .query('INSERT INTO Notifications (RecipientCNIC, Message) VALUES (@RecipientCNIC, @Message)');
    } catch (notifyErr) {
      console.error('Failed to notify complaint owner after resolution update:', notifyErr);
    }

    res.json({
      success: true,
      message: 'Complaint resolution details updated successfully',
      resolutionPhotoPaths: mergedPaths
    });
  } catch (err) {
    console.error('Error updating complaint resolution details:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (pool) await pool.close();
  }
});

// PUT: Save committee meeting details (decision + minutes PDF + remarks)
app.put('/api/complaints/:id/committee-meeting', meetingMinutesUpload.single('minutesPdf'), async (req, res) => {
  let pool;
  try {
    const complaintId = parseInt(req.params.id, 10);
    const actorCnic = String(req.body?.actorCnic || '').trim();
    const remarks = String(req.body?.remarks || '').trim();
    const status = String(req.body?.status || 'In-Progress').trim() || 'In-Progress';
    const decision = String(req.body?.decision || '').trim();
    const budgetAmount = String(req.body?.budgetAmount || '').trim();
    const budgetReason = String(req.body?.budgetReason || '').trim();
    const moreWorkNeeded = String(req.body?.moreWorkNeeded || '').trim();
    const resolutionDescription = String(req.body?.resolutionDescription || '').trim();

    if (!complaintId) {
      return res.status(400).json({ error: 'Valid complaint id is required' });
    }

    if (!actorCnic) {
      return res.status(400).json({ error: 'actorCnic is required' });
    }

    if (decision === 'budget' && (!budgetAmount || !budgetReason)) {
      return res.status(400).json({ error: 'Budget amount and reason are required for budget decision' });
    }

    if (decision === 'inprogress' && !moreWorkNeeded) {
      return res.status(400).json({ error: 'More work details are required for in-progress decision' });
    }

    pool = await sql.connect(dbConfig);

    const actorRes = await pool.request()
      .input('CNIC', sql.NVarChar, actorCnic)
      .query('SELECT Role FROM Users WHERE CNIC = @CNIC');

    if (actorRes.recordset.length === 0) {
      return res.status(404).json({ error: 'Actor user not found' });
    }

    const actorRole = String(actorRes.recordset[0].Role || '').toLowerCase();

    const currentRes = await pool.request()
      .input('Id', sql.Int, complaintId)
      .query('SELECT Id, UserCNIC, Category, MeetingMinutesPath FROM Complaints WHERE Id = @Id');

    if (currentRes.recordset.length === 0) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    const existingMinutesPath = currentRes.recordset[0].MeetingMinutesPath || null;
    const minutesPath = req.file ? `/meeting-minutes/${req.file.filename}` : existingMinutesPath;
    const detailsParts = [];
    if (remarks) detailsParts.push(remarks);
    if (decision === 'budget') {
      detailsParts.push(`Budget Needed: ${budgetAmount}`);
      detailsParts.push(`Budget Reason: ${budgetReason}`);
    }
    if (decision === 'inprogress' && moreWorkNeeded) {
      detailsParts.push(`More Work Needed: ${moreWorkNeeded}`);
    }
    if (decision === 'solved' && resolutionDescription) {
      detailsParts.push(`Resolution Details: ${resolutionDescription}`);
    }
    const mergedRemarks = detailsParts.join('\n\n');

    const cleanedStatus = String(status || '').trim();
    const normalizedStatus = actorRole === 'president' && cleanedStatus.toLowerCase() === 'resolved'
      ? 'Resolved'
      : decision === 'budget'
        ? 'Pending President Review'
        : cleanedStatus.toLowerCase() === 'pending president review'
          ? 'Pending President Review'
          : 'In-Progress';

    const presidentApprovalStatus = actorRole !== 'president' && normalizedStatus === 'Pending President Review'
      ? 'pending'
      : null;

    const hasBudgetFlag = decision === 'budget' ? 1 : 0;

    // In this route uploads are stored by meetingMinutesUpload, so keep the
    // stored path aligned with the actual folder to avoid broken URLs.
    const resolutionPhotoPath = decision === 'solved' && req.file ? `/meeting-minutes/${req.file.filename}` : null;

    await pool.request()
      .input('Id', sql.Int, complaintId)
      .input('CommitteeRemarks', sql.NVarChar(sql.MAX), mergedRemarks || null)
      .input('MeetingDecision', sql.NVarChar(100), decision || null)
      .input('MeetingMinutesPath', sql.NVarChar(sql.MAX), minutesPath)
      .input('Status', sql.NVarChar(50), normalizedStatus)
      .input('PresidentApprovalStatus', sql.NVarChar(50), presidentApprovalStatus)
      .input('HasBudget', sql.Bit, hasBudgetFlag)
      .query(`
        UPDATE Complaints
        SET CommitteeRemarks = @CommitteeRemarks,
            MeetingDecision = @MeetingDecision,
            MeetingMinutesPath = @MeetingMinutesPath,
            MeetingDate = GETDATE(),
            Status = @Status,
            PresidentApprovalStatus = COALESCE(@PresidentApprovalStatus, PresidentApprovalStatus),
            HasBudget = @HasBudget,
            UpdatedDate = GETDATE()
        WHERE Id = @Id
      `);

    // If resolution photo was uploaded, also update ResolutionPhotoPaths
    if (resolutionPhotoPath) {
      await pool.request()
        .input('Id', sql.Int, complaintId)
        .input('ResolutionPhotoPaths', sql.NVarChar(sql.MAX), resolutionPhotoPath)
        .query(`
          UPDATE Complaints
          SET ResolutionPhotoPaths = @ResolutionPhotoPaths
          WHERE Id = @Id
        `);
    }

    await logComplaintActivity(pool, {
      complaintId,
      actorCnic,
      actorRole,
      actionType: actorRole === 'president' && normalizedStatus === 'Resolved' ? 'president-finalized' : 'committee-meeting-update',
      remarksSnapshot: mergedRemarks || null,
      decisionSnapshot: decision || null,
      minutesPathSnapshot: minutesPath || null,
      resolutionPhotosSnapshot: null,
      statusSnapshot: normalizedStatus,
    });

    // When president finalizes as resolved, detach this complaint from active committee assignments.
    if (actorRole === 'president' && normalizedStatus === 'Resolved') {
      await pool.request()
        .input('ComplaintId', sql.Int, complaintId)
        .query(`
          DELETE FROM PanelComplaints
          WHERE ComplaintId = @ComplaintId
        `);

      await pool.request()
        .input('ComplaintId', sql.Int, complaintId)
        .query(`
          UPDATE Panels
          SET ComplaintId = NULL
          WHERE ComplaintId = @ComplaintId
        `);
    }

    try {
      const owner = currentRes.recordset[0];
      const normalizedDecision = String(decision || '').toLowerCase();

      if (normalizedStatus === 'Resolved') {
        const recipients = new Set();
        if (owner.UserCNIC) recipients.add(String(owner.UserCNIC));

        const panelMembersRes = await pool.request()
          .input('ComplaintId', sql.Int, complaintId)
          .query(`
            SELECT DISTINCT pm.CNIC AS MemberCNIC
            FROM PanelMembers pm
            INNER JOIN Panels p ON p.Id = pm.PanelId
            LEFT JOIN PanelComplaints pc ON pc.PanelId = p.Id
            WHERE p.ComplaintId = @ComplaintId OR pc.ComplaintId = @ComplaintId
          `);

        panelMembersRes.recordset.forEach((row) => {
          if (row.MemberCNIC) recipients.add(String(row.MemberCNIC));
        });

          // Fetch owner name for clearer notifications
          let ownerName = '';
          try {
            const userNameRes = await pool.request()
              .input('CNIC', sql.NVarChar, owner.UserCNIC)
              .query('SELECT FirstName, LastName FROM Users WHERE CNIC = @CNIC');
            if (userNameRes.recordset.length > 0) {
              const u = userNameRes.recordset[0];
              ownerName = `${(u.FirstName || '').trim()} ${(u.LastName || '').trim()}`.trim();
            }
          } catch (_) {
            ownerName = '';
          }

          const ownerLabel = ownerName || 'Complainant';
          const solvedMessage = `${ownerLabel}, your complaint (${owner.Category || 'Complaint'}) (ID: ${complaintId}) has been marked as resolved by the president.`;
          for (const recipientCnic of recipients) {
            await pool.request()
              .input('RecipientCNIC', sql.NVarChar, recipientCnic)
              .input('Message', sql.NVarChar(sql.MAX), solvedMessage)
              .query('INSERT INTO Notifications (RecipientCNIC, Message) VALUES (@RecipientCNIC, @Message)');
          }
      } else if (normalizedStatus === 'Pending President Review') {
        // include owner name when notifying complainant
        await pool.request()
          .input('RecipientCNIC', sql.NVarChar, owner.UserCNIC)
          .input('Message', sql.NVarChar(sql.MAX), `${ownerLabel}, the committee recommended a resolution for your complaint (${owner.Category || 'Complaint'}). It is now pending president review.`)
          .query('INSERT INTO Notifications (RecipientCNIC, Message) VALUES (@RecipientCNIC, @Message)');
      } else {
        await pool.request()
          .input('RecipientCNIC', sql.NVarChar, owner.UserCNIC)
          .input('Message', sql.NVarChar(sql.MAX), `${ownerLabel}, your complaint (${owner.Category || 'Complaint'}) was updated in a committee meeting and is waiting for president final review.`)
          .query('INSERT INTO Notifications (RecipientCNIC, Message) VALUES (@RecipientCNIC, @Message)');
      }
    } catch (notifyErr) {
      console.error('Failed to send notifications after committee meeting update:', notifyErr);
    }

    res.json({
      success: true,
      message: 'Committee meeting details saved successfully',
      meetingMinutesPath: minutesPath,
      meetingDecision: decision || null
    });
  } catch (err) {
    console.error('Error saving committee meeting details:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (pool) await pool.close();
  }
});

// ==================== PRESIDENT APPROVAL ROUTES ====================

// PUT: President Approval - Approve, Reject, or Request Changes
app.put('/api/complaints/:id/president-approval', async (req, res) => {
  let pool;
  try {
    const complaintId = parseInt(req.params.id, 10);
    const { action, presidentCnic, presidentComments } = req.body;

    if (!complaintId) {
      return res.status(400).json({ error: 'Valid complaint id is required' });
    }

    if (!action || !['approve', 'reject', 'request-changes'].includes(action)) {
      return res.status(400).json({ error: 'Valid action required: approve, reject, or request-changes' });
    }

    if (!presidentCnic) {
      return res.status(400).json({ error: 'President CNIC is required' });
    }

    pool = await sql.connect(dbConfig);

    // Verify president exists
    const presidentRes = await pool.request()
      .input('CNIC', sql.NVarChar, presidentCnic)
      .query('SELECT Role FROM Users WHERE CNIC = @CNIC');

    if (presidentRes.recordset.length === 0) {
      return res.status(404).json({ error: 'President user not found' });
    }

    // Verify complaint exists
    const complaintRes = await pool.request()
      .input('Id', sql.Int, complaintId)
      .query('SELECT Id, UserCNIC, Category, Status, HasBudget, BudgetAllocationStatus, NHC_Code FROM Complaints WHERE Id = @Id');

    if (complaintRes.recordset.length === 0) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    const complaint = complaintRes.recordset[0];

    // Fetch complainant's name for clearer notifications
    let ownerName = '';
    try {
      const userNameRes = await pool.request()
        .input('CNIC', sql.NVarChar, complaint.UserCNIC)
        .query('SELECT FirstName, LastName FROM Users WHERE CNIC = @CNIC');
      if (userNameRes.recordset.length > 0) {
        const u = userNameRes.recordset[0];
        ownerName = `${(u.FirstName || '').trim()} ${(u.LastName || '').trim()}`.trim();
      }
    } catch (_) {
      ownerName = '';
    }
    const ownerLabel = ownerName || 'Complainant';

    // Verify president has authority for this NHC
    let isPresident = String(presidentRes.recordset[0].Role || '').toLowerCase() === 'president';
    if (!isPresident) {
      const presidentNHCRes = await pool.request()
        .input('CNIC', sql.NVarChar, presidentCnic)
        .input('NHC_Code', sql.NVarChar, complaint.NHC_Code)
        .query('SELECT Role FROM UserNHCs WHERE UserCNIC = @CNIC AND NHC_Code = @NHC_Code');

      isPresident = presidentNHCRes.recordset.length > 0 && String(presidentNHCRes.recordset[0].Role || '').toLowerCase() === 'president';
    }

    if (!isPresident) {
      return res.status(403).json({ error: 'User is not authorized as president for this NHC' });
    }

    // Verify complaint is pending president review
    if (complaint.Status !== 'Pending President Review') {
      return res.status(400).json({ error: 'Complaint is not pending president review' });
    }
    let newStatus = complaint.Status;
    let approvalStatus = 'pending';
    const isBudgetApproval = Boolean(complaint.HasBudget && String(complaint.BudgetAllocationStatus || '').toLowerCase() !== 'released');

    // Determine new status and approval status based on action
    if (action === 'approve') {
      approvalStatus = 'approved';
      if (!isBudgetApproval) {
        newStatus = 'Resolved';
      } else {
        newStatus = 'In-Progress';
      }
    } else if (action === 'reject') {
      approvalStatus = 'rejected';
      newStatus = 'In-Progress'; // Back to committee
    } else if (action === 'request-changes') {
      approvalStatus = 'revision-requested';
      newStatus = 'In-Progress'; // Back to committee
    }

    const approvedDate = action === 'approve' ? new Date() : null;

    // Update complaint with president approval info
    await pool.request()
      .input('Id', sql.Int, complaintId)
      .input('PresidentApprovalStatus', sql.NVarChar, approvalStatus)
      .input('PresidentApprovalComments', sql.NVarChar(sql.MAX), presidentComments || null)
      .input('PresidentApprovingCNIC', sql.NVarChar, presidentCnic)
      .input('ApprovedDate', sql.DateTime, approvedDate)
      .input('Status', sql.NVarChar, newStatus)
      .query(`
        UPDATE Complaints
        SET PresidentApprovalStatus = @PresidentApprovalStatus,
            PresidentApprovalComments = @PresidentApprovalComments,
            PresidentApprovingCNIC = @PresidentApprovingCNIC,
            ApprovedDate = @ApprovedDate,
            Status = @Status,
            UpdatedDate = GETDATE()
        WHERE Id = @Id
      `);

    // Log the approval action
    await logComplaintActivity(pool, {
      complaintId,
      actorCnic: presidentCnic,
      actorRole: 'president',
      actionType: isBudgetApproval ? 'president-approved-budget' : `president-${action.replace('-', '')}`,
      remarksSnapshot: null,
      decisionSnapshot: null,
      minutesPathSnapshot: null,
      resolutionPhotosSnapshot: null,
      statusSnapshot: newStatus,
    });

    // If approved and this is a final complaint resolution, complete the panel assignment
    if (action === 'approve' && !isBudgetApproval) {
      const panelRes = await pool.request()
        .input('ComplaintId', sql.Int, complaintId)
        .query(`
          SELECT p.Id FROM Panels p
          INNER JOIN PanelComplaints pc ON pc.PanelId = p.Id
          WHERE pc.ComplaintId = @ComplaintId AND p.Status = 'active'
        `);

      for (const panel of panelRes.recordset) {
        // Mark panel as completed
        await pool.request()
          .input('PanelId', sql.Int, panel.Id)
          .query(`
            UPDATE Panels
            SET Status = 'completed', CompletedDate = GETDATE()
            WHERE Id = @PanelId
          `);

        // Add to panel history
        await pool.request()
          .input('PanelId', sql.Int, panel.Id)
          .input('ComplaintId', sql.Int, complaintId)
          .input('CompletionStatus', sql.NVarChar, 'approved')
          .input('PresidentComments', sql.NVarChar(sql.MAX), presidentComments || null)
          .input('PresidentCNIC', sql.NVarChar, presidentCnic)
          .query(`
            INSERT INTO PanelComplaintHistory (
              PanelId, ComplaintId, CompletedDate, CompletionStatus,
              PresidentComments, PresidentCNIC, AssignedDate
            ) VALUES (
              @PanelId, @ComplaintId, GETDATE(), @CompletionStatus,
              @PresidentComments, @PresidentCNIC, GETDATE()
            )
          `);
      }
    }

    // Send notifications
    try {
      const messageMap = {
        'approve': isBudgetApproval
          ? `✅ ${ownerLabel}, your budget request for Complaint #${complaintId} was APPROVED by the president. The treasurer can now release the funds to the committee.`
          : `✅ ${ownerLabel}, your complaint (ID: ${complaintId}) has been APPROVED by the president and marked as Resolved.`,
        'reject': `❌ ${ownerLabel}, your complaint (ID: ${complaintId}) was REJECTED by the president. Feedback: ${presidentComments}`,
        'request-changes': `📝 ${ownerLabel}, the president requested changes for Complaint #${complaintId}. Feedback: ${presidentComments}`
      };

      // Notify committee
      const panelRes = await pool.request()
        .input('ComplaintId', sql.Int, complaintId)
        .query(`
          SELECT DISTINCT pm.CNIC
          FROM PanelMembers pm
          INNER JOIN Panels p ON p.Id = pm.PanelId
          INNER JOIN PanelComplaints pc ON pc.PanelId = p.Id
          WHERE pc.ComplaintId = @ComplaintId
        `);

      for (const member of panelRes.recordset) {
        await pool.request()
          .input('RecipientCNIC', sql.NVarChar, member.CNIC)
          .input('Message', sql.NVarChar(sql.MAX), messageMap[action])
          .query('INSERT INTO Notifications (RecipientCNIC, Message) VALUES (@RecipientCNIC, @Message)');
      }

      // Notify complainant
      if (action === 'approve') {
        await pool.request()
          .input('RecipientCNIC', sql.NVarChar, complaint.UserCNIC)
          .input('Message', sql.NVarChar(sql.MAX), isBudgetApproval
            ? `✅ ${ownerLabel}, your budget request for Complaint #${complaintId} was approved by the president. The treasurer can now release the funds.`
            : `✅ ${ownerLabel}, your complaint (ID: ${complaintId}) has been resolved following the president's approval.`)
          .query('INSERT INTO Notifications (RecipientCNIC, Message) VALUES (@RecipientCNIC, @Message)');
      }
    } catch (notifyErr) {
      console.error('Failed to send notifications after president approval:', notifyErr);
    }

    res.json({
      success: true,
      message: `Complaint ${action} completed successfully`,
      complaintId,
      approvalStatus,
      newStatus
    });

  } catch (err) {
    console.error('Error processing president approval:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (pool) await pool.close();
  }
});

// PUT: Allocate Budget (Treasurer allocates budget to approved requests)
app.put('/api/complaints/:id/allocate-budget', async (req, res) => {
  let pool;
  try {
    const complaintId = parseInt(req.params.id, 10);
    const { allocatedAmount, budgetCategory, treasurerCnic } = req.body;

    if (!complaintId) {
      return res.status(400).json({ error: 'Valid complaint id is required' });
    }

    if (!allocatedAmount || allocatedAmount <= 0) {
      return res.status(400).json({ error: 'Valid allocated amount is required' });
    }

    // budgetCategory is optional for allocation; do not reject when missing

    if (!treasurerCnic) {
      return res.status(400).json({ error: 'Treasurer CNIC is required' });
    }

    pool = await sql.connect(dbConfig);

    // Check if complaint exists and is approved by president
    const complaintRes = await pool.request()
      .input('Id', sql.Int, complaintId)
      .query('SELECT Id, PresidentApprovalStatus, HasBudget, NHC_Code FROM Complaints WHERE Id = @Id');

    if (complaintRes.recordset.length === 0) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    const complaint = complaintRes.recordset[0];
    if (!complaint.HasBudget) {
      return res.status(400).json({ error: 'This complaint does not have a budget request' });
    }

    if (complaint.PresidentApprovalStatus !== 'approved') {
      return res.status(400).json({ error: 'Budget can only be allocated for president-approved requests' });
    }

    // Verify treasurer exists and has treasurer role either globally or for this NHC
    const treasurerRes = await pool.request()
      .input('CNIC', sql.NVarChar, treasurerCnic)
      .query('SELECT Role FROM Users WHERE CNIC = @CNIC');

    if (treasurerRes.recordset.length === 0) {
      return res.status(404).json({ error: 'Treasurer user not found' });
    }

    let isTreasurer = String(treasurerRes.recordset[0].Role || '').toLowerCase() === 'treasurer';
    if (!isTreasurer) {
      const treasurerNHCRes = await pool.request()
        .input('CNIC', sql.NVarChar, treasurerCnic)
        .input('NHC_Code', sql.NVarChar, complaint.NHC_Code)
        .query('SELECT Role FROM UserNHCs WHERE UserCNIC = @CNIC AND NHC_Code = @NHC_Code');

      isTreasurer = treasurerNHCRes.recordset.length > 0 && String(treasurerNHCRes.recordset[0].Role || '').toLowerCase() === 'treasurer';
    }

    if (!isTreasurer) {
      return res.status(403).json({ error: 'User is not authorized as treasurer' });
    }

    // Allocate the budget
    const result = await pool.request()
      .input('Id', sql.Int, complaintId)
      .input('BudgetAllocatedAmount', sql.Decimal(18, 2), allocatedAmount)
      .input('BudgetAllocatedDate', sql.DateTime, new Date())
      .input('BudgetAllocatedByCNIC', sql.NVarChar, treasurerCnic)
      .input('BudgetAllocationStatus', sql.NVarChar, 'allocated')
      .input('BudgetCategory', sql.NVarChar, budgetCategory)
      .query(`
        UPDATE Complaints
        SET BudgetAllocatedAmount = @BudgetAllocatedAmount,
            BudgetAllocatedDate = @BudgetAllocatedDate,
            BudgetAllocatedByCNIC = @BudgetAllocatedByCNIC,
            BudgetAllocationStatus = @BudgetAllocationStatus,
            BudgetCategory = @BudgetCategory,
            UpdatedDate = GETDATE()
        WHERE Id = @Id
      `);

    // Log the allocation action
    await logComplaintActivity(pool, {
      complaintId,
      actorCnic: treasurerCnic,
      actorRole: 'treasurer',
      actionType: 'budget-allocated',
      remarksSnapshot: budgetCategory
        ? `Budget of ${allocatedAmount} allocated to category: ${budgetCategory}`
        : `Budget of ${allocatedAmount} allocated`,
      decisionSnapshot: null,
      minutesPathSnapshot: null,
      resolutionPhotosSnapshot: null,
      statusSnapshot: 'Budget Allocated',
    });

    res.json({ message: 'Budget allocated successfully', complaintId, allocation: result.recordset[0] });
  } catch (err) {
    console.error('Error allocating budget:', err);
    res.status(500).json({ error: 'Failed to allocate budget' });
  } finally {
    if (pool) await pool.close();
  }
});

// PUT: Reject Budget Request (Treasurer rejects approved budget requests)
app.put('/api/complaints/:id/reject-budget', async (req, res) => {
  let pool;
  try {
    const complaintId = parseInt(req.params.id, 10);
    const { rejectionReason, treasurerCnic } = req.body;

    if (!complaintId) {
      return res.status(400).json({ error: 'Valid complaint id is required' });
    }

    if (!rejectionReason || rejectionReason.trim() === '') {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    if (!treasurerCnic) {
      return res.status(400).json({ error: 'Treasurer CNIC is required' });
    }

    pool = await sql.connect(dbConfig);

    // Check if complaint exists and is approved by president
    const complaintRes = await pool.request()
      .input('Id', sql.Int, complaintId)
      .query('SELECT Id, PresidentApprovalStatus, HasBudget, NHC_Code, UserCNIC FROM Complaints WHERE Id = @Id');

    if (complaintRes.recordset.length === 0) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    const complaint = complaintRes.recordset[0];
    if (!complaint.HasBudget) {
      return res.status(400).json({ error: 'This complaint does not have a budget request' });
    }

    if (complaint.PresidentApprovalStatus !== 'approved') {
      return res.status(400).json({ error: 'Budget can only be rejected for president-approved requests' });
    }

    // Verify treasurer exists and has treasurer role either globally or for this NHC
    const treasurerRes = await pool.request()
      .input('CNIC', sql.NVarChar, treasurerCnic)
      .query('SELECT Role FROM Users WHERE CNIC = @CNIC');

    if (treasurerRes.recordset.length === 0) {
      return res.status(404).json({ error: 'Treasurer user not found' });
    }

    let isTreasurer = String(treasurerRes.recordset[0].Role || '').toLowerCase() === 'treasurer';
    if (!isTreasurer) {
      const treasurerNHCRes = await pool.request()
        .input('CNIC', sql.NVarChar, treasurerCnic)
        .input('NHC_Code', sql.NVarChar, complaint.NHC_Code)
        .query('SELECT Role FROM UserNHCs WHERE UserCNIC = @CNIC AND NHC_Code = @NHC_Code');

      isTreasurer = treasurerNHCRes.recordset.length > 0 && String(treasurerNHCRes.recordset[0].Role || '').toLowerCase() === 'treasurer';
    }

    if (!isTreasurer) {
      return res.status(403).json({ error: 'User is not authorized as treasurer' });
    }

    // Reject the budget request
    await pool.request()
      .input('Id', sql.Int, complaintId)
      .input('BudgetAllocationStatus', sql.NVarChar, 'rejected')
      .input('BudgetRejectionReason', sql.NVarChar(sql.MAX), rejectionReason)
      .input('BudgetRejectedDate', sql.DateTime, new Date())
      .input('BudgetRejectedByCNIC', sql.NVarChar, treasurerCnic)
      .query(`
        UPDATE Complaints
        SET BudgetAllocationStatus = @BudgetAllocationStatus,
            BudgetRejectionReason = @BudgetRejectionReason,
            BudgetRejectedDate = @BudgetRejectedDate,
            BudgetRejectedByCNIC = @BudgetRejectedByCNIC,
            Status = 'In-Progress',
            UpdatedDate = GETDATE()
        WHERE Id = @Id
      `);

    // Log the rejection action
    await logComplaintActivity(pool, {
      complaintId,
      actorCnic: treasurerCnic,
      actorRole: 'treasurer',
      actionType: 'budget-rejected',
      remarksSnapshot: `Budget request rejected: ${rejectionReason}`,
      decisionSnapshot: null,
      minutesPathSnapshot: null,
      resolutionPhotosSnapshot: null,
      statusSnapshot: 'Budget Rejected',
    });

    // Send notifications
    try {
      // Notify committee members
      const committeeRes = await pool.request()
        .input('ComplaintId', sql.Int, complaintId)
        .query(`
          SELECT DISTINCT u.CNIC
          FROM PanelComplaints pc
          INNER JOIN Panels p ON pc.PanelId = p.Id
          INNER JOIN PanelMembers pm ON p.Id = pm.PanelId
          INNER JOIN Users u ON pm.CNIC = u.CNIC
          WHERE pc.ComplaintId = @ComplaintId AND p.Status = 'active'
        `);

      const committeeMessage = `❌ Your budget request for Complaint #${complaintId} was rejected by the treasurer. Reason: ${rejectionReason}`;

      for (const member of committeeRes.recordset) {
        await pool.request()
          .input('RecipientCNIC', sql.NVarChar, member.CNIC)
          .input('Message', sql.NVarChar(sql.MAX), committeeMessage)
          .query(`INSERT INTO Notifications (RecipientCNIC, Message) VALUES (@RecipientCNIC, @Message)`);
      }

      // Notify complainant
      await pool.request()
        .input('RecipientCNIC', sql.NVarChar, complaint.UserCNIC)
        .input('Message', sql.NVarChar(sql.MAX), `❌ Your budget request for Complaint #${complaintId} was rejected by the treasurer. Reason: ${rejectionReason}`)
        .query(`INSERT INTO Notifications (RecipientCNIC, Message) VALUES (@RecipientCNIC, @Message)`);

    } catch (notifyErr) {
      console.error('Error sending budget rejection notifications:', notifyErr);
    }

    res.json({ message: 'Budget request rejected successfully', complaintId });
  } catch (err) {
    console.error('Error rejecting budget:', err);
    res.status(500).json({ error: 'Failed to reject budget request' });
  } finally {
    if (pool) await pool.close();
  }
});

// PUT: Release Budget Allocation (Treasurer releases allocated budget to committee)
app.put('/api/complaints/:id/release-budget', async (req, res) => {
  let pool;
  try {
    const complaintId = parseInt(req.params.id, 10);
    const { treasurerCnic, allocatedAmount, budgetCategory } = req.body;

    if (!complaintId) {
      return res.status(400).json({ error: 'Valid complaint id is required' });
    }

    if (!treasurerCnic) {
      return res.status(400).json({ error: 'Treasurer CNIC is required' });
    }

    pool = await sql.connect(dbConfig);

    const complaintRes = await pool.request()
      .input('Id', sql.Int, complaintId)
      .query('SELECT Id, BudgetAllocationStatus, BudgetAllocatedAmount, BudgetCategory, PresidentApprovalStatus, NHC_Code FROM Complaints WHERE Id = @Id');

    if (complaintRes.recordset.length === 0) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    const complaint = complaintRes.recordset[0];
    if (complaint.BudgetAllocationStatus === 'released') {
      return res.status(400).json({ error: 'Budget has already been released' });
    }

    // Verify treasurer exists and has treasurer role either globally or for this NHC
    const treasurerRes = await pool.request()
      .input('CNIC', sql.NVarChar, treasurerCnic)
      .query('SELECT Role FROM Users WHERE CNIC = @CNIC');

    if (treasurerRes.recordset.length === 0) {
      return res.status(404).json({ error: 'Treasurer user not found' });
    }

    let isTreasurer = String(treasurerRes.recordset[0].Role || '').toLowerCase() === 'treasurer';
    if (!isTreasurer) {
      const treasurerNHCRes = await pool.request()
        .input('CNIC', sql.NVarChar, treasurerCnic)
        .input('NHC_Code', sql.NVarChar, complaint.NHC_Code)
        .query('SELECT Role FROM UserNHCs WHERE UserCNIC = @CNIC AND NHC_Code = @NHC_Code');

      isTreasurer = treasurerNHCRes.recordset.length > 0 && String(treasurerNHCRes.recordset[0].Role || '').toLowerCase() === 'treasurer';
    }

    if (!isTreasurer) {
      return res.status(403).json({ error: 'User is not authorized as treasurer' });
    }

    if (complaint.BudgetAllocationStatus === 'pending') {
      if (complaint.PresidentApprovalStatus !== 'approved') {
        return res.status(400).json({ error: 'Budget can only be released for president-approved requests' });
      }
      if (!allocatedAmount || allocatedAmount <= 0) {
        return res.status(400).json({ error: 'Valid allocated amount is required to release budget' });
      }
      // budgetCategory is optional for release; we will accept releases without a category

      // Check available budget
      const availableRes = await pool.request()
        .input('NHC_Code', sql.NVarChar, complaint.NHC_Code)
        .query('SELECT TOP 1 AvailableBudget FROM NHCBudgets WHERE NHC_Code = @NHC_Code');
      const availableBudget = availableRes.recordset[0]?.AvailableBudget || 0;
      if (allocatedAmount > availableBudget) {
        return res.status(400).json({ error: `Allocated amount (PKR ${allocatedAmount.toFixed(2)}) exceeds available budget (PKR ${Number.parseFloat(availableBudget).toFixed(2)})` });
      }
    }

    const request = pool.request()
      .input('Id', sql.Int, complaintId)
      .input('BudgetAllocationStatus', sql.NVarChar, 'released')
      .input('BudgetReleasedDate', sql.DateTime, new Date())
      .input('BudgetReleasedByCNIC', sql.NVarChar, treasurerCnic);

    let allocationFields = '';
    if (complaint.BudgetAllocationStatus === 'pending') {
      request.input('BudgetAllocatedAmount', sql.Decimal(18, 2), allocatedAmount)
        .input('BudgetAllocatedDate', sql.DateTime, new Date())
        .input('BudgetAllocatedByCNIC', sql.NVarChar, treasurerCnic)
        .input('BudgetCategory', sql.NVarChar, budgetCategory);
      allocationFields = ', BudgetAllocatedAmount = @BudgetAllocatedAmount, BudgetAllocatedDate = @BudgetAllocatedDate, BudgetAllocatedByCNIC = @BudgetAllocatedByCNIC, BudgetCategory = @BudgetCategory';
    } else if (budgetCategory) {
      request.input('BudgetCategory', sql.NVarChar, budgetCategory);
      allocationFields = ', BudgetCategory = @BudgetCategory';
    }

    // CRITICAL: Budget release should NEVER change complaint Status.
    // Only update budget-related fields: BudgetAllocationStatus, timestamps, and allocation amounts.
    // Do NOT update Status, HasBudget, MeetingDecision, or any other fields.
    await request.query(`
      UPDATE Complaints
      SET BudgetAllocationStatus = @BudgetAllocationStatus,
          BudgetReleasedDate = @BudgetReleasedDate,
          BudgetReleasedByCNIC = @BudgetReleasedByCNIC${allocationFields},
          UpdatedDate = GETDATE()
      WHERE Id = @Id
    `);

    // Log the budget release action
    const releasedAmount = complaint.BudgetAllocationStatus === 'pending' ? allocatedAmount : complaint.BudgetAllocatedAmount;
    await logComplaintActivity(pool, {
      complaintId,
      actorCnic: treasurerCnic,
      actorRole: 'treasurer',
      actionType: 'budget-released',
      remarksSnapshot: `Budget of ${releasedAmount} released to committee`,
      decisionSnapshot: null,
      minutesPathSnapshot: null,
      resolutionPhotosSnapshot: null,
      statusSnapshot: 'Budget Released',
    });

    // Notify committee members about budget release
    try {
      const committeeRes = await pool.request()
        .input('ComplaintId', sql.Int, complaintId)
        .query(`
          SELECT DISTINCT u.CNIC
          FROM PanelComplaints pc
          INNER JOIN Panels p ON pc.PanelId = p.Id
          INNER JOIN PanelMembers pm ON p.Id = pm.PanelId
          INNER JOIN Users u ON pm.CNIC = u.CNIC
          WHERE pc.ComplaintId = @ComplaintId AND p.Status = 'active'
        `);

      const notificationMessage = `Budget of PKR ${releasedAmount} has been released for your committee's complaint resolution.`;

      for (const member of committeeRes.recordset) {
        await pool.request()
          .input('RecipientCNIC', sql.NVarChar, member.CNIC)
          .input('Message', sql.NVarChar(sql.MAX), notificationMessage)
          .query(`
            INSERT INTO Notifications (RecipientCNIC, Message)
            VALUES (@RecipientCNIC, @Message)
          `);
        }
    } catch (notifyErr) {
      console.error('Error sending budget release notifications:', notifyErr);
      // Don't fail the whole operation if notifications fail
    }

    // Update available budget
    await pool.request()
      .input('NHC_Code', sql.NVarChar, complaint.NHC_Code)
      .input('ReleasedAmount', sql.Decimal(18, 2), releasedAmount)
      .query(`
        UPDATE NHCBudgets
        SET AvailableBudget = AvailableBudget - @ReleasedAmount, UpdatedDate = GETDATE()
        WHERE NHC_Code = @NHC_Code
      `);

    res.json({ message: 'Budget released successfully', complaintId });
  } catch (err) {
    console.error('Error releasing budget:', err);
    res.status(500).json({ error: 'Failed to release budget' });
  }
});

// GET: Budget Allocation Statistics for Treasurer Dashboard
app.get('/api/budget-stats/:nhcCode', async (req, res) => {
  let pool;
  try {
    const nhcCode = req.params.nhcCode;

    if (!nhcCode) {
      return res.status(400).json({ error: 'NHC Code is required' });
    }

    pool = await sql.connect(dbConfig);

    // Get budget statistics
    const statsRes = await pool.request()
      .input('NHC_Code', sql.NVarChar, nhcCode)
      .query(`
        SELECT
          COUNT(*) as total_budget_requests,
          SUM(CASE WHEN PresidentApprovalStatus = 'approved' THEN 1 ELSE 0 END) as approved_requests,
          SUM(CASE WHEN BudgetAllocationStatus = 'allocated' THEN 1 ELSE 0 END) as allocated_requests,
          SUM(CASE WHEN BudgetAllocationStatus = 'released' THEN 1 ELSE 0 END) as released_requests,
          SUM(CASE WHEN BudgetAllocationStatus = 'rejected' THEN 1 ELSE 0 END) as rejected_requests,
          SUM(CASE WHEN PresidentApprovalStatus = 'approved' AND BudgetAllocationStatus = 'pending' THEN 1 ELSE 0 END) as pending_allocation,
          SUM(CASE WHEN BudgetAllocatedAmount > 0 THEN BudgetAllocatedAmount ELSE 0 END) as total_allocated_amount,
          SUM(CASE WHEN BudgetAllocationStatus = 'released' THEN BudgetAllocatedAmount ELSE 0 END) as total_released_amount,
          MAX(nb.AvailableBudget) as total_budget_available
        FROM Complaints
        LEFT JOIN NHCBudgets nb ON nb.NHC_Code = Complaints.NHC_Code
        WHERE Complaints.NHC_Code = @NHC_Code AND Complaints.HasBudget = 1
      `);

    const stats = statsRes.recordset[0];

    const dbAvailable = stats.total_budget_available;
    const computedAvailable = Math.max(0, (stats.total_allocated_amount || 0) - (stats.total_released_amount || 0));
    const normalizedAvailable = dbAvailable !== null && dbAvailable !== undefined
      ? Number.parseFloat(dbAvailable)
      : computedAvailable;

    res.json({
      totalRequests: stats.total_budget_requests || 0,
      approvedRequests: stats.approved_requests || 0,
      allocatedRequests: stats.allocated_requests || 0,
      releasedRequests: stats.released_requests || 0,
      rejectedRequests: stats.rejected_requests || 0,
      pendingAllocation: stats.pending_allocation || 0,
      totalAllocatedAmount: stats.total_allocated_amount || 0,
      totalReleasedAmount: stats.total_released_amount || 0,
      totalBudgetAvailable: Number.isNaN(normalizedAvailable) ? computedAvailable : normalizedAvailable
    });
  } catch (err) {
    console.error('Error fetching budget stats:', err);
    res.status(500).json({ error: 'Failed to fetch budget statistics' });
  }
});

// GET: Available budget amount for a specific NHC
app.get('/api/budget-available/:nhcCode', async (req, res) => {
  let pool;
  try {
    const nhcCode = req.params.nhcCode;
    if (!nhcCode) return res.status(400).json({ error: 'NHC Code is required' });
    pool = await sql.connect(dbConfig);
    const result = await pool.request()
      .input('NHC_Code', sql.NVarChar, nhcCode)
      .query('SELECT TOP 1 AvailableBudget FROM NHCBudgets WHERE NHC_Code = @NHC_Code');
    res.json({ availableBudget: result.recordset[0]?.AvailableBudget ?? 0 });
  } catch (err) {
    console.error('Error fetching available budget:', err);
    res.status(500).json({ error: 'Failed to fetch available budget' });
  } finally {
    if (pool) await pool.close();
  }
});

// PUT: Set available budget for an NHC
app.put('/api/budget-available/:nhcCode', async (req, res) => {
  let pool;
  try {
    const nhcCode = req.params.nhcCode;
    const availableBudget = parseFloat(req.body?.availableBudget);
    if (!nhcCode) return res.status(400).json({ error: 'NHC Code is required' });
    if (Number.isNaN(availableBudget) || availableBudget < 0) {
      return res.status(400).json({ error: 'Valid available budget is required' });
    }
    pool = await sql.connect(dbConfig);
    await pool.request()
      .input('NHC_Code', sql.NVarChar, nhcCode)
      .input('AvailableBudget', sql.Decimal(18, 2), availableBudget)
      .query(`
        IF EXISTS (SELECT 1 FROM NHCBudgets WHERE NHC_Code = @NHC_Code)
          UPDATE NHCBudgets SET AvailableBudget = @AvailableBudget, UpdatedDate = GETDATE() WHERE NHC_Code = @NHC_Code
        ELSE
          INSERT INTO NHCBudgets (NHC_Code, AvailableBudget) VALUES (@NHC_Code, @AvailableBudget)
      `);
    res.json({ message: 'Available budget updated successfully', availableBudget });
  } catch (err) {
    console.error('Error updating available budget:', err);
    res.status(500).json({ error: 'Failed to update available budget' });
  } finally {
    if (pool) await pool.close();
  }
});

// GET: Budget Allocation History for Treasurer
app.get('/api/budget-history/:nhcCode', async (req, res) => {
  let pool;
  try {
    const nhcCode = req.params.nhcCode;
    const cnic = String(req.query.cnic || '').trim();

    if (!nhcCode) {
      return res.status(400).json({ error: 'NHC Code is required' });
    }
    if (!cnic) {
      return res.status(400).json({ error: 'Treasurer CNIC is required' });
    }

    pool = await sql.connect(dbConfig);

    const userRes = await pool.request()
      .input('CNIC', sql.NVarChar, cnic)
      .query('SELECT Role FROM Users WHERE CNIC = @CNIC');

    if (userRes.recordset.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const role = String(userRes.recordset[0].Role || '').toLowerCase();
    let authorized = role === 'treasurer' || role === 'admin';

    if (!authorized) {
      const userNHCRes = await pool.request()
        .input('CNIC', sql.NVarChar, cnic)
        .input('NHC_Code', sql.NVarChar, nhcCode)
        .query('SELECT Role FROM UserNHCs WHERE UserCNIC = @CNIC AND NHC_Code = @NHC_Code');
      authorized = userNHCRes.recordset.some(r => String(r.Role || '').toLowerCase() === 'treasurer' || String(r.Role || '').toLowerCase() === 'admin');
    }

    if (!authorized) {
      return res.status(403).json({ error: 'User is not authorized to view budget history' });
    }

    const historyRes = await pool.request()
      .input('NHC_Code', sql.NVarChar, nhcCode)
      .query(`
        SELECT
          cal.Id,
          cal.ComplaintId,
          cal.ActorCNIC,
          cal.ActorRole,
          cal.ActionType,
          cal.RemarksSnapshot,
          cal.DecisionSnapshot,
          cal.StatusSnapshot,
          cal.CreatedDate,
          c.Category,
          c.Description,
          c.BudgetAllocatedAmount,
          c.BudgetCategory,
          c.BudgetAllocationStatus
        FROM ComplaintActivityLog cal
        INNER JOIN Complaints c ON c.Id = cal.ComplaintId
        WHERE c.NHC_Code = @NHC_Code
          AND cal.ActionType IN ('budget-allocated', 'budget-released', 'budget-rejected')
        ORDER BY cal.CreatedDate DESC, cal.Id DESC
      `);

    res.json(historyRes.recordset || []);
  } catch (err) {
    console.error('Error fetching budget history:', err);
    res.status(500).json({ error: 'Failed to fetch budget history' });
  } finally {
    if (pool) await pool.close();
  }
});

// GET: Panel Complaint History
app.get('/api/panels/:panelId/history', async (req, res) => {
  let pool;
  try {
    const panelId = parseInt(req.params.panelId, 10);

    if (!panelId) {
      return res.status(400).json({ error: 'Panel ID is required' });
    }

    pool = await sql.connect(dbConfig);

    const historyRes = await pool.request()
      .input('PanelId', sql.Int, panelId)
      .query(`
        SELECT 
          pch.Id,
          pch.ComplaintId,
          pch.AssignedDate,
          pch.CompletedDate,
          pch.CompletionStatus,
          pch.PresidentComments,
          pch.PresidentCNIC,
          c.Category,
          c.Description,
          c.Status,
          c.MeetingDecision
        FROM PanelComplaintHistory pch
        INNER JOIN Complaints c ON c.Id = pch.ComplaintId
        WHERE pch.PanelId = @PanelId
        ORDER BY pch.CompletedDate DESC
      `);

    res.json({
      success: true,
      history: historyRes.recordset || []
    });

  } catch (err) {
    console.error('Error fetching panel history:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (pool) await pool.close();
  }
});

// ==================== SUGGESTIONS ROUTES ====================

// POST: Create Suggestion
const createSuggestionHandler = async (req, res) => {
  const { userCnic, userName, nhcCode, title, description } = req.body || {};

  const cleanUserCnic = String(userCnic || '').trim();
  const cleanUserName = String(userName || '').trim();
  const cleanNhcCode = String(nhcCode || '').trim();
  const cleanTitle = String(title || '').trim();
  const cleanDescription = String(description || '').trim();

  if (!cleanUserCnic || !cleanNhcCode || !cleanTitle || !cleanDescription) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  let pool;
  try {
    pool = await sql.connect(dbConfig);
    await ensureSuggestionsTableExists(pool);
    const result = await pool.request()
      .input('UserCNIC', sql.NVarChar, cleanUserCnic)
      .input('UserName', sql.NVarChar, cleanUserName)
      .input('NHC_Code', sql.NVarChar, cleanNhcCode)
      .input('Title', sql.NVarChar, cleanTitle)
      .input('Description', sql.NVarChar(sql.MAX), cleanDescription)
      .query(`
        INSERT INTO Suggestions (UserCNIC, UserName, NHC_Code, Title, Description)
        OUTPUT INSERTED.Id
        VALUES (@UserCNIC, @UserName, @NHC_Code, @Title, @Description)
      `);

    const insertedId = result.recordset?.[0]?.Id || null;
    res.json({
      success: true,
      message: 'Suggestion submitted successfully',
      suggestionId: insertedId
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (pool) await pool.close();
  }
};

app.post('/api/suggestion', createSuggestionHandler);
app.post('/api/suggestions', createSuggestionHandler);

// GET: All Suggestions for NHC (for president dashboard)
app.get('/api/suggestions-by-nhc/:nhcCode', async (req, res) => {
  let pool;
  try {
    const { nhcCode } = req.params;
    pool = await sql.connect(dbConfig);
    await ensureSuggestionsTableExists(pool);
    const result = await pool.request()
      .input('NHC_Code', sql.NVarChar, nhcCode)
      .query('SELECT * FROM Suggestions WHERE NHC_Code = @NHC_Code ORDER BY CreatedDate DESC');
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (pool) await pool.close();
  }
});

// GET: User's Suggestions
app.get('/api/suggestions/:userCnic', async (req, res) => {
  let pool;
  try {
    const { userCnic } = req.params;
    pool = await sql.connect(dbConfig);
    await ensureSuggestionsTableExists(pool);
    const result = await pool.request()
      .input('UserCNIC', sql.NVarChar, userCnic)
      .query('SELECT * FROM Suggestions WHERE UserCNIC = @UserCNIC ORDER BY CreatedDate DESC');
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (pool) await pool.close();
  }
});

// PUT: Update suggestion status (for president)
app.put('/api/suggestions/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, nhcCode } = req.body || {};

  const allowedStatuses = ['New', 'Read', 'Addressed'];
  const cleanStatus = String(status || '').trim();
  const cleanNhcCode = String(nhcCode || '').trim();

  if (!allowedStatuses.includes(cleanStatus)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }

  let pool;
  try {
    pool = await sql.connect(dbConfig);
    await ensureSuggestionsTableExists(pool);

    const request = pool.request()
      .input('Id', sql.Int, Number(id))
      .input('Status', sql.NVarChar, cleanStatus);

    let query = `
      UPDATE Suggestions
      SET Status = @Status
      WHERE Id = @Id
    `;

    if (cleanNhcCode) {
      request.input('NHC_Code', sql.NVarChar, cleanNhcCode);
      query += ' AND NHC_Code = @NHC_Code';
    }

    const result = await request.query(query);

    if (!result.rowsAffected || result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }

    res.json({ success: true, message: 'Suggestion status updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (pool) await pool.close();
  }
});

const PORT = 3001;

// start everything in async wrapper so we can await DB initialization
(async () => {
  try {
    console.log('🔧 Initializing database...');
    await initDB();
    console.log(`✅ Database ready. Starting server on port ${PORT}`);
    const server = app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
    server.on('error', err => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Is another instance running?`);
      } else {
        console.error('Server error:', err);
      }
      process.exit(1);
    });
  } catch (startupErr) {
    console.error('❌ Failed to initialize application:', startupErr);
    process.exit(1); // exit since server cannot function
  }
})();

// 10. ASSIGN REQUEST TO AN NHC (Admin action)
app.put('/api/request/assign', async (req, res) => {
  const { requestId, nhcCode } = req.body;
  if (!requestId || !nhcCode) return res.status(400).json({ error: 'requestId and nhcCode required' });
  let pool;
  try {
    pool = await sql.connect(dbConfig);
    // Get request to find CNIC
    const r = await pool.request()
      .input('Id', sql.Int, requestId)
      .query('SELECT * FROM Requests WHERE Id = @Id');
    if (r.recordset.length === 0) return res.status(404).json({ error: 'Request not found' });
    const reqRecord = r.recordset[0];
    const cnic = reqRecord.CNIC;

    // add association row in UserNHCs if not already present
    try {
      await pool.request()
        .input('UserCNIC', sql.NVarChar, cnic)
        .input('NHC_Code', sql.NVarChar, nhcCode)
        .input('Role', sql.NVarChar, 'Member')
        .query('INSERT INTO UserNHCs (UserCNIC, NHC_Code, Role) VALUES (@UserCNIC, @NHC_Code, @Role)');
    } catch (e) {
      // duplicate key means mapping already exists, ignore
    }


    // Update request status and assigned nhc
    await pool.request()
      .input('Id', sql.Int, requestId)
      .input('AssignedNHC', sql.NVarChar, nhcCode)
      .input('Status', sql.NVarChar, 'Created')
      .query("UPDATE Requests SET Status = @Status, AssignedNHC = @AssignedNHC WHERE Id = @Id");

    // Create a notification for the user informing them about the assignment
    try {
      await pool.request()
        .input('RecipientCNIC', sql.NVarChar, cnic)
        .input('Message', sql.NVarChar(sql.MAX), `Your request has been assigned to ${nhcCode}`)
        .query("INSERT INTO Notifications (RecipientCNIC, Message) VALUES (@RecipientCNIC, @Message)");
      console.log('✓ Notification created for', cnic);
    } catch (noteErr) {
      console.error('Notification Insert Error:', noteErr);
    }

    res.json({ message: 'Request assigned, user updated and notified' });
  } catch (err) {
    console.error('Assign Error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (pool) await pool.close();
  }
});

// DELETE a request (Admin)
app.delete('/api/request/:id', async (req, res) => {
  const { id } = req.params;
  let pool;
  try {
    pool = await sql.connect(dbConfig);
    const r = await pool.request()
      .input('Id', sql.Int, id)
      .query('SELECT * FROM Requests WHERE Id = @Id');
    if (r.recordset.length === 0) return res.status(404).json({ error: 'Request not found' });

    await pool.request()
      .input('Id', sql.Int, id)
      .query('DELETE FROM Requests WHERE Id = @Id');

    res.json({ message: 'Request deleted' });
  } catch (err) {
    console.error('Delete Request Error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (pool) await pool.close();
  }
});

// 2.9 GET CANDIDATES FOR NHC (only approved panels are treated as candidates)
app.get('/api/candidates', async (req, res) => {
  const nhcId = parseInt(req.query.nhcId, 10);
  const eligibleOnly = req.query.eligible === 'true';
  if (!nhcId) return res.status(400).json({ error: 'nhcId required' });
  let pool;
  try {
    pool = new sql.ConnectionPool(dbConfig);
    await pool.connect();
    const supporterCnic = req.query.supporterCnic || null;

    // Get the latest nomination ID (not just date) for this NHC
    const nomRes = await pool.request()
      .input('NHC_Id', sql.Int, nhcId)
      .query(`
        SELECT TOP 1 Id, NominationEndDate FROM Nominations 
        WHERE NHC_Id = @NHC_Id 
        ORDER BY CreatedDate DESC
      `);
    
    const latestNominationId = nomRes.recordset.length > 0 ? nomRes.recordset[0].Id : null;

    // Get the latest election id for this NHC (if any) so we can include current election vote counts
    const elRes = await pool.request()
      .input('NHC_Id', sql.Int, nhcId)
      .query(`SELECT TOP 1 Id FROM Elections WHERE NHC_Id = @NHC_Id ORDER BY CreatedDate DESC`);
    const latestElectionId = elRes.recordset.length > 0 ? elRes.recordset[0].Id : null;

    const request = pool.request()
      .input('NHC_Id', sql.Int, nhcId)
      .input('SupporterCNIC', sql.NVarChar, supporterCnic)
      .input('EligibleOnly', sql.Bit, eligibleOnly ? 1 : 0)
      .input('NominationId', sql.Int, latestNominationId)
      .input('ElectionId', sql.Int, latestElectionId);

    // Only return candidates that are linked to an approved panel (PanelId not null)
    const result = await request.query(`
      SELECT c.Id, c.CNIC, c.PanelId, c.NHC_Id, c.Category, c.Status, c.NominationEndDate, c.IsEligible, c.CreatedDate, 
        u.FirstName, u.LastName,
        p.PanelName,
        ISNULL(c.TotalVotes, 0) AS TotalVotes,
        ISNULL(s.SupportCount, 0) AS SupportCount,
        ISNULL(v2.ElectionVotes, 0) AS ElectionVotes,
        CASE WHEN @SupporterCNIC IS NOT NULL AND EXISTS(SELECT 1 FROM CandidateSupports cs WHERE cs.CandidateId = c.Id AND cs.SupporterCNIC = @SupporterCNIC) THEN 1 ELSE 0 END AS IsSupported
      FROM Candidates c
      LEFT JOIN Users u ON c.CNIC = u.CNIC
      LEFT JOIN Panels p ON c.PanelId = p.Id
      LEFT JOIN (
        SELECT CandidateId, COUNT(*) AS SupportCount FROM CandidateSupports GROUP BY CandidateId
      ) s ON s.CandidateId = c.Id
      LEFT JOIN (
        SELECT CandidateId, COUNT(*) AS ElectionVotes FROM ElectionVotes WHERE ElectionId = @ElectionId GROUP BY CandidateId
      ) v2 ON v2.CandidateId = c.Id
      WHERE c.NHC_Id = @NHC_Id 
        AND c.PanelId IS NOT NULL
        AND (CAST(@EligibleOnly as BIT) = 0 OR c.IsEligible = 1)
        AND (@NominationId IS NULL OR c.NominationId = @NominationId)
      ORDER BY c.TotalVotes DESC, c.CreatedDate DESC
    `);
    
    // enrich each candidate with its panel members (if any)
    const enriched = await Promise.all(result.recordset.map(async (r) => {
      const base = {
        ...r,
        TotalVotes: r.TotalVotes || 0,
        SupportCount: r.SupportCount || 0,
        ElectionVotes: r.ElectionVotes || 0,
        IsSupported: r.IsSupported === 1,
        IsEligible: r.IsEligible === 1,
        PanelMembers: []
      };
      try {
        if (r.PanelId) {
          const mres = await pool.request()
            .input('PanelId', sql.Int, r.PanelId)
            .query(`SELECT pm.CNIC, pm.Role, pm.InviteStatus, ISNULL(u.FirstName,'') AS FirstName, ISNULL(u.LastName,'') AS LastName FROM PanelMembers pm LEFT JOIN Users u ON pm.CNIC = u.CNIC WHERE pm.PanelId = @PanelId ORDER BY pm.Role`);
          base.PanelMembers = mres.recordset || [];
        }
      } catch (e) {
        console.error('Failed to load panel members for PanelId', r.PanelId, e);
      }
      console.log(`DEBUG /api/candidates candidate ${r.Id} panelId=${r.PanelId} members=${base.PanelMembers.length}`);
      return base;
    }));

    res.json(enriched);
  } catch (err) {
    console.error('❌ Error fetching candidates:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (pool) await pool.close();
  }
});

// 2.10 SUBMIT SELF NOMINATION (disabled in panel-based workflow)
app.post('/api/candidates', async (req, res) => {
  // individual self-nomination is no longer supported; panels must be created instead
  res.status(400).json({ error: 'Individual nominations are disabled. Please create a panel via /api/panels.' });
});

// 2.11 SUPPORT A CANDIDATE
app.post('/api/candidates/:id/support', async (req, res) => {
  const candidateId = parseInt(req.params.id, 10);
  const { supporterCnic } = req.body;
  if (!candidateId || !supporterCnic) return res.status(400).json({ error: 'candidate id and supporterCnic required' });

  let pool;
  try {
    pool = await sql.connect(dbConfig);
    
    // Ensure candidate exists and get nomination info and category
    const cRes = await pool.request()
      .input('Id', sql.Int, candidateId)
      .query('SELECT CNIC, NHC_Id, Category, NominationEndDate, NominationId FROM Candidates WHERE Id = @Id');
    if (cRes.recordset.length === 0) return res.status(404).json({ error: 'Candidate not found' });
    
    const { CNIC: candidateCnic, NHC_Id: nhcId, Category: candidateCategory, NominationEndDate, NominationId } = cRes.recordset[0];

    // Prevent supporting yourself
    if (String(candidateCnic) === String(supporterCnic)) {
      return res.status(400).json({ error: 'You cannot support yourself' });
    }
    
    // Check if voting is within the nomination period (use local date)
    const today = new Date();
    const todayStr = String(today.getFullYear()).padStart(4, '0') + '-' +
                     String(today.getMonth() + 1).padStart(2, '0') + '-' +
                     String(today.getDate()).padStart(2, '0');
    
    let endDateStr;
    if (NominationEndDate instanceof Date) {
      endDateStr = String(NominationEndDate.getFullYear()).padStart(4, '0') + '-' +
                   String(NominationEndDate.getMonth() + 1).padStart(2, '0') + '-' +
                   String(NominationEndDate.getDate()).padStart(2, '0');
    } else {
      endDateStr = String(NominationEndDate).split('T')[0];
    }
    
    console.log('DEBUG POST /api/candidates/:id/support - Period Check');
    console.log('  Today:', todayStr);
    console.log('  Nomination End Date:', endDateStr);
    
    if (todayStr > endDateStr) {
      return res.status(400).json({ error: 'Voting period has ended for this nomination. Period ended on: ' + endDateStr });
    }

    // Prevent supporter from supporting more than one candidate in the same category & nomination period
    const alreadySupportedCategory = await pool.request()
      .input('SupporterCNIC', sql.NVarChar, supporterCnic)
      .input('Category', sql.NVarChar, candidateCategory)
      .input('NominationId', sql.Int, NominationId)
      .query(`
        SELECT 1 FROM CandidateSupports cs
        INNER JOIN Candidates c ON cs.CandidateId = c.Id
        WHERE cs.SupporterCNIC = @SupporterCNIC
          AND c.Category = @Category
          AND (@NominationId IS NULL OR c.NominationId = @NominationId)
      `);
    if (alreadySupportedCategory.recordset.length > 0) return res.status(400).json({ error: 'You have already supported a candidate in this category for the current nomination period' });

    // Prevent duplicate support for same candidate
    const exist = await pool.request()
      .input('CandidateId', sql.Int, candidateId)
      .input('SupporterCNIC', sql.NVarChar, supporterCnic)
      .query('SELECT * FROM CandidateSupports WHERE CandidateId = @CandidateId AND SupporterCNIC = @SupporterCNIC');
    if (exist.recordset.length > 0) return res.status(400).json({ error: 'You already supported this candidate' });

    // Insert support with NHC_Id and NominationEndDate for historical tracking
    await pool.request()
      .input('CandidateId', sql.Int, candidateId)
      .input('SupporterCNIC', sql.NVarChar, supporterCnic)
      .input('NHC_Id', sql.Int, nhcId)
      .input('NominationEndDate', sql.Date, NominationEndDate)
      .input('NominationId', sql.Int, NominationId)
      .query('INSERT INTO CandidateSupports (CandidateId, SupporterCNIC, NHC_Id, NominationEndDate, CreatedDate) VALUES (@CandidateId, @SupporterCNIC, @NHC_Id, @NominationEndDate, GETDATE())');

    // Count total supports and update TotalVotes
    const cntRes = await pool.request()
      .input('CandidateId', sql.Int, candidateId)
      .query('SELECT COUNT(*) as cnt FROM CandidateSupports WHERE CandidateId = @CandidateId');
    const totalVotes = cntRes.recordset[0].cnt;

    // Update candidate with total votes
    await pool.request()
      .input('Id', sql.Int, candidateId)
      .input('TotalVotes', sql.Int, totalVotes)
      .query('UPDATE Candidates SET TotalVotes = @TotalVotes WHERE Id = @Id');

    // Check eligibility: must have at least 5 votes to be eligible
    let isEligible = false;
    if (totalVotes >= 5) {
      isEligible = true;
      try {
        await pool.request()
          .input('Id', sql.Int, candidateId)
          .input('IsEligible', sql.Bit, 1)
          .input('Status', sql.NVarChar, 'Eligible')
          .query('UPDATE Candidates SET IsEligible = 1, Status = @Status WHERE Id = @Id');
        console.log(`✓ Candidate ${candidateId} became eligible with ${totalVotes} votes`);
      } catch (e) {
        console.error('Failed to update candidate eligibility:', e);
      }
    }

    res.json({ message: 'Supported', count: totalVotes, isEligible });
  } catch (err) {
    console.error('Support Error:', err);
  } finally {
    if (pool) await pool.close();
  }
});

// --- PANEL ROUTES ---------------------------------------------------------

const ensurePanelTablesExist = async (pool) => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Panels' AND xtype='U')
    CREATE TABLE Panels (
      Id INT IDENTITY(1,1) PRIMARY KEY,
      PanelName NVARCHAR(100),
      PresidentCNIC NVARCHAR(20) NOT NULL,
      NHC_Id INT NOT NULL,
      ComplaintId INT NULL,
      Description NVARCHAR(MAX) NULL,
      IsCommittee BIT DEFAULT 0,
      Status NVARCHAR(20) DEFAULT 'pending',
      CreatedDate DATETIME DEFAULT GETDATE()
    )
  `);

  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'ComplaintId' AND Object_ID = OBJECT_ID('Panels'))
    ALTER TABLE Panels ADD ComplaintId INT NULL;
  `);

  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'Description' AND Object_ID = OBJECT_ID('Panels'))
    ALTER TABLE Panels ADD Description NVARCHAR(MAX) NULL;
  `);

  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'IsCommittee' AND Object_ID = OBJECT_ID('Panels'))
    ALTER TABLE Panels ADD IsCommittee BIT DEFAULT 0;
  `);

  await pool.request().query(`
    UPDATE p
    SET p.IsCommittee = 1
    FROM Panels p
    WHERE ISNULL(p.IsCommittee, 0) = 0
      AND EXISTS (
        SELECT 1 FROM PanelMembers pm
        WHERE pm.PanelId = p.Id AND LOWER(ISNULL(pm.Role, '')) = 'head'
      );
  `);

  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='PanelMembers' AND xtype='U')
    CREATE TABLE PanelMembers (
      Id INT IDENTITY(1,1) PRIMARY KEY,
      PanelId INT NOT NULL,
      CNIC NVARCHAR(20) NOT NULL,
      Role NVARCHAR(50) NOT NULL,
      InviteStatus NVARCHAR(20) DEFAULT 'pending',
      CreatedDate DATETIME DEFAULT GETDATE(),
      FOREIGN KEY (PanelId) REFERENCES Panels(Id)
    )
  `);

  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='PanelComplaints' AND xtype='U')
    CREATE TABLE PanelComplaints (
      Id INT IDENTITY(1,1) PRIMARY KEY,
      PanelId INT NOT NULL,
      ComplaintId INT NOT NULL,
      CreatedDate DATETIME DEFAULT GETDATE(),
      CONSTRAINT UQ_PanelComplaints_Panel_Complaint UNIQUE (PanelId, ComplaintId),
      FOREIGN KEY (PanelId) REFERENCES Panels(Id),
      FOREIGN KEY (ComplaintId) REFERENCES Complaints(Id)
    )
  `);

  await pool.request().query(`
    IF NOT EXISTS (
      SELECT 1 FROM sys.indexes WHERE name = 'UQ_PanelComplaints_Panel_Complaint' AND object_id = OBJECT_ID('PanelComplaints')
    )
    ALTER TABLE PanelComplaints ADD CONSTRAINT UQ_PanelComplaints_Panel_Complaint UNIQUE (PanelId, ComplaintId);
  `);
};

async function getCommitteeMemberCount(pool) {
  const result = await pool.request().query(`
    SELECT TOP 1 SettingValue
    FROM CommitteeSettings
    WHERE SettingKey = 'CommitteeMemberCount'
  `);
  const count = result.recordset.length > 0 ? Number(result.recordset[0].SettingValue) : 3;
  return Number.isFinite(count) && count > 0 ? count : 3;
}

async function logComplaintActivity(pool, {
  complaintId,
  actorCnic,
  actorRole,
  actionType,
  remarksSnapshot,
  decisionSnapshot,
  minutesPathSnapshot,
  resolutionPhotosSnapshot,
  statusSnapshot,
}) {
  try {
    await pool.request()
      .input('ComplaintId', sql.Int, complaintId)
      .input('ActorCNIC', sql.NVarChar, actorCnic || null)
      .input('ActorRole', sql.NVarChar, actorRole || null)
      .input('ActionType', sql.NVarChar, actionType)
      .input('RemarksSnapshot', sql.NVarChar(sql.MAX), remarksSnapshot || null)
      .input('DecisionSnapshot', sql.NVarChar(100), decisionSnapshot || null)
      .input('MinutesPathSnapshot', sql.NVarChar(sql.MAX), minutesPathSnapshot || null)
      .input('ResolutionPhotosSnapshot', sql.NVarChar(sql.MAX), resolutionPhotosSnapshot || null)
      .input('StatusSnapshot', sql.NVarChar(50), statusSnapshot || null)
      .query(`
        INSERT INTO ComplaintActivityLog (
          ComplaintId, ActorCNIC, ActorRole, ActionType,
          RemarksSnapshot, DecisionSnapshot, MinutesPathSnapshot,
          ResolutionPhotosSnapshot, StatusSnapshot, CreatedDate
        ) VALUES (
          @ComplaintId, @ActorCNIC, @ActorRole, @ActionType,
          @RemarksSnapshot, @DecisionSnapshot, @MinutesPathSnapshot,
          @ResolutionPhotosSnapshot, @StatusSnapshot, GETDATE()
        )
      `);
  } catch (logErr) {
    console.error('Failed to write ComplaintActivityLog entry:', logErr);
  }
}

// get available members in an NHC for panel creation
app.get('/api/nhc/:id/members', async (req, res) => {
  const nhcId = parseInt(req.params.id, 10);
  if (!nhcId) return res.status(400).json({ error: 'NHC id required' });
  let pool;
  try {
    pool = await new sql.ConnectionPool(dbConfig).connect();
    const result = await pool.request()
      .input('NHC_Id', sql.Int, nhcId)
      .query(`
        SELECT u.Id, u.FirstName, u.LastName, u.CNIC, u.Email, u.Phone
        FROM Users u
        INNER JOIN UserNHCs m ON u.CNIC = m.UserCNIC
        INNER JOIN NHC_Zones z ON m.NHC_Code = z.Name
        WHERE z.Id = @NHC_Id
        ORDER BY FirstName, LastName
      `);
    res.json(result.recordset || []);
  } catch (err) {
    console.error('Fetch NHC members error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (pool) await pool.close();
  }
});

// create a new panel when user clicks self nomination
app.post('/api/panels', async (req, res) => {
  const { panelName, presidentCnic, nhcId, members, treasurerCnic, viceCnic, complaintId, description, isCommittee } = req.body;
  // members is an optional array [{ cnic, role }]; legacy fields treasurerCnic/viceCnic are still supported
  if (!presidentCnic || !nhcId) {
    return res.status(400).json({ error: 'presidentCnic and nhcId are required' });
  }

  // build normalized member list
  let memberList = [];
  if (Array.isArray(members) && members.length > 0) {
    memberList = members.map(m => ({ cnic: m.cnic, role: m.role || (isCommittee ? 'Member' : null) }));
  } else {
    // fallback to legacy two-field request
    if (isCommittee) {
      return res.status(400).json({ error: 'members array is required for committee creation' });
    }
    if (!treasurerCnic || !viceCnic) {
      return res.status(400).json({ error: 'Either members array or both treasurerCnic and viceCnic are required' });
    }
    memberList = [
      { cnic: treasurerCnic, role: 'Treasurer' },
      { cnic: viceCnic, role: 'Vice President' }
    ];
  }

  let pool;
  try {
    pool = await new sql.ConnectionPool(dbConfig).connect();
    await ensurePanelTablesExist(pool);
    const committeeMemberCount = isCommittee ? await getCommitteeMemberCount(pool) : null;
    // verify president exists
    const pres = await pool.request()
      .input('CNIC', sql.NVarChar, presidentCnic)
      .query('SELECT CNIC, Role FROM Users WHERE CNIC = @CNIC');
    if (pres.recordset.length === 0) {
      return res.status(400).json({ error: 'President CNIC not found' });
    }

    if (isCommittee) {
      const creatorRole = String(pres.recordset[0].Role || '').toLowerCase();
      if (creatorRole !== 'admin' && creatorRole !== 'president') {
        return res.status(403).json({ error: 'Only Admin can create committees' });
      }
      if (memberList.length !== committeeMemberCount) {
        return res.status(400).json({ error: `Committee must have exactly ${committeeMemberCount} members` });
      }
    }

    if (!isCommittee) {
      // Ensure current date is within nomination window for election panels.
      const nomRes = await pool.request()
        .input('NHC_Id', sql.Int, nhcId)
        .query('SELECT TOP 1 NominationStartDate, NominationEndDate FROM Nominations WHERE NHC_Id = @NHC_Id ORDER BY CreatedDate DESC');
      if (nomRes.recordset.length === 0) {
        return res.status(400).json({ error: 'Nomination period not set for this NHC' });
      }
      const { NominationStartDate, NominationEndDate } = nomRes.recordset[0];
      const today = new Date();
      const todayStr = String(today.getFullYear()).padStart(4, '0') + '-' +
                       String(today.getMonth() + 1).padStart(2, '0') + '-' +
                       String(today.getDate()).padStart(2, '0');
      let startStr = '';
      let endStr = '';
      if (NominationStartDate instanceof Date) {
        startStr = String(NominationStartDate.getFullYear()).padStart(4, '0') + '-' +
                   String(NominationStartDate.getMonth() + 1).padStart(2, '0') + '-' +
                   String(NominationStartDate.getDate()).padStart(2, '0');
      } else {
        startStr = String(NominationStartDate).split('T')[0];
      }
      if (NominationEndDate instanceof Date) {
        endStr = String(NominationEndDate.getFullYear()).padStart(4, '0') + '-' +
                 String(NominationEndDate.getMonth() + 1).padStart(2, '0') + '-' +
                 String(NominationEndDate.getDate()).padStart(2, '0');
      } else {
        endStr = String(NominationEndDate).split('T')[0];
      }
      if (todayStr < startStr || todayStr > endStr) {
        return res.status(400).json({ error: 'Nominations are not open today. Period: ' + startStr + ' to ' + endStr });
      }
    }

    // validate roles and cnics
    const seenRoles = new Set();
    const seenCnics = new Set([String(presidentCnic)]);
    for (const m of memberList) {
      if (!m.cnic || !m.role) {
        return res.status(400).json({ error: 'Each member must have cnic and role' });
      }
      // Election panel flow requires unique roles, but committee flow allows many "Member" roles.
      if (!isCommittee && seenRoles.has(m.role)) {
        return res.status(400).json({ error: 'Duplicate role in member list: ' + m.role });
      }
      seenRoles.add(m.role);
      if (seenCnics.has(String(m.cnic))) {
        return res.status(400).json({ error: 'Duplicate CNIC in panel (including president)' });
      }
      seenCnics.add(String(m.cnic));
    }

    if (isCommittee) {
      const headCount = memberList.filter((m) => String(m.role || '').toLowerCase() === 'head').length;
      if (headCount !== 1) {
        return res.status(400).json({ error: 'Committee must have exactly one Head' });
      }
    }

    if (!isCommittee) {
      // Verify roles exist in Positions table for election panel flow.
      const posRes = await pool.request().query('SELECT Name FROM Positions');
      const validRoles = new Set(posRes.recordset.map(r => String(r.Name)));
      for (const r of seenRoles) {
        if (!validRoles.has(r)) {
          return res.status(400).json({ error: 'Unknown position/role: ' + r });
        }
      }
    }

    // verify member CNICs exist (only if we have any)
    if (memberList.length > 0) {
      const params = memberList.map((m,i) => ({ name: `CNIC${i}`, value: m.cnic }));
      let checkQuery = 'SELECT CNIC FROM Users WHERE ' + params.map(p => `CNIC = @${p.name}`).join(' OR ');
      const chkReq = pool.request();
      params.forEach(p => chkReq.input(p.name, sql.NVarChar, p.value));
      const memberRes2 = await chkReq.query(checkQuery);
      if (memberRes2.recordset.length < memberList.length) {
        return res.status(400).json({ error: 'One or more member CNICs not found' });
      }
    }

    // election panels require unique participation across panels; committees can reuse members
    if (!isCommittee) {
      const allCnics = Array.from(seenCnics);
      let inQuery = 'SELECT DISTINCT CNIC FROM PanelMembers WHERE CNIC IN (' + allCnics.map((_,i) => `@ExC${i}`).join(',') + ')';
      const inReq = pool.request();
      allCnics.forEach((c,i) => inReq.input(`ExC${i}`, sql.NVarChar, c));
      const existing = await inReq.query(inQuery);
      if (existing.recordset.length > 0) {
        return res.status(400).json({ error: 'One or more selected members are already part of a panel' });
      }
    }

    // create the panel record
    const parsedComplaintId = complaintId ? parseInt(complaintId, 10) : null;

    const insPanel = await pool.request()
      .input('PanelName', sql.NVarChar, panelName || null)
      .input('PresidentCNIC', sql.NVarChar, presidentCnic)
      .input('NHC_Id', sql.Int, nhcId)
      .input('ComplaintId', sql.Int, parsedComplaintId)
      .input('Description', sql.NVarChar(sql.MAX), description || null)
      .input('IsCommittee', sql.Bit, isCommittee ? 1 : 0)
      .input('Status', sql.NVarChar, isCommittee ? 'active' : 'pending')
      .query('INSERT INTO Panels (PanelName, PresidentCNIC, NHC_Id, ComplaintId, Description, IsCommittee, Status) VALUES (@PanelName, @PresidentCNIC, @NHC_Id, @ComplaintId, @Description, @IsCommittee, @Status); SELECT SCOPE_IDENTITY() as id');

    const panelId = insPanel.recordset[0].id;

    if (isCommittee && parsedComplaintId) {
      await pool.request()
        .input('PanelId', sql.Int, panelId)
        .input('ComplaintId', sql.Int, parsedComplaintId)
        .query(`
          IF NOT EXISTS (SELECT 1 FROM PanelComplaints WHERE PanelId = @PanelId AND ComplaintId = @ComplaintId)
          INSERT INTO PanelComplaints (PanelId, ComplaintId) VALUES (@PanelId, @ComplaintId)
        `);
    }

    // add president first
    await pool.request()
      .input('PanelId', sql.Int, panelId)
      .input('CNIC', sql.NVarChar, presidentCnic)
      .input('Role', sql.NVarChar, 'President')
      .input('InviteStatus', sql.NVarChar, 'accepted')
      .query('INSERT INTO PanelMembers (PanelId, CNIC, Role, InviteStatus, CreatedDate) VALUES (@PanelId, @CNIC, @Role, @InviteStatus, GETDATE())');

    // add others
    for (const m of memberList) {
      await pool.request()
        .input('PanelId', sql.Int, panelId)
        .input('CNIC', sql.NVarChar, m.cnic)
        .input('Role', sql.NVarChar, m.role)
        .input('InviteStatus', sql.NVarChar, isCommittee ? 'accepted' : 'pending')
        .query('INSERT INTO PanelMembers (PanelId, CNIC, Role, InviteStatus, CreatedDate) VALUES (@PanelId, @CNIC, @Role, @InviteStatus, GETDATE())');
    }

    if (isCommittee) {
      for (const m of memberList) {
        try {
          await pool.request()
            .input('RecipientCNIC', sql.NVarChar, m.cnic)
            .input('Message', sql.NVarChar(sql.MAX), `You have been added to committee "${panelName || 'Committee'}".`)
            .input('PanelId', sql.Int, panelId)
            .input('Role', sql.NVarChar, m.role)
            .query('INSERT INTO Notifications (RecipientCNIC, Message, PanelId, Role) VALUES (@RecipientCNIC, @Message, @PanelId, @Role)');
        } catch (noteErr) {
          console.error('Committee notification error:', noteErr);
        }
      }

      if (parsedComplaintId) {
        try {
          const complaintOwnerRes = await pool.request()
            .input('ComplaintId', sql.Int, parsedComplaintId)
            .query('SELECT UserCNIC, Category FROM Complaints WHERE Id = @ComplaintId');

          await pool.request()
            .input('ComplaintId', sql.Int, parsedComplaintId)
            .query("UPDATE Complaints SET Status = 'In-Progress', UpdatedDate = GETDATE() WHERE Id = @ComplaintId");

          if (complaintOwnerRes.recordset.length > 0) {
            const complaintOwner = complaintOwnerRes.recordset[0];
            try {
              await pool.request()
                .input('RecipientCNIC', sql.NVarChar, complaintOwner.UserCNIC)
                .input('Message', sql.NVarChar(sql.MAX), `Your complaint (${complaintOwner.Category || 'Complaint'}) status is now In-Progress.`)
                .query('INSERT INTO Notifications (RecipientCNIC, Message) VALUES (@RecipientCNIC, @Message)');
            } catch (notifyErr) {
              console.error('Failed to notify complaint owner for status update:', notifyErr);
            }
          }
        } catch (complaintErr) {
          console.error('Failed to update complaint status for committee assignment:', complaintErr);
        }
      }
    } else {
      // send invitations for each role except president
      const messageTemplate = (role) => `You have been invited to join panel '${panelName || ''}' as ${role}. Please accept the invitation.`;
      for (const m of memberList) {
        try {
          await pool.request()
            .input('RecipientCNIC', sql.NVarChar, m.cnic)
            .input('Message', sql.NVarChar(sql.MAX), messageTemplate(m.role))
            .input('PanelId', sql.Int, panelId)
            .input('Role', sql.NVarChar, m.role)
            .query('INSERT INTO Notifications (RecipientCNIC, Message, PanelId, Role) VALUES (@RecipientCNIC, @Message, @PanelId, @Role)');
        } catch (noteErr) {
          console.error(`Notification error (${m.role}):`, noteErr);
        }
      }
    }

    res.status(201).json({ message: 'Panel created', panelId });
  } catch (err) {
    console.error('Create panel error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (pool) await pool.close();
  }
});

// assign an existing complaint to an active committee
app.post('/api/panels/:id/complaints', async (req, res) => {
  const panelId = parseInt(req.params.id, 10);
  const complaintId = parseInt(req.body?.complaintId, 10);
  const presidentCnic = String(req.body?.presidentCnic || '').trim();

  if (!panelId || !complaintId || !presidentCnic) {
    return res.status(400).json({ error: 'panelId, complaintId and presidentCnic are required' });
  }

  let pool;
  try {
    pool = await new sql.ConnectionPool(dbConfig).connect();
    await ensurePanelTablesExist(pool);

    const presRes = await pool.request()
      .input('CNIC', sql.NVarChar, presidentCnic)
      .query('SELECT CNIC, Role FROM Users WHERE CNIC = @CNIC');

    if (presRes.recordset.length === 0) {
      return res.status(404).json({ error: 'President not found' });
    }

    if (String(presRes.recordset[0].Role || '').toLowerCase() !== 'president') {
      return res.status(403).json({ error: 'Only President can assign complaints to committees' });
    }

    const panelRes = await pool.request()
      .input('PanelId', sql.Int, panelId)
      .query('SELECT Id, PanelName, PresidentCNIC, ComplaintId FROM Panels WHERE Id = @PanelId');

    if (panelRes.recordset.length === 0) {
      return res.status(404).json({ error: 'Committee not found' });
    }

    const complaintRes = await pool.request()
      .input('ComplaintId', sql.Int, complaintId)
      .query('SELECT Id, UserCNIC, Category, Status FROM Complaints WHERE Id = @ComplaintId');

    if (complaintRes.recordset.length === 0) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    const existingMap = await pool.request()
      .input('PanelId', sql.Int, panelId)
      .input('ComplaintId', sql.Int, complaintId)
      .query('SELECT 1 FROM PanelComplaints WHERE PanelId = @PanelId AND ComplaintId = @ComplaintId');

    if (existingMap.recordset.length === 0) {
      await pool.request()
        .input('PanelId', sql.Int, panelId)
        .input('ComplaintId', sql.Int, complaintId)
        .query('INSERT INTO PanelComplaints (PanelId, ComplaintId) VALUES (@PanelId, @ComplaintId)');
    }

    await pool.request()
      .input('ComplaintId', sql.Int, complaintId)
      .query("UPDATE Complaints SET Status = 'In-Progress', UpdatedDate = GETDATE() WHERE Id = @ComplaintId");

    try {
      const complaintOwner = complaintRes.recordset[0];
      await pool.request()
        .input('RecipientCNIC', sql.NVarChar, complaintOwner.UserCNIC)
        .input('Message', sql.NVarChar(sql.MAX), `Your complaint (${complaintOwner.Category || 'Complaint'}) has been assigned to committee '${panelRes.recordset[0].PanelName || 'Committee'}'.`)
        .query('INSERT INTO Notifications (RecipientCNIC, Message) VALUES (@RecipientCNIC, @Message)');
    } catch (notifyErr) {
      console.error('Failed to notify complaint owner for active committee assignment:', notifyErr);
    }

    res.json({
      success: true,
      message: 'Complaint assigned to committee successfully',
      panelId,
      complaintId,
    });
  } catch (err) {
    console.error('Assign complaint to committee error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (pool) await pool.close();
  }
});

// endpoint for members to accept their invitation
app.post('/api/panels/:id/members/accept', async (req, res) => {
  const panelId = parseInt(req.params.id, 10);
  const { cnic } = req.body;
  if (!panelId || !cnic) return res.status(400).json({ error: 'panel id and cnic required' });

  let pool;
  try {
    pool = await new sql.ConnectionPool(dbConfig).connect();
    await ensurePanelTablesExist(pool);
    // update invite status
    const upd = await pool.request()
      .input('PanelId', sql.Int, panelId)
      .input('CNIC', sql.NVarChar, cnic)
      .query(`
        UPDATE PanelMembers
        SET InviteStatus = 'accepted'
        WHERE PanelId = @PanelId AND CNIC = @CNIC
      `);
    if (upd.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    // check whether all non-president members have accepted
    const members = await pool.request()
      .input('PanelId', sql.Int, panelId)
      .query('SELECT CNIC, Role, InviteStatus FROM PanelMembers WHERE PanelId = @PanelId');

    const pending = members.recordset.filter(m => m.InviteStatus !== 'accepted');
    if (pending.length === 0) {
      // all accepted – approve panel and create candidate
      await pool.request()
        .input('PanelId', sql.Int, panelId)
        .query("UPDATE Panels SET Status = 'approved' WHERE Id = @PanelId");

      // insert candidate row if not already created
      const panelInfo = await pool.request()
        .input('PanelId', sql.Int, panelId)
        .query('SELECT PanelName, PresidentCNIC, NHC_Id FROM Panels WHERE Id = @PanelId');
      if (panelInfo.recordset.length > 0) {
        const { PanelName, PresidentCNIC, NHC_Id } = panelInfo.recordset[0];
        // determine current nomination period for this nhc
        const nomRes = await pool.request()
          .input('NHC_Id', sql.Int, NHC_Id)
          .query('SELECT TOP 1 Id, NominationEndDate FROM Nominations WHERE NHC_Id = @NHC_Id ORDER BY CreatedDate DESC');
        const nominationId = nomRes.recordset.length > 0 ? nomRes.recordset[0].Id : null;
        const nominationEnd = nomRes.recordset.length > 0 ? nomRes.recordset[0].NominationEndDate : null;

        // only create candidate if not exists for this panel
        const exist = await pool.request()
          .input('PanelId', sql.Int, panelId)
          .query('SELECT 1 FROM Candidates WHERE PanelId = @PanelId');
        if (exist.recordset.length === 0) {
          await pool.request()
            .input('CNIC', sql.NVarChar, PresidentCNIC)
            .input('NHC_Id', sql.Int, NHC_Id)
            .input('Category', sql.NVarChar, 'President')
            .input('NominationEndDate', sql.Date, nominationEnd)
            .input('PanelId', sql.Int, panelId)
            .input('NominationId', sql.Int, nominationId)
            .query(
              'INSERT INTO Candidates (CNIC, NHC_Id, Category, NominationEndDate, TotalVotes, IsEligible, PanelId, NominationId) VALUES (@CNIC, @NHC_Id, @Category, @NominationEndDate, 0, 0, @PanelId, @NominationId)'
            );
        }
        // notify president that panel is approved
        try {
          await pool.request()
            .input('RecipientCNIC', sql.NVarChar, PresidentCNIC)
            .input('Message', sql.NVarChar(sql.MAX), `Your panel "${PanelName || ''}" has been approved and is now a candidate.`)
            .query('INSERT INTO Notifications (RecipientCNIC, Message) VALUES (@RecipientCNIC, @Message)');
        } catch (noteErr) {
          console.error('Notification error (panel approved):', noteErr);
        }
      }
    }

    res.json({ message: 'Invitation accepted' });
  } catch (err) {
    console.error('Accept invite error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (pool) await pool.close();
  }
});

// endpoint for members to decline their invitation
app.post('/api/panels/:id/members/decline', async (req, res) => {
  const panelId = parseInt(req.params.id, 10);
  const { cnic } = req.body;
  if (!panelId || !cnic) return res.status(400).json({ error: 'panel id and cnic required' });

  let pool;
  try {
    pool = await new sql.ConnectionPool(dbConfig).connect();
    await ensurePanelTablesExist(pool);
    const upd = await pool.request()
      .input('PanelId', sql.Int, panelId)
      .input('CNIC', sql.NVarChar, cnic)
      .query(`
        UPDATE PanelMembers
        SET InviteStatus = 'declined'
        WHERE PanelId = @PanelId AND CNIC = @CNIC
      `);
    if (upd.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    // mark panel rejected and notify president
    await pool.request()
      .input('PanelId', sql.Int, panelId)
      .query("UPDATE Panels SET Status = 'rejected' WHERE Id = @PanelId");

    // find president CNIC and panel name
    const pinfo = await pool.request()
      .input('PanelId', sql.Int, panelId)
      .query('SELECT PanelName, PresidentCNIC FROM Panels WHERE Id = @PanelId');
    if (pinfo.recordset.length > 0) {
      const { PanelName, PresidentCNIC } = pinfo.recordset[0];
      try {
        await pool.request()
          .input('RecipientCNIC', sql.NVarChar, PresidentCNIC)
          .input('Message', sql.NVarChar(sql.MAX), `Your panel "${PanelName || ''}" has been declined by one of the members.`)
          .query('INSERT INTO Notifications (RecipientCNIC, Message, PanelId) VALUES (@RecipientCNIC, @Message, @PanelId)');
      } catch (noteErr) {
        console.error('Notification error (panel declined):', noteErr);
      }
    }

    res.json({ message: 'Invitation declined' });
  } catch (err) {
    console.error('Decline invite error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (pool) await pool.close();
  }
});

// get panels by nhc or by user membership
app.get('/api/panels', async (req, res) => {
  const nhcId = req.query.nhcId ? parseInt(req.query.nhcId, 10) : null;
  const cnic = req.query.cnic || null;
  const committeeOnly = String(req.query.committeeOnly || '').toLowerCase() === 'true';
  let pool;
  try {
    pool = await new sql.ConnectionPool(dbConfig).connect();
    await ensurePanelTablesExist(pool);
    let query = `SELECT p.Id, p.PanelName, p.PresidentCNIC, p.NHC_Id, p.IsCommittee,
        COALESCE(pc.ComplaintId, p.ComplaintId) AS ComplaintId,
        p.Description, p.Status, p.CreatedDate,
          c.Category AS ComplaintCategory, c.Status AS ComplaintStatus,
          c.Description AS ComplaintDescription, c.UserName AS ComplaintUserName,
          c.UserCNIC AS ComplaintUserCNIC, c.ComplaintType, c.CreatedDate AS ComplaintCreatedDate,
          c.CommitteeRemarks, c.MeetingDecision, c.MeetingMinutesPath, c.MeetingDate,
              (SELECT COUNT(1) FROM PanelMembers pm WHERE pm.PanelId = p.Id) AS MemberCount
                 FROM Panels p
           LEFT JOIN PanelComplaints pc ON pc.PanelId = p.Id
           LEFT JOIN Complaints c ON c.Id = COALESCE(pc.ComplaintId, p.ComplaintId)`;
    const inputs = [];
    const conditions = [];
    if (cnic) {
      inputs.push({ name: 'Cnic', type: sql.NVarChar, value: cnic });
      if (committeeOnly) {
        // "My Committee" must only show committees where user is an accepted member.
        // Also require a Head role to distinguish committees from election panels.
        conditions.push(`EXISTS (
          SELECT 1
          FROM PanelMembers m
          WHERE m.PanelId = p.Id
            AND m.CNIC = @Cnic
            AND LOWER(ISNULL(m.InviteStatus, 'accepted')) = 'accepted'
        )`);
        conditions.push(`EXISTS (
          SELECT 1
          FROM PanelMembers hm
          WHERE hm.PanelId = p.Id
            AND LOWER(ISNULL(hm.Role, '')) = 'head'
        )`);
      } else {
        conditions.push(`(
          p.PresidentCNIC = @Cnic
          OR EXISTS (
            SELECT 1 FROM PanelMembers m
            WHERE m.PanelId = p.Id AND m.CNIC = @Cnic
          )
        )`);
      }
    }
    if (nhcId) {
      conditions.push('p.NHC_Id = @NHC_Id');
      inputs.push({ name: 'NHC_Id', type: sql.Int, value: nhcId });
    }
    if (committeeOnly) {
      conditions.push('ISNULL(p.IsCommittee, 0) = 1');
      // Show active committees even if they currently have no complaint assigned yet
      conditions.push("p.Status IN ('active', 'completed', 'complete')");
    }
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    const reqSql = pool.request();
    inputs.forEach(i => reqSql.input(i.name, i.type, i.value));
    const result = await reqSql.query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error('Fetch panels error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (pool) await pool.close();
  }
});

// fetch members of a panel
app.get('/api/panels/:id/members', async (req, res) => {
  const panelId = parseInt(req.params.id, 10);
  if (!panelId) return res.status(400).json({ error: 'panel id required' });
  let pool;
  try {
    pool = await new sql.ConnectionPool(dbConfig).connect();
    await ensurePanelTablesExist(pool);
    const mres = await pool.request()
      .input('PanelId', sql.Int, panelId)
      .query('SELECT Id, CNIC, Role, InviteStatus, CreatedDate FROM PanelMembers WHERE PanelId = @PanelId');
    res.json(mres.recordset);
  } catch (err) {
    console.error('Fetch panel members error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (pool) await pool.close();
  }
});

// 2.12 GET CANDIDATE ELIGIBILITY RESULTS (after nomination period ends)
app.get('/api/candidates/eligibility/results', async (req, res) => {
  const nhcId = parseInt(req.query.nhcId, 10);
  if (!nhcId) return res.status(400).json({ error: 'nhcId required' });
  
  let pool;
  try {
    pool = await sql.connect(dbConfig);
    
    // Get nomination period for this NHC
    const nomRes = await pool.request()
      .input('NHC_Id', sql.Int, nhcId)
      .query('SELECT NominationStartDate, NominationEndDate FROM Nominations WHERE NHC_Id = @NHC_Id');
    
    if (nomRes.recordset.length === 0) {
      return res.status(400).json({ error: 'Nomination period not found for this NHC' });
    }
    
    const { NominationStartDate, NominationEndDate } = nomRes.recordset[0];
    
    // Get all candidates with their eligibility status and total votes
    const result = await pool.request()
      .input('NHC_Id', sql.Int, nhcId)
      .query(`
        SELECT 
          c.Id as CandidateId,
          c.CNIC,
          c.Category,
          c.Status,
          c.IsEligible,
          c.TotalVotes,
          c.NominationEndDate,
          c.CreatedDate as NominationDate,
          u.FirstName,
          u.LastName,
          u.Phone,
          u.Email,
          n.Name as NHCName,
          CASE 
            WHEN c.IsEligible = 1 THEN 'Eligible'
            WHEN c.TotalVotes >= 5 THEN 'Eligible'
            ELSE 'Not Eligible (Need ' + CAST(5 - c.TotalVotes AS NVARCHAR(2)) + ' more votes)'
          END AS EligibilityStatus
        FROM Candidates c
        LEFT JOIN Users u ON c.CNIC = u.CNIC
        LEFT JOIN NHC_Zones n ON c.NHC_Id = n.Id
        WHERE c.NHC_Id = @NHC_Id
        ORDER BY c.TotalVotes DESC, c.CreatedDate ASC
      `);
    
    res.json({
      NominationStartDate,
      NominationEndDate,
      Candidates: result.recordset.map(r => ({
        ...r,
        IsEligible: r.IsEligible === 1
      }))
    });
  } catch (err) {
    console.error('❌ Error fetching eligibility results:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (pool) await pool.close();
  }
});

// 2.13 GET ALL CANDIDATES SUMMARY (for admin dashboard)
app.get('/api/candidates/summary', async (req, res) => {
  const nhcId = parseInt(req.query.nhcId, 10);
  if (!nhcId) return res.status(400).json({ error: 'nhcId required' });
  
  let pool;
  try {
    pool = await sql.connect(dbConfig);
    
    const result = await pool.request()
      .input('NHC_Id', sql.Int, nhcId)
      .query(`
        SELECT 
          COUNT(*) as TotalCandidates,
          SUM(CASE WHEN IsEligible = 1 THEN 1 ELSE 0 END) as EligibleCount,
          SUM(CASE WHEN IsEligible = 0 THEN 1 ELSE 0 END) as NotEligibleCount,
          MAX(TotalVotes) as MaxVotes,
          AVG(CAST(TotalVotes AS FLOAT)) as AvgVotes
        FROM Candidates
        WHERE NHC_Id = @NHC_Id AND PanelId IS NOT NULL
      `);
    
    res.json(result.recordset[0] || { TotalCandidates: 0, EligibleCount: 0, NotEligibleCount: 0 });
  } catch (err) {
    console.error('❌ Error fetching candidates summary:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (pool) await pool.close();
  }
});

// 2.14 GET SUPPORT HISTORY (who supported whom during nomination period)
app.get('/api/support-history', async (req, res) => {
  const nhcId = parseInt(req.query.nhcId, 10);
  if (!nhcId) return res.status(400).json({ error: 'nhcId required' });
  
  let pool;
  try {
    pool = await sql.connect(dbConfig);
    
    const result = await pool.request()
      .input('NHC_Id', sql.Int, nhcId)
      .query(`
        SELECT 
          cs.Id as SupportId,
          cs.CandidateId,
          cs.NHC_Id,
          cs.SupporterCNIC,
          cs.NominationEndDate,
          cs.CreatedDate as VoteDate,
          c.CNIC as CandidateCNIC,
          c.Category,
          c.TotalVotes as CandidateTotalVotes,
          c.IsEligible as CandidateIsEligible,
          cu.FirstName as CandidateFirstName,
          cu.LastName as CandidateLastName,
          su.FirstName as SupporterFirstName,
          su.LastName as SupporterLastName,
          su.Phone as SupporterPhone,
          su.Email as SupporterEmail,
          nz.Name as NHCName
        FROM CandidateSupports cs
        INNER JOIN Candidates c ON cs.CandidateId = c.Id
        LEFT JOIN Users cu ON c.CNIC = cu.CNIC
        LEFT JOIN Users su ON cs.SupporterCNIC = su.CNIC
        LEFT JOIN NHC_Zones nz ON cs.NHC_Id = nz.Id
        WHERE cs.NHC_Id = @NHC_Id AND c.PanelId IS NOT NULL
        ORDER BY cs.CreatedDate DESC
      `);
    
    res.json(result.recordset.map(r => ({
      ...r,
      CandidateIsEligible: r.CandidateIsEligible === 1
    })));
  } catch (err) {
    console.error('❌ Error fetching support history:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (pool) await pool.close();
  }
});

// 2.15 GET SUPPORT HISTORY BY CANDIDATE (all supporters for a specific candidate)
app.get('/api/support-history/candidate/:candidateId', async (req, res) => {
  const candidateId = parseInt(req.params.candidateId, 10);
  if (!candidateId) return res.status(400).json({ error: 'candidateId required' });
  
  let pool;
  try {
    pool = await sql.connect(dbConfig);
    
    const result = await pool.request()
      .input('CandidateId', sql.Int, candidateId)
      .query(`
        SELECT 
          cs.Id as SupportId,
          cs.SupporterCNIC,
          cs.NominationEndDate,
          cs.CreatedDate as VoteDate,
          su.FirstName as SupporterFirstName,
          su.LastName as SupporterLastName,
          su.Phone as SupporterPhone,
          su.Email as SupporterEmail,
          su.Address as SupporterAddress,
          c.CNIC as CandidateCNIC,
          c.Category,
          c.TotalVotes,
          c.IsEligible,
          cu.FirstName as CandidateFirstName,
          cu.LastName as CandidateLastName
        FROM CandidateSupports cs
        INNER JOIN Candidates c ON cs.CandidateId = c.Id
        LEFT JOIN Users cu ON c.CNIC = cu.CNIC
        LEFT JOIN Users su ON cs.SupporterCNIC = su.CNIC
        WHERE cs.CandidateId = @CandidateId
        ORDER BY cs.CreatedDate DESC
      `);
    
    res.json({
      CandidateInfo: result.recordset.length > 0 ? {
        CNIC: result.recordset[0].CandidateCNIC,
        Name: (result.recordset[0].CandidateFirstName || '') + ' ' + (result.recordset[0].CandidateLastName || ''),
        Category: result.recordset[0].Category,
        TotalVotes: result.recordset[0].TotalVotes,
        IsEligible: result.recordset[0].IsEligible === 1
      } : null,
      Supporters: result.recordset.map(r => ({
        SupportId: r.SupportId,
        SupporterCNIC: r.SupporterCNIC,
        SupporterName: (r.SupporterFirstName || '') + ' ' + (r.SupporterLastName || ''),
        SupporterPhone: r.SupporterPhone,
        SupporterEmail: r.SupporterEmail,
        VoteDate: r.VoteDate,
        NominationEndDate: r.NominationEndDate
      }))
    });
  } catch (err) {
    console.error('❌ Error fetching candidate supporters:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (pool) await pool.close();
  }
});

// 2.16 GET SUPPORT STATS (statistics about voting during nomination period)
app.get('/api/support-stats', async (req, res) => {
  const nhcId = parseInt(req.query.nhcId, 10);
  if (!nhcId) return res.status(400).json({ error: 'nhcId required' });
  
  let pool;
  try {
    pool = await sql.connect(dbConfig);
    
    const result = await pool.request()
      .input('NHC_Id', sql.Int, nhcId)
      .query(`
        SELECT 
          COUNT(DISTINCT cs.SupporterCNIC) AS TotalVoters,
          COUNT(cs.Id) AS TotalVotesCast,
          COUNT(DISTINCT cs.CandidateId) AS CandidatesReceivingVotes,
          (SELECT COUNT(*) FROM Candidates WHERE NHC_Id = @NHC_Id AND IsEligible = 1) AS EligibleCandidates,
          (SELECT COUNT(*) FROM Candidates WHERE NHC_Id = @NHC_Id) AS TotalCandidates,
          MAX(cs.CreatedDate) AS LastVoteTime,
          MIN(cs.CreatedDate) AS FirstVoteTime
        FROM CandidateSupports cs
        WHERE cs.NHC_Id = @NHC_Id
      `);
    
    res.json(result.recordset[0] || {
      TotalVoters: 0,
      TotalVotesCast: 0,
      CandidatesReceivingVotes: 0,
      EligibleCandidates: 0,
      TotalCandidates: 0
    });
  } catch (err) {
    console.error('❌ Error fetching support stats:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (pool) await pool.close();
  }
});

// 2.17 CAST ELECTION VOTE
app.post('/api/election-vote', async (req, res) => {
  const { electionId, voterCnic, candidateId } = req.body;
  if (!electionId || !voterCnic || !candidateId) {
    return res.status(400).json({ error: 'electionId, voterCnic, and candidateId are required' });
  }

  let pool;
  try {
    pool = await sql.connect(dbConfig);

    // Get election details
    const elRes = await pool.request()
      .input('Id', sql.Int, electionId)
      .query('SELECT NHC_Id, ElectionStartDate, ElectionEndDate FROM Elections WHERE Id = @Id');
    
    if (elRes.recordset.length === 0) {
      return res.status(404).json({ error: 'Election not found' });
    }

    const { NHC_Id: nhcId, ElectionStartDate, ElectionEndDate } = elRes.recordset[0];

    // Prevent voting for yourself: check candidate CNIC
    const candRes = await pool.request()
      .input('Id', sql.Int, candidateId)
      .query('SELECT CNIC FROM Candidates WHERE Id = @Id');
    if (candRes.recordset.length === 0) return res.status(404).json({ error: 'Candidate not found' });
    const candidateCnic = candRes.recordset[0].CNIC;
    if (String(candidateCnic) === String(voterCnic)) {
      return res.status(400).json({ error: 'You cannot vote for yourself' });
    }

    // Check if voting is within the election period (use local date)
    const today = new Date();
    const todayStr = String(today.getFullYear()).padStart(4, '0') + '-' +
                     String(today.getMonth() + 1).padStart(2, '0') + '-' +
                     String(today.getDate()).padStart(2, '0');
    
    let startDateStr, endDateStr;
    if (ElectionStartDate instanceof Date) {
      startDateStr = String(ElectionStartDate.getFullYear()).padStart(4, '0') + '-' +
                     String(ElectionStartDate.getMonth() + 1).padStart(2, '0') + '-' +
                     String(ElectionStartDate.getDate()).padStart(2, '0');
    } else {
      startDateStr = String(ElectionStartDate).split('T')[0];
    }
    
    if (ElectionEndDate instanceof Date) {
      endDateStr = String(ElectionEndDate.getFullYear()).padStart(4, '0') + '-' +
                   String(ElectionEndDate.getMonth() + 1).padStart(2, '0') + '-' +
                   String(ElectionEndDate.getDate()).padStart(2, '0');
    } else {
      endDateStr = String(ElectionEndDate).split('T')[0];
    }

    console.log('DEBUG POST /api/election-vote - Period Check');
    console.log('  Today:', todayStr);
    console.log('  Start Date:', startDateStr);
    console.log('  End Date:', endDateStr);

    if (todayStr < startDateStr || todayStr > endDateStr) {
      return res.status(400).json({ error: 'Voting is not open. Election period: ' + startDateStr + ' to ' + endDateStr });
    }

    // Prevent duplicate vote
    const exist = await pool.request()
      .input('ElectionId', sql.Int, electionId)
      .input('VoterCNIC', sql.NVarChar, voterCnic)
      .query('SELECT * FROM ElectionVotes WHERE ElectionId = @ElectionId AND VoterCNIC = @VoterCNIC');
    
    if (exist.recordset.length > 0) {
      return res.status(400).json({ error: 'You have already voted in this election' });
    }

    // Insert vote
    const result = await pool.request()
      .input('ElectionId', sql.Int, electionId)
      .input('NHC_Id', sql.Int, nhcId)
      .input('VoterCNIC', sql.NVarChar, voterCnic)
      .input('CandidateId', sql.Int, candidateId)
      .input('ElectionEndDate', sql.Date, ElectionEndDate)
      .query('INSERT INTO ElectionVotes (ElectionId, NHC_Id, VoterCNIC, CandidateId, ElectionEndDate) VALUES (@ElectionId, @NHC_Id, @VoterCNIC, @CandidateId, @ElectionEndDate); SELECT SCOPE_IDENTITY() as id');

    const id = result.recordset[0].id;
    console.log('✓ Vote recorded with ID:', id);

    res.status(201).json({ message: 'Vote recorded successfully', id });
  } catch (err) {
    console.error('Vote Error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (pool) await pool.close();
  }
});

// 2.18 GET ELECTION VOTE HISTORY (who voted for whom in an election)
app.get('/api/election-vote-history', async (req, res) => {
  const electionId = parseInt(req.query.electionId, 10);
  if (!electionId) return res.status(400).json({ error: 'electionId required' });
  
  let pool;
  try {
    pool = await sql.connect(dbConfig);
    
    const result = await pool.request()
      .input('ElectionId', sql.Int, electionId)
      .query(`
        SELECT 
          ev.Id as VoteId,
          ev.ElectionId,
          ev.NHC_Id,
          ev.VoterCNIC,
          ev.CandidateId,
          ev.ElectionEndDate,
          ev.CreatedDate as VoteDate,
          c.CNIC as CandidateCNIC,
          c.Category,
          cu.FirstName as CandidateFirstName,
          cu.LastName as CandidateLastName,
          vu.FirstName as VoterFirstName,
          vu.LastName as VoterLastName,
          vu.Phone as VoterPhone,
          vu.Email as VoterEmail,
          nz.Name as NHCName
        FROM ElectionVotes ev
        INNER JOIN Candidates c ON ev.CandidateId = c.Id
        LEFT JOIN Users cu ON c.CNIC = cu.CNIC
        LEFT JOIN Users vu ON ev.VoterCNIC = vu.CNIC
        LEFT JOIN NHC_Zones nz ON ev.NHC_Id = nz.Id
        WHERE ev.ElectionId = @ElectionId
        ORDER BY ev.CreatedDate DESC
      `);
    
    res.json(result.recordset);
  } catch (err) {
    console.error('❌ Error fetching election vote history:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (pool) await pool.close();
  }
});

// 2.19 GET VOTES FOR A CANDIDATE (in an election)
app.get('/api/election-votes/candidate/:candidateId', async (req, res) => {
  const candidateId = parseInt(req.params.candidateId, 10);
  if (!candidateId) return res.status(400).json({ error: 'candidateId required' });
  
  let pool;
  try {
    pool = await sql.connect(dbConfig);
    
    const result = await pool.request()
      .input('CandidateId', sql.Int, candidateId)
      .query(`
        SELECT 
          ev.Id as VoteId,
          ev.VoterCNIC,
          ev.ElectionEndDate,
          ev.CreatedDate as VoteDate,
          c.CNIC as CandidateCNIC,
          c.Category,
          cu.FirstName as CandidateFirstName,
          cu.LastName as CandidateLastName,
          vu.FirstName as VoterFirstName,
          vu.LastName as VoterLastName,
          vu.Phone as VoterPhone,
          vu.Email as VoterEmail,
          vu.Address as VoterAddress
        FROM ElectionVotes ev
        INNER JOIN Candidates c ON ev.CandidateId = c.Id
        LEFT JOIN Users cu ON c.CNIC = cu.CNIC
        LEFT JOIN Users vu ON ev.VoterCNIC = vu.CNIC
        WHERE ev.CandidateId = @CandidateId
        ORDER BY ev.CreatedDate DESC
      `);
    
    const voteCount = result.recordset.length;
    
    res.json({
      CandidateInfo: result.recordset.length > 0 ? {
        CNIC: result.recordset[0].CandidateCNIC,
        Name: (result.recordset[0].CandidateFirstName || '') + ' ' + (result.recordset[0].CandidateLastName || ''),
        Category: result.recordset[0].Category,
        TotalVotesReceived: voteCount
      } : null,
      Voters: result.recordset.map(r => ({
        VoteId: r.VoteId,
        VoterCNIC: r.VoterCNIC,
        VoterName: (r.VoterFirstName || '') + ' ' + (r.VoterLastName || ''),
        VoterPhone: r.VoterPhone,
        VoterEmail: r.VoterEmail,
        VoteDate: r.VoteDate,
        ElectionEndDate: r.ElectionEndDate
      }))
    });
  } catch (err) {
    console.error('❌ Error fetching candidate election votes:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (pool) await pool.close();
  }
});

// 2.20 GET ELECTION VOTING STATISTICS
app.get('/api/election-stats', async (req, res) => {
  // Accept either electionId OR nhcId. If nhcId provided, resolve the latest election for that NHC.
  const electionId = req.query.electionId ? parseInt(req.query.electionId, 10) : null;
  const nhcId = req.query.nhcId ? parseInt(req.query.nhcId, 10) : null;

  if (!electionId && !nhcId) return res.status(400).json({ error: 'electionId or nhcId required' });

  let pool;
  try {
    pool = await sql.connect(dbConfig);

    let resolvedElectionId = electionId;
    let resolvedNhcId = nhcId;

    if (!resolvedElectionId && resolvedNhcId) {
      const el = await pool.request()
        .input('NHC_Id', sql.Int, resolvedNhcId)
        .query('SELECT TOP 1 Id FROM Elections WHERE NHC_Id = @NHC_Id ORDER BY CreatedDate DESC');
      if (el.recordset.length === 0) return res.status(404).json({ error: 'No election found for this NHC' });
      resolvedElectionId = el.recordset[0].Id;
    }

    if (!resolvedNhcId && resolvedElectionId) {
      const el2 = await pool.request()
        .input('Id', sql.Int, resolvedElectionId)
        .query('SELECT NHC_Id FROM Elections WHERE Id = @Id');
      if (el2.recordset.length === 0) return res.status(404).json({ error: 'Election not found' });
      resolvedNhcId = el2.recordset[0].NHC_Id;
    }

    // Check if results are stored in ElectionResults table
    const storedResults = await pool.request()
      .input('ElectionId', sql.Int, resolvedElectionId)
      .query(`
        SELECT * FROM ElectionResults WHERE ElectionId = @ElectionId
      `);

    // If results are stored, fetch from ElectionResults (official final results)
    if (storedResults.recordset.length > 0) {
      // we need panel members so join Candidates for each stored result to retrieve PanelId
      const detailed = [];
      for (const r of storedResults.recordset) {
        const row = { ...r };
        try {
          const mres = await pool.request()
            .input('CandidateId', sql.Int, row.CandidateId)
            .query(`SELECT c.PanelId FROM Candidates c WHERE c.Id = @CandidateId`);
          if (mres.recordset.length > 0 && mres.recordset[0].PanelId) {
            row.PanelId = mres.recordset[0].PanelId;
            const pmres = await pool.request()
              .input('PanelId', sql.Int, row.PanelId)
              .query(`SELECT pm.CNIC, pm.Role, pm.InviteStatus, ISNULL(u.FirstName,'') AS FirstName, ISNULL(u.LastName,'') AS LastName FROM PanelMembers pm LEFT JOIN Users u ON pm.CNIC = u.CNIC WHERE pm.PanelId = @PanelId ORDER BY pm.Role`);
            row.PanelMembers = pmres.recordset || [];
          } else {
            row.PanelMembers = [];
          }
        } catch (e) {
          console.error('Error fetching panel info for candidate', row.CandidateId, e);
          row.PanelMembers = [];
        }
        detailed.push(row);
      }

      const president = detailed.filter(r => r.Category === 'President').map(r => ({ 
        Id: r.CandidateId,
        CNIC: r.CNIC,
        FirstName: r.FirstName,
        LastName: r.LastName,
        Category: r.Category,
        TotalVotes: r.TotalVotes,
        PanelMembers: r.PanelMembers || []
      }));
      const treasurer = detailed.filter(r => r.Category === 'Treasurer').map(r => ({ 
        Id: r.CandidateId,
        CNIC: r.CNIC,
        FirstName: r.FirstName,
        LastName: r.LastName,
        Category: r.Category,
        TotalVotes: r.TotalVotes,
        PanelMembers: r.PanelMembers || []
      }));

      console.log("✓ Fetched finalized results from ElectionResults table for ElectionId:", resolvedElectionId);
      return res.json({ president, treasurer });
    }

    // Fallback: Calculate from ElectionVotes in real-time (for ongoing or incomplete elections)
    // IMPORTANT: Only include candidates from the LATEST nomination period using NominationId
    const latestNomRes = await pool.request()
      .input('NHC_Id', sql.Int, resolvedNhcId)
      .query(`SELECT TOP 1 Id FROM Nominations WHERE NHC_Id = @NHC_Id ORDER BY CreatedDate DESC`);
    
    const latestNominationId = latestNomRes.recordset.length > 0 ? latestNomRes.recordset[0].Id : null;
    
    const candidatesRes = await pool.request()
      .input('ElectionId', sql.Int, resolvedElectionId)
      .input('NHC_Id', sql.Int, resolvedNhcId)
      .input('NominationId', sql.Int, latestNominationId)
      .query(`
        SELECT 
          c.Id,
          c.CNIC,
          c.PanelId,
          ISNULL(u.FirstName, '') AS FirstName,
          ISNULL(u.LastName, '') AS LastName,
          c.Category,
          ISNULL(v.TotalVotes, 0) AS TotalVotes
        FROM Candidates c
        LEFT JOIN Users u ON c.CNIC = u.CNIC
        LEFT JOIN (
          SELECT CandidateId, COUNT(*) AS TotalVotes FROM ElectionVotes WHERE ElectionId = @ElectionId GROUP BY CandidateId
        ) v ON v.CandidateId = c.Id
        WHERE c.NHC_Id = @NHC_Id AND c.IsEligible = 1
          AND (@NominationId IS NULL OR c.NominationId = @NominationId)
        ORDER BY c.Category ASC, ISNULL(v.TotalVotes, 0) DESC, c.CreatedDate ASC
      `);

    // when computing realtime stats, the query should already include PanelId
    const enriched = await Promise.all(candidatesRes.recordset.map(async r => {
      const obj = { ...r, PanelMembers: [] };
      if (r.PanelId) {
        try {
          const pmres = await pool.request()
            .input('PanelId', sql.Int, r.PanelId)
            .query(`SELECT pm.CNIC, pm.Role, pm.InviteStatus, ISNULL(u.FirstName,'') AS FirstName, ISNULL(u.LastName,'') AS LastName FROM PanelMembers pm LEFT JOIN Users u ON pm.CNIC = u.CNIC WHERE pm.PanelId = @PanelId ORDER BY pm.Role`);
          obj.PanelMembers = pmres.recordset || [];
        } catch (e) {
          console.error('Failed to load panel members for realtime stats PanelId', r.PanelId, e);
        }
      }
      return obj;
    }));
    const president = enriched.filter(r => r.Category === 'President').map(r => ({ ...r }));
    const treasurer = enriched.filter(r => r.Category === 'Treasurer').map(r => ({ ...r }));

    console.log("✓ Calculated real-time stats from ElectionVotes for ElectionId:", resolvedElectionId);
    res.json({ president, treasurer });
  } catch (err) {
    console.error('❌ Error fetching election stats:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (pool) await pool.close();
  }
});

// --- POSITIONS: GET / POST ---
app.get('/api/positions', async (req, res) => {
  console.log('GET /api/positions called...');
  let pool;
  try {
    pool = await sql.connect(dbConfig);
    const result = await pool.request().query('SELECT Id, Name, CreatedDate FROM Positions ORDER BY Id');
    res.json(result.recordset);
  } catch (err) {
    console.error('❌ Error fetching positions:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (pool) await pool.close();
  }
});

app.post('/api/positions', async (req, res) => {
  console.log('POST /api/positions called...');
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Position name is required' });
  let pool;
  try {
    pool = await sql.connect(dbConfig);
    // Check if exists
    const exists = await pool.request().input('Name', sql.NVarChar, name.trim()).query('SELECT Id FROM Positions WHERE Name = @Name');
    if (exists.recordset.length > 0) return res.status(409).json({ error: 'Position already exists' });

    const insert = await pool.request().input('Name', sql.NVarChar, name.trim()).query("INSERT INTO Positions (Name) VALUES (@Name); SELECT SCOPE_IDENTITY() as id");
    const id = insert.recordset[0].id;
    res.status(201).json({ id, name: name.trim() });
  } catch (err) {
    console.error('❌ Error creating position:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (pool) await pool.close();
  }
});

// --- PROFILE PICTURE UPLOAD ---
app.post('/api/upload-profile-pic', upload.single('profilePic'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileUrl = `http://localhost:3001/profile-pictures/${req.file.filename}`;
    const cnic = req.body.cnic;

    if (cnic) {
      let pool;
      try {
        pool = await sql.connect(dbConfig);
        await pool.request()
          .input('CNIC', sql.NVarChar, cnic)
          .input('ProfileImage', sql.NVarChar, fileUrl)
          .query('UPDATE Users SET ProfileImage = @ProfileImage WHERE CNIC = @CNIC');
      } finally {
        if (pool) await pool.close();
      }
    }

    res.json({ 
      message: 'Profile picture uploaded successfully',
      fileUrl: fileUrl,
      filename: req.file.filename
    });
  } catch (err) {
    console.error('❌ Error uploading profile picture:', err);
    res.status(500).json({ error: err.message });
  }
});

// get available members by NHC code (used in complaint form)
app.get('/api/nhc-members-by-code/:nhcCode', async (req, res) => {
  const nhcCode = String(req.params.nhcCode || '').trim();
  if (!nhcCode) return res.status(400).json({ error: 'NHC code required' });

  let pool;
  try {
    pool = await sql.connect(dbConfig);
    const result = await pool.request()
      .input('NHC_Code', sql.NVarChar, nhcCode)
      .query(`
        SELECT u.Id, u.FirstName, u.LastName, u.CNIC, u.Email, u.Phone
        FROM Users u
        INNER JOIN UserNHCs m ON u.CNIC = m.UserCNIC
        WHERE m.NHC_Code = @NHC_Code
        ORDER BY u.FirstName, u.LastName
      `);
    res.json(result.recordset || []);
  } catch (err) {
    console.error('Fetch NHC members by code error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (pool) await pool.close();
  }
});