import { Router, Response } from 'express';
import prisma from '../prisma';
import { authenticateToken, requireRoles, AuthenticatedRequest } from '../middleware/auth';
import { OIML_R76_CLASSES, VERIFICATION_MULTIPLIERS } from '../engine/oimlR76Config';

const router = Router();

// List all rule configurations
router.get('/', authenticateToken, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const configs = await prisma.ruleConfiguration.findMany({
      orderBy: { createdAt: 'desc' },
    });
    const formatted = configs.map(c => ({
      ...c,
      configuration: JSON.parse(c.configuration),
    }));
    res.json({ ruleConfigs: formatted });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch rule configurations.' });
  }
});

// Get single rule config
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const config = await prisma.ruleConfiguration.findUnique({ where: { id: req.params.id } });
    if (!config) { res.status(404).json({ error: 'Rule configuration not found.' }); return; }
    res.json({ ruleConfig: { ...config, configuration: JSON.parse(config.configuration) } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch rule configuration.' });
  }
});

// Create new rule configuration (Admin only)
router.post('/', authenticateToken, requireRoles(['ADMIN']),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { version, name, description, standardRef, configuration, isDraft } = req.body;

      if (!version || !name || !configuration) {
        res.status(400).json({ error: 'Version, name, and configuration are required.' });
        return;
      }

      const config = await prisma.ruleConfiguration.create({
        data: {
          version,
          name,
          description: description || null,
          standardRef: standardRef || 'OIML R 76-1 (Edition 2006)',
          configuration: JSON.stringify(configuration),
          isActive: !isDraft,
          isDraft: isDraft || false,
        },
      });

      res.status(201).json({ ruleConfig: { ...config, configuration: JSON.parse(config.configuration) } });
    } catch (error: any) {
      if (error.code === 'P2002') {
        res.status(400).json({ error: 'A rule configuration with this version already exists.' });
        return;
      }
      res.status(500).json({ error: 'Failed to create rule configuration.' });
    }
  }
);

// Update rule configuration
router.put('/:id', authenticateToken, requireRoles(['ADMIN']),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { name, description, configuration, isActive, isDraft } = req.body;

      const existing = await prisma.ruleConfiguration.findUnique({ where: { id: req.params.id } });
      if (!existing) { res.status(404).json({ error: 'Rule configuration not found.' }); return; }

      const updated = await prisma.ruleConfiguration.update({
        where: { id: req.params.id },
        data: {
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
          ...(configuration !== undefined && { configuration: JSON.stringify(configuration) }),
          ...(isActive !== undefined && { isActive }),
          ...(isDraft !== undefined && { isDraft }),
        },
      });

      res.json({ ruleConfig: { ...updated, configuration: JSON.parse(updated.configuration) } });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update rule configuration.' });
    }
  }
);

// Get the default/current active rule config (used for MPE reference)
router.get('/active/current', authenticateToken, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const config = await prisma.ruleConfiguration.findFirst({
      where: { isActive: true, isDraft: false },
      orderBy: { createdAt: 'desc' },
    });

    if (!config) {
      // Return hardcoded default
      res.json({
        ruleConfig: {
          version: 'OIML-R76-2006-v1.0',
          name: 'OIML R 76-1:2006 Default',
          standardRef: 'OIML R 76-1 (Edition 2006)',
          configuration: {
            classes: OIML_R76_CLASSES,
            verificationMultipliers: VERIFICATION_MULTIPLIERS,
          },
          isActive: true,
          isDraft: false,
        },
      });
      return;
    }

    res.json({ ruleConfig: { ...config, configuration: JSON.parse(config.configuration) } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch active rule configuration.' });
  }
});

export default router;
