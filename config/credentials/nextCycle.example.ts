// Template — copy to nextCycle.ts (gitignored) and fill in the Next Cycle Setup test-group logins
// for each environment you run (stage | qa | dev | prod).
import { NextCycleCredentialsByEnv } from './nextCycleLogin';

export const nextCycleCredentials: NextCycleCredentialsByEnv = {
  stage: {
    member1: { dreamId: '<dream id>', passcode: '<passcode>' },
    member2: { dreamId: '<dream id>', passcode: '<passcode>' },
    member3: { dreamId: '<dream id>', passcode: '<passcode>' },
  },
};
