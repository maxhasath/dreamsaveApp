import { EnvName } from '../env';
import { LoginCredentials } from './types';
import { devCredentials }   from './dev';
import { stageCredentials } from './stage';
import { qaCredentials }    from './qa';
import { prodCredentials }  from './prod';

const BY_ENV: Record<EnvName, LoginCredentials> = {
  dev: devCredentials, stage: stageCredentials, qa: qaCredentials, prod: prodCredentials,
};

// DS_MEMBER<1-3>_DREAM_ID / DS_MEMBER<1-3>_PASSCODE override the file values (e.g. CI secrets).
const fromEnv = (name: string, fallback: string): string => process.env[name] ?? fallback;

const base = BY_ENV[(process.env.TEST_ENV ?? 'stage') as EnvName];

export const credentials: LoginCredentials = {
  ...base,
  member1: { dreamId: fromEnv('DS_MEMBER1_DREAM_ID', base.member1.dreamId), passcode: fromEnv('DS_MEMBER1_PASSCODE', base.member1.passcode) },
  member2: { dreamId: fromEnv('DS_MEMBER2_DREAM_ID', base.member2.dreamId), passcode: fromEnv('DS_MEMBER2_PASSCODE', base.member2.passcode) },
  member3: { dreamId: fromEnv('DS_MEMBER3_DREAM_ID', base.member3.dreamId), passcode: fromEnv('DS_MEMBER3_PASSCODE', base.member3.passcode) },
};
