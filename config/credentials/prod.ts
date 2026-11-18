import { LoginCredentials } from './types';

// Never commit real production credentials — supply them through the DS_MEMBER* environment variables.
export const prodCredentials: LoginCredentials = {
  country:     'Zambia',
  groupName:   '',
  groupNumber: '',
  members:     [],
  chairperson: '',
  member1: { dreamId: '', passcode: '' },
  member2: { dreamId: '', passcode: '' },
  member3: { dreamId: '', passcode: '' },
};
