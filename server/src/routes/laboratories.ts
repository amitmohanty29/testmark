import { Router, Response } from 'express';
import prisma from '../prisma';
import { authenticateToken, requireRoles, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Get all laboratories
router.get('/', authenticateToken, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const laboratories = await prisma.laboratory.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    res.json({ laboratories });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve laboratories.' });
  }
});

// Create new laboratory (Admin only)
router.post('/', authenticateToken, requireRoles(['ADMIN']), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { code, name, address, accreditationNumber, contactEmail, contactPhone } = req.body;

    if (!code || !name || !address || !accreditationNumber) {
      res.status(400).json({ error: 'Lab code, name, address, and accreditation number are mandatory.' });
      return;
    }

    const lab = await prisma.laboratory.create({
      data: {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        address: address.trim(),
        accreditationNumber: accreditationNumber.trim(),
        contactEmail: contactEmail?.trim(),
        contactPhone: contactPhone?.trim(),
      },
    });

    res.status(201).json({ laboratory: lab, message: 'Laboratory registered successfully.' });
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'A laboratory with this code already exists.' });
      return;
    }
    res.status(500).json({ error: 'Failed to create laboratory.' });
  }
});

export default router;
