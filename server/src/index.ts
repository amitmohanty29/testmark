import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import authRoutes from './routes/auth';
import laboratoryRoutes from './routes/laboratories';
import instrumentRoutes from './routes/instruments';
import evaluationRoutes from './routes/evaluations';
import testRoutes from './routes/tests';
import reportRoutes from './routes/reports';
import searchRoutes from './routes/search';
import auditRoutes from './routes/audit';
import ruleConfigRoutes from './routes/ruleConfig';
import simulatorRoutes from './routes/simulator';
import prisma from './prisma';

const app = express();
const PORT = process.env.PORT || 5001;

// CORS setup
app.use(
  cors({
    origin: '*',
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Serve uploaded documents
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Health check
app.get('/api/health', async (_req, res) => {
  try {
    const userCount = await prisma.user.count();
    res.json({
      status: 'HEALTHY',
      service: 'MarkSure OIML R-76 Core API',
      timestamp: new Date().toISOString(),
      databaseConnected: true,
      stats: { registeredOfficers: userCount },
    });
  } catch (error) {
    res.status(500).json({ status: 'DEGRADED', error: 'Database connection failed' });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/laboratories', laboratoryRoutes);
app.use('/api/instruments', instrumentRoutes);
app.use('/api/evaluations', testRoutes);
app.use('/api/evaluations', evaluationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/rule-configs', ruleConfigRoutes);
app.use('/api/simulator', simulatorRoutes);

// Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error in MarkSure Metrology Engine',
  });
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🇮🇳 MarkSure Government Metrology Backend running`);
  console.log(`Port: ${PORT}`);
  console.log(`OIML R-76 Compliant Testing & Digital Passport System`);
  console.log(`====================================================`);
});
