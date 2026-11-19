// Template — copy to qa.ts (gitignored) and fill in the real test-group credentials.
import { LoginCredentials } from './types';

export const qaCredentials: LoginCredentials = {
  country:     'Zambia',
  groupName:   '<group name shown on the Dashboard>',
  groupNumber: '<group number>',
  member1: { dreamId: '<dream id>', passcode: '<passcode>' },
  member2: { dreamId: '<dream id>', passcode: '<passcode>' },
  member3: { dreamId: '<dream id>', passcode: '<passcode>' },
};
