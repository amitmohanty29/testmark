# MarkSure ⚖️

**Government OIML R-76 Test Report & Digital Passport System for Non-Automatic Weighing Instruments (NAWI)**

MarkSure is an end-to-end digital metrology compliance and evaluation platform built according to the international standard **OIML R 76-1 (Edition 2006)**. It digitizes the testing, verification, auditing, and certification workflow for legal metrology authorities, accredited testing laboratories, and manufacturers.

---

## 🌟 Key Features & USPs

### 1. 🔍 USP 1 — "What Changed?" Report Version Comparison
- **Immutable Versioning**: Finalized test reports are never mutated in place. Revisions generate linked versions (`ReportVersion`) with reasons for revision, timestamps, and cryptographic SHA-256 seals.
- **Deep Metrology Diff Engine**: Field-by-field canonical differential analysis covering:
  - Instrument parameters & ambient conditions
  - Every individual test trial (Weighing Performance, Repeatability, Eccentricity, Tare)
  - Raw calculations ($E$, $E_c$, $MPE$) and compliance verdicts
- **Differential Audit View**: Interactive red/green side-by-side comparison modal pinpointing exact modified parameters and highlighting critical verdict flips (e.g., `PASS` → `FAIL`).

### 2. 🧪 USP 2 — Rule Impact Simulator (Regulatory Sandboxing)
- **Draft Rule Configurations**: Regulators can formulate candidate rules, custom MPE multipliers, and repeatability factors without altering active legal standards.
- **Historical Batch Re-testing**: Re-runs candidate rules against historical verification datasets in a strictly read-only sandbox.
- **Impact Assessment**: Visualizes before/after compliance shifts, pass rate differentials, and verdict changes.
- **Safe Export**: PDF and CSV reports watermarked and stamped: *"Simulation Only — Not a Legal Record"*.

### 3. Core Metrology Engines
- **OIML R-76 Compliant Verification Engine**:
  - **Weighing Performance Test**: Automatic Maximum Permissible Error (MPE) evaluation based on accuracy class (Class I, II, III, IIII) and verification scale intervals ($e$).
  - **Repeatability Test**: Multi-series standard deviation and range evaluations under identical test loads.
  - **Eccentricity (Corner Load) Test**: Validation across quadrants/bearing positions.
  - **Tare Evaluation**: Verification of additive and subtractive tare influences and zero-setting capabilities.
- **Explainability & "Show Me Why"**: Mathematical breakdowns comparing observed errors against theoretical tolerances ($m$, $e$, $E$, $E_c$, $MPE$).
- **Digital Instrument Passports**: Tamper-evident lifecycle tracking for legal metrology instruments, including calibration history, pattern approval numbers, and verification statuses.

---

## 🏗️ Architecture & Tech Stack

- **Client**: React 18, TypeScript, Tailwind CSS, Lucide Icons, Vite (Port `5173`)
- **Server**: Node.js, Express, TypeScript, Multer, PDFKit, QRCode (Port `5001`)
- **Database & ORM**: Prisma ORM with SQLite (zero-config local `marksure.db`)
- **Engines**: Deterministic metrology engines (`metrologyDiffEngine.ts`, `ruleSimulationEngine.ts`, `calculationEngine.ts`, `complianceEngine.ts`)

---

## ⚡ Quick Start (Local Device)

### Option A: One-Click Launch (Windows)

1. **First-time setup** (installs dependencies, configures `.env`, syncs database, and seeds demo data):
   ```cmd
   setup.bat
   ```
   *(or `.\setup.ps1` in PowerShell)*

2. **Start the application**:
   ```cmd
   start.bat
   ```
   *(or `.\start.ps1` in PowerShell)*

This automatically starts the backend server, the frontend client, and opens `http://localhost:5173` in your default browser.

---

### Option B: Manual Setup

1. **Install dependencies**:
   ```bash
   npm run install:all
   ```

2. **Configure Environment**:
   Ensure `server/.env` exists (default uses SQLite):
   ```ini
   DATABASE_URL="file:./marksure.db"
   PORT=5001
   CLIENT_URL="http://localhost:5173"
   JWT_SECRET="marksure_oiml_r76_secure_key_2026"
   ```

3. **Initialize Database & Seed Data**:
   ```bash
   cd server
   npx prisma db push
   npx tsx src/seed.ts
   cd ..
   ```

4. **Launch Development Servers**:
   ```bash
   npm run dev
   ```
   - Client Portal: [http://localhost:5173](http://localhost:5173)
   - Server API: [http://localhost:5001](http://localhost:5001)

---

## 🔐 Default Demo Accounts

| Role | Email | Password | Access Scope |
|---|---|---|---|
| **System Admin** | `admin@marksure.gov.in` | `Pass@123` | Full access, Rule Simulator, Revisions, Labs, Audit Logs |
| **Reviewing Officer** | `officer.review@marksure.gov.in` | `Pass@123` | Finalize reports, approve revisions, audit evaluations |
| **Testing Officer** | `officer.test@marksure.gov.in` | `Pass@123` | Digital test workspace, enter observations, create reports |

---

## 📜 Verification & Audit Endpoints

- **Digital Passport**: `/passport/:instrumentId`
- **Reports & Diff Comparison**: `/reports/:reportId`
- **Rule Impact Simulator**: `/simulator`
- **Integrity Verification**: `/verify` or via scanned QR code on PDF certificate

---

## 📜 License

This project is licensed under the MIT License.
