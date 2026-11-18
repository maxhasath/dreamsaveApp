import { LoginCredentials } from './types';

// Prod QA test group; DS_MEMBER* environment variables still override these values.
export const prodCredentials: LoginCredentials = {
  country:     'Zambia',
  groupName:   'Agent_26286 Valnarability',
  groupNumber: '',
  members:     ['Chanda Phiri', 'Derick Mwale', 'George Lungu', 'Grace Mbewe', 'Hannah Sakala', 'Ivy Banda', 'Kevin Mulenga', 'Lena Zulu'],
  chairperson: 'Chanda Phiri', // confirm on first full run
  member1: { dreamId: '502700200', passcode: '11111' },
  member2: { dreamId: '502700195', passcode: '11111' },
  member3: { dreamId: '502700194', passcode: '11111' },
};
