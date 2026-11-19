import { EnvName } from '../env';
import { LoginCredentials } from './types';

// Real credentials live in config/credentials/<env>.ts, which is gitignored. Copy
// <env>.example.ts to <env>.ts and fill it in — or set the DS_MEMBER* variables below.
function loadFile(env: EnvName): LoginCredentials {
  try {
    // Loaded lazily so only the selected environment's file has to exist.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require(`./${env}`);
    return mod[`${env}Credentials`] as LoginCredentials;
  } catch {
    throw new Error(
      `No credentials for TEST_ENV="${env}": copy config/credentials/${env}.example.ts to ` +
      `config/credentials/${env}.ts and fill it in (or set the DS_MEMBER* environment variables).`,
    );
  }
}

// DS_MEMBER<1-3>_DREAM_ID / DS_MEMBER<1-3>_PASSCODE override the file values (e.g. CI secrets).
const fromEnv = (name: string, fallback: string): string => process.env[name] ?? fallback;

const base = loadFile((process.env.TEST_ENV ?? 'stage') as EnvName);

export const credentials: LoginCredentials = {
  ...base,
  member1: { dreamId: fromEnv('DS_MEMBER1_DREAM_ID', base.member1.dreamId), passcode: fromEnv('DS_MEMBER1_PASSCODE', base.member1.passcode) },
  member2: { dreamId: fromEnv('DS_MEMBER2_DREAM_ID', base.member2.dreamId), passcode: fromEnv('DS_MEMBER2_PASSCODE', base.member2.passcode) },
  member3: { dreamId: fromEnv('DS_MEMBER3_DREAM_ID', base.member3.dreamId), passcode: fromEnv('DS_MEMBER3_PASSCODE', base.member3.passcode) },
};
