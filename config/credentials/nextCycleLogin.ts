import { EnvName } from '../env';
import { MemberCredential } from './types';

export interface NextCycleCredentials {
  member1: MemberCredential;
  member2: MemberCredential;
  member3: MemberCredential;
}

export type NextCycleCredentialsByEnv = Partial<Record<EnvName, NextCycleCredentials>>;

// Login for the Next Cycle Setup test group of the selected TEST_ENV. The values live in
// config/credentials/nextCycle.ts (gitignored — copy nextCycle.example.ts); loaded lazily so a
// missing file only affects the next-cycle spec, never the other suites.
export function loadNextCycleCredentials(): NextCycleCredentials {
  const env = (process.env.TEST_ENV ?? 'stage') as EnvName;
  let byEnv: NextCycleCredentialsByEnv;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    byEnv = require('./nextCycle').nextCycleCredentials as NextCycleCredentialsByEnv;
  } catch {
    throw new Error(
      'Next Cycle Setup credentials missing: copy config/credentials/nextCycle.example.ts to ' +
      'config/credentials/nextCycle.ts and fill it in.',
    );
  }
  const credentials = byEnv[env];
  if (!credentials) {
    throw new Error(`No Next Cycle Setup credentials for TEST_ENV="${env}" in config/credentials/nextCycle.ts`);
  }
  return credentials;
}
