// New-cycle group creation data: a first-ever cycle that has not started yet.
// Differences from the mid-cycle data (testData / testData6):
//   - "This is our first cycle" + "We are starting a new cycle" (no previous cycles, no meeting
//     number, no opening Loan/Social fund balances)
//   - the cycle starts today and shares out at least 3 months later
//   - 5 members, each with an initial investment only (no existing loans or unpaid fines)
// Names, group name and dates are generated per run so every run is independent.

import { PARTNER } from '../config/env';
import type { MemberData, OfficerAssignment } from './testData';

const FEMALE_FIRST_NAMES = ['Amara', 'Chisomo', 'Dalitso', 'Esther', 'Fatuma', 'Grace', 'Hannah', 'Ivy', 'Joyce', 'Lena'];
const MALE_FIRST_NAMES   = ['Bwalya', 'Chanda', 'Derick', 'Elias', 'Felix', 'George', 'Henry', 'Isaac', 'James', 'Kevin'];
const LAST_NAMES = ['Banda', 'Mwale', 'Phiri', 'Zulu', 'Lungu', 'Mutale', 'Tembo', 'Mbewe', 'Sakala', 'Ngoma', 'Musonda', 'Mulenga'];

const pickUnique = <T>(pool: T[], count: number): T[] => [...pool].sort(() => Math.random() - 0.5).slice(0, count);
const formatDate = (d: Date): string =>
  [String(d.getDate()).padStart(2, '0'), String(d.getMonth() + 1).padStart(2, '0'), d.getFullYear()].join('/');

// Starts today; shares out on the first same weekday at least 3 months later, so the meeting
// day always matches both dates.
function generateSchedule(): { startDate: string; shareOutDate: string; meetingDay: string } {
  const DAYS  = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const threeMonths = new Date(start.getFullYear(), start.getMonth() + 3, start.getDate());
  const diff = (start.getDay() - threeMonths.getDay() + 7) % 7;
  const shareOut = new Date(threeMonths.getFullYear(), threeMonths.getMonth(), threeMonths.getDate() + diff);
  return { startDate: formatDate(start), shareOutDate: formatDate(shareOut), meetingDay: DAYS[start.getDay()] };
}

const names = [
  ...pickUnique(FEMALE_FIRST_NAMES, 3).map(firstName => ({ firstName, gender: 'Female' })),
  ...pickUnique(MALE_FIRST_NAMES, 2).map(firstName => ({ firstName, gender: 'Male' })),
];
const lastNames = pickUnique(LAST_NAMES, names.length);
const schedule  = generateSchedule();

// Fixed profile details, one entry per member.
const PROFILES = [
  { maritalStatus: 'Married',  educationLevel: 'Secondary', dateOfBirth: '01/01/1990', adultsInFamily: '2', dependents: '2' },
  { maritalStatus: 'Single',   educationLevel: 'Primary',   dateOfBirth: '15/06/1988', adultsInFamily: '1', dependents: '0' },
  { maritalStatus: 'Widowed',  educationLevel: 'None',      dateOfBirth: '20/03/1975', adultsInFamily: '1', dependents: '3' },
  { maritalStatus: 'Married',  educationLevel: 'Tertiary',  dateOfBirth: '08/09/1985', adultsInFamily: '2', dependents: '1' },
  { maritalStatus: 'Single',   educationLevel: 'Secondary', dateOfBirth: '30/11/1993', adultsInFamily: '1', dependents: '1' },
];
const GOAL_CATEGORIES = ['Education', 'Business', 'Education', 'Business', 'Education'];

const members: MemberData[] = names.map((n, i) => ({
  firstName: n.firstName,
  lastName:  lastNames[i],
  gender:    n.gender,
  ...PROFILES[i],
  mobileNumber: `097100010${i + 1}`,
  passcode: '11111',
  shares: 5, // initial investment: 5 shares × share price
  savingsGoal: { category: GOAL_CATEGORIES[i], targetAmount: '50000' },
}));

export const testDataNewCycle = {
  language: 'English',
  country:  'Zambia',

  group: {
    name: `Agent_NC_${Date.now().toString().slice(-5)}`,
    type: 'Real Group',
    location: 'Zambia',
  },

  partner: { worksWithNgo: true, id: PARTNER.id, name: PARTNER.name },

  cycle: { startDate: schedule.startDate, shareOutDate: schedule.shareOutDate },

  financialRules: {
    sharePriceZmw: '2000',
    loanInterestRate: '10',
    loanInterestType: 'One-time added',
    loanTermMonths: '3',
    requiresCoSigners: false,
    fineIncomeRouting: 'Loan Fund',
    smsReceiptsEnabled: true,
    meetingFrequency: 'Weekly',
    meetingDay: schedule.meetingDay,
  },

  members,

  officers: [
    { title: 'Chairperson', memberIndex: 0 },
    { title: 'Secretary',   memberIndex: 2 },
    { title: 'Director',    memberIndex: 1 },
    { title: 'Treasurer',   memberIndex: 3 },
  ] as OfficerAssignment[],

  bookkeeperMemberIndex: 0,
};
