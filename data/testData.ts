// Test data derived strictly from Workflow_Steps.md (gemini-code-1792916146057.md).
// Do not add or change values here without cross-referencing the source-of-truth file.

const VILLAGE_NAMES = [
  'Sunrise', 'Riverside', 'Mango', 'Baobab', 'Harmony',
  'Meadow', 'Savanna', 'Copper', 'Maize', 'Unity',
  'Kafue', 'Lusaka', 'Kitwe', 'Ndola', 'Chipata',
];

const FEMALE_FIRST_NAMES = [
  'Amara', 'Chisomo', 'Dalitso', 'Esther', 'Fatuma',
  'Grace', 'Hannah', 'Ivy', 'Joyce', 'Lena',
];
const MALE_FIRST_NAMES = [
  'Bwalya', 'Chanda', 'Derick', 'Elias', 'Felix',
  'George', 'Henry', 'Isaac', 'James', 'Kevin',
];
const LAST_NAMES = [
  'Banda', 'Mwale', 'Phiri', 'Zulu', 'Lungu',
  'Mutale', 'Tembo', 'Mbewe', 'Sakala', 'Ngoma', 'Musonda', 'Mulenga',
];

function pickUnique<T>(pool: T[], count: number): T[] {
  return [...pool].sort(() => Math.random() - 0.5).slice(0, count);
}

function generateGroupName(): string {
  const name = VILLAGE_NAMES[Math.floor(Math.random() * VILLAGE_NAMES.length)];
  return `Village ${name}`;
}

// Generates 6 unique name pairs. Gender pattern: Female, Male, Female, Male, Female, Male.
// Matches the gender field assigned to each member slot in the members array below.
function generateMemberNames(): Array<{ firstName: string; lastName: string }> {
  const femaleFirsts = pickUnique(FEMALE_FIRST_NAMES, 3);
  const maleFirsts   = pickUnique(MALE_FIRST_NAMES, 3);
  const lasts        = pickUnique(LAST_NAMES, 6);
  return [
    { firstName: femaleFirsts[0], lastName: lasts[0] },
    { firstName: maleFirsts[0],   lastName: lasts[1] },
    { firstName: femaleFirsts[1], lastName: lasts[2] },
    { firstName: maleFirsts[1],   lastName: lasts[3] },
    { firstName: femaleFirsts[2], lastName: lasts[4] },
    { firstName: maleFirsts[2],   lastName: lasts[5] },
  ];
}

// Generates meeting schedule using the machine's current day of week.
// start    = today minus 5 weeks (5 completed weekly meetings ago, same weekday as today)
// shareOut = the next occurrence of that same weekday at least 3 months after start
// meetingDay = full English name of today's weekday (e.g. "Monday")
// The group has currentMeetingNumber=5 completed meetings, so startDate MUST be in the past.
// Subtracting exactly 5×7=35 days keeps the same day-of-week as today (multiples of 7).
// Returns a date 3 months before today as DD/MM/YYYY — always a valid past date for
// an existing loan that predates the group's current cycle.
function generateExistingLoanDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 3);
  return [
    String(d.getDate()).padStart(2, '0'),
    String(d.getMonth() + 1).padStart(2, '0'),
    d.getFullYear(),
  ].join('/');
}

function generateMeetingSchedule(): { startDate: string; shareOutDate: string; meetingDay: string } {
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = new Date();
  const targetDow = today.getDay(); // 0=Sun … 6=Sat
  const nextSameWeekday = (base: Date, dow: number): Date => {
    const diff = (dow - base.getDay() + 7) % 7;
    return new Date(base.getFullYear(), base.getMonth(), base.getDate() + diff);
  };
  // 5 weeks back — same DOW as today (35 is divisible by 7), in the past
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 5 * 7);
  const shareOut = nextSameWeekday(
    new Date(start.getFullYear(), start.getMonth() + 3, start.getDate()),
    targetDow,
  );
  const fmt = (d: Date): string =>
    [
      String(d.getDate()).padStart(2, '0'),
      String(d.getMonth() + 1).padStart(2, '0'),
      d.getFullYear(),
    ].join('/');
  return { startDate: fmt(start), shareOutDate: fmt(shareOut), meetingDay: DAYS[targetDow] };
}

export interface MemberData {
  firstName: string;
  lastName: string;
  gender: string;
  maritalStatus: string;
  educationLevel: string;
  dateOfBirth: string;
  adultsInFamily: string;
  dependents: string;
  mobileNumber: string;
  passcode: string;
  shares: number; // share count; value = shares × sharePrice
  savingsGoal: { category: string; targetAmount: string };
  existingLoan?: {
    requestedAmount: string;
    outstandingBalance: string;
    startDate: string;
  };
}

export interface OfficerAssignment {
  title: string;
  memberIndex: number; // index into members array
}

const { startDate, shareOutDate, meetingDay } = generateMeetingSchedule();
const names = generateMemberNames();

export const testData = {
  language: 'English',
  country: 'Zambia',

  group: {
    name: generateGroupName(),
    type: 'Real Group',
    location: 'Zambia',
  },

  partner: {
    worksWithNgo: true,
    id: '2403',
    name: 'World Vision',
  },

  cycle: {
    startDate,    // 5 weeks in the past, same weekday as today
    shareOutDate, // next occurrence of that weekday, at least 3 months after startDate
    previousCyclesCompleted: '5',
    currentMeetingNumber: '5',
    loanFundOpeningBalance: '50000',
    socialFundOpeningBalance: '2000',
  },

  financialRules: {
    sharePriceZmw: '2000',
    loanInterestRate: '10',
    loanInterestType: 'One-time added', // maps to a specific dropdown option in the app
    loanTermMonths: '3',
    requiresCoSigners: false,
    fineIncomeRouting: 'Loan Fund',
    smsReceiptsEnabled: true,
    meetingFrequency: 'Weekly',
    meetingDay, // dynamically set to today's day of week — always matches startDate/shareOutDate
  },

  // Six members with 5 shares each = 10,000 ZMW individual savings (5 × 2,000 ZMW).
  // Names are randomly generated on each run; all other data is fixed.
  members: [
    {
      firstName: names[0].firstName,
      lastName:  names[0].lastName,
      gender: 'Female',
      maritalStatus: 'Married',
      educationLevel: 'Secondary',
      dateOfBirth: '01/01/1990',
      adultsInFamily: '2',
      dependents: '2',
      mobileNumber: '0971000001',
      passcode: '11111',
      shares: 5,
      savingsGoal: { category: 'Education', targetAmount: '50000' },
    },
    {
      firstName: names[1].firstName,
      lastName:  names[1].lastName,
      gender: 'Male',
      maritalStatus: 'Single',
      educationLevel: 'Primary',
      dateOfBirth: '15/06/1988',
      adultsInFamily: '1',
      dependents: '0',
      mobileNumber: '0971000002',
      passcode: '11111',
      shares: 5,
      savingsGoal: { category: 'Business', targetAmount: '50000' },
      existingLoan: {
        requestedAmount: '10000',
        outstandingBalance: '10000',
        startDate: generateExistingLoanDate(),
      },
    },
    {
      firstName: names[2].firstName,
      lastName:  names[2].lastName,
      gender: 'Female',
      maritalStatus: 'Widowed',
      educationLevel: 'None',
      dateOfBirth: '20/03/1975',
      adultsInFamily: '1',
      dependents: '3',
      mobileNumber: '0971000003',
      passcode: '11111',
      shares: 5,
      savingsGoal: { category: 'Education', targetAmount: '50000' },
    },
    {
      firstName: names[3].firstName,
      lastName:  names[3].lastName,
      gender: 'Male',
      maritalStatus: 'Married',
      educationLevel: 'Tertiary',
      dateOfBirth: '10/09/1985',
      adultsInFamily: '2',
      dependents: '1',
      mobileNumber: '0971000004',
      passcode: '11111',
      shares: 5,
      savingsGoal: { category: 'Business', targetAmount: '50000' },
    },
    {
      firstName: names[4].firstName,
      lastName:  names[4].lastName,
      gender: 'Female',
      maritalStatus: 'Single',
      educationLevel: 'Secondary',
      dateOfBirth: '25/12/1995',
      adultsInFamily: '1',
      dependents: '1',
      mobileNumber: '0971000005',
      passcode: '11111',
      shares: 5,
      savingsGoal: { category: 'Education', targetAmount: '50000' },
    },
    {
      firstName: names[5].firstName,
      lastName:  names[5].lastName,
      gender: 'Male',
      maritalStatus: 'Married',
      educationLevel: 'Primary',
      dateOfBirth: '08/04/1982',
      adultsInFamily: '3',
      dependents: '2',
      mobileNumber: '0971000006',
      passcode: '11111',
      shares: 5,
      savingsGoal: { category: 'Business', targetAmount: '50000' },
    },
  ] as MemberData[],

  // 4 officer roles — assigned by member index (0-based), independent of generated names
  officers: [
    { title: 'Chairperson', memberIndex: 0 }, // member 1
    { title: 'Secretary',   memberIndex: 2 }, // member 3
    { title: 'Director',    memberIndex: 1 }, // member 2
    { title: 'Treasurer',   memberIndex: 3 }, // member 4
  ] as OfficerAssignment[],

  bookkeeperMemberIndex: 0, // member 1 is the bookkeeper
};
