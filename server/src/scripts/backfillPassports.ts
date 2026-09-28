import { PassportService } from '../engine/passportService';

async function run() {
  console.log('Starting one-time Instrument Digital Passport migration and backfill...');
  try {
    const result = await PassportService.backfillPassports();
    console.log('Migration completed successfully:');
    console.log(`- Passports created: ${result.passportsCreated}`);
    console.log(`- Events backfilled: ${result.eventsCreated}`);
    console.log(`- Records linked: ${result.recordsLinked}`);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

run();
