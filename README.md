# MarkSure ⚖️

**Government OIML R-76 Test Report & Digital Passport System for Non-Automatic Weighing Instruments (NAWI)**

MarkSure is an end-to-end digital metrology compliance and evaluation platform built according to the international standard **OIML R 76-1 (Edition 2006)**. It digitizes the testing, verification, auditing, and certification workflow for legal metrology authorities, accredited testing laboratories, and manufacturers.

---

## 🌟 Key Features

- **OIML R-76 Compliant Verification Engine**:
  - **Weighing Performance Test**: Automatic Maximum Permissible Error (MPE) evaluation based on accuracy class (Class I, II, III, IIII) and load intervals (`e`).
  - **Repeatability Test**: Multi-series standard deviation and range evaluations under identical test loads.
  - **Eccentricity (Corner Load) Test**: Validation across quadrants/bearing positions.
  - **Tare Evaluation**: Verification of additive and subtractive tare influences and zero-setting capabilities.
- **Explainability & "Show Me Why"**: Clear mathematical breakdowns comparing observed errors against theoretical tolerances ($m$, $e$, $E$, $E_c$, $MPE$).
- **Digital Instrument Passports**: Tamper-evident lifecycle tracking for legal metrology instruments, including calibration history, pattern approval numbers, and verification statuses.
- **Role-Based Workflow**:
  - **Testing Officers**: Input real-time test observations, environmental conditions, and evidence attachments.
  - **Reviewing Officers**: Audit evaluations, inspect deviation graphs, and certify or request revisions.
  - **Administrators**: Manage laboratories, accredited testing standards, and user assignments.
- **Evidence Management**: Secure attachment uploads for physical test bench photos, calibration sheets, and calibration weights certificates.

---

## 🏗️ Architecture & Tech Stack

- **Client**: React 18, TypeScript, Tailwind CSS, Lucide Icons, Vite
- **Server**: Node.js, Express, TypeScript, Multer
- **Database & ORM**: Prisma ORM with SQLite (zero-config local) & PostgreSQL support
- **Engines**: Dedicated deterministic metrology calculation and compliance engines (`calculationEngine.ts`, `complianceEngine.ts`, `validationEngine.ts`)

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

### Installation

1. **Clone repository**:
   ```bash
   git clone https://github.com/harshitraj006/MarkSure.git
   cd MarkSure
   ```

2. **Install all dependencies**:
   ```bash
   npm run install:all
   ```

3. **Environment Setup**:
   Create a `.env` file in `server/`:
   ```bash
   cp server/.env.example server/.env
   ```

4. **Initialize & Seed Database**:
   ```bash
   npm run seed
   ```

5. **Run the Development Server**:
   ```bash
   npm run dev
   ```
   - Client runs on: `http://localhost:5173`
   - Server runs on: `http://localhost:5001`

---

## 🔐 Default Demo Credentials

| Role | Email | Password |
|---|---|---|
| **Testing Officer** | `officer.test@marksure.gov.in` | `Pass@123` |
| **Reviewing Officer** | `officer.review@marksure.gov.in` | `Pass@123` |
| **Admin** | `admin@marksure.gov.in` | `Pass@123` |

---

## 📜 License

This project is licensed under the MIT License.
