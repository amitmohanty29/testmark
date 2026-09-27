import crypto from 'crypto';

export function generateReportHash(reportData: string): string {
  return crypto.createHash('sha256').update(reportData, 'utf8').digest('hex');
}

export function verifyReportIntegrity(reportData: string, storedHash: string): boolean {
  const computedHash = generateReportHash(reportData);
  return crypto.timingSafeEqual(
    Buffer.from(computedHash, 'hex'),
    Buffer.from(storedHash, 'hex')
  );
}
