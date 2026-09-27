import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../prisma';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'marksure_oiml_r76_secure_key_2026';

// Login route
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Official email and password are required.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid official credentials or user not registered in Legal Metrology directory.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid official credentials.' });
      return;
    }

    const payload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      designation: user.designation,
      department: user.department,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });

    res.json({
      message: 'Authentication successful',
      token,
      user: payload,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server authentication error.' });
  }
});

// Current user profile
router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        designation: true,
        department: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'Official record not found.' });
      return;
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve profile.' });
  }
});

// List officers for assignment (Testing Officers and Reviewing Officers)
router.get('/officers', authenticateToken, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const officers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        designation: true,
        department: true,
      },
      orderBy: { name: 'asc' },
    });
    res.json({ officers });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list officers.' });
  }
});

export default router;
