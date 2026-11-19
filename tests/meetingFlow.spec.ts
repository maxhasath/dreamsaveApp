import { LoginPage }          from '../pages/LoginPage';
import { MeetingPage }        from '../pages/MeetingPage';
import { SavingsPage }        from '../pages/SavingsPage';
import { FinesPage }          from '../pages/FinesPage';
import { NewLoanPage }        from '../pages/NewLoanPage';
import { LoanRepaymentPage }  from '../pages/LoanRepaymentPage';
import { loginData, meetingData, RANDOM_SEED } from '../data/testData';

describe(`DreamSave — Meeting Flow (${loginData.groupName})`, () => {
  const login      = new LoginPage();
  const meeting    = new MeetingPage();
  const savings    = new SavingsPage();
  const fines      = new FinesPage();
  const newLoan    = new NewLoanPage();
  const repayments = new LoanRepaymentPage();

  let completedBefore: number;
  let roster: string[];
  let loanAmount: number;
  let paidAmount: number;
  let fineAmount: number;

  before(async () => {
    console.log(`[random] seed ${RANDOM_SEED} — replay with TEST_SEED=${RANDOM_SEED}`);
    // wdio.meeting.conf.ts clears app data, so this always runs the full Group Login flow
    // (country → permissions → 3 member credentials → cloud sync → Dashboard) first.
    await login.ensureLoggedIn({
      country:   loginData.country,
      dreamId1:  loginData.member1.dreamId,  passcode1: loginData.member1.passcode,
      dreamId2:  loginData.member2.dreamId,  passcode2: loginData.member2.passcode,
      dreamId3:  loginData.member3.dreamId,  passcode3: loginData.member3.passcode,
      groupName: loginData.groupName,
    });
  });

  it('Step 1 — navigates to Meetings tab and starts the next meeting', async () => {
    const started = await meeting.startMeeting();
    completedBefore = started.completedBefore;
    expect(started.title).toBe(`Meeting ${completedBefore + 1}`);
  });

  it('Step 2 — marks all members present in Attendance', async () => {
    roster = await meeting.doAttendance();
    expect(roster.length).toBeGreaterThan(0);
    expect(new Set(roster).size).toBe(roster.length);
  });

  it('Step 3 — completes Opening Summary and verifies the opening balance total', async () => {
    const { funds, total } = await meeting.doOpeningSummary();
    expect(funds.length).toBeGreaterThan(0);
    expect(funds.reduce((sum, fund) => sum + fund, 0)).toBe(total);
  });

  it('Step 4 — records shares and social fund payments for two random members', async () => {
    const { members, rows } = await savings.doSavings(meetingData.savings);
    expect(new Set(members).size).toBe(meetingData.savings.length);
    members.forEach(member => expect(roster).toContain(member));
    const expected = meetingData.savings.map(entry => {
      const newSaving = parseInt(entry.shares, 10) * meetingData.sharePrice;
      const social    = parseInt(entry.socialPayment, 10);
      return { newSaving, social, total: newSaving + social };
    });
    const byTotal = (a: { total: number }, b: { total: number }) => a.total - b.total;
    expect([...rows].sort(byTotal)).toEqual(expected.sort(byTotal));
  });

  it('Step 5 — fines a random member and records the full fine payment', async () => {
    const fine = await fines.doFines(meetingData.fine);
    fineAmount = fine.paid; // cash collected: the new fine plus any earlier balance
    expect(roster).toContain(fine.member);
    expect(fine.totalDue).toBeGreaterThanOrEqual(fine.newFine);
    expect(fine.paid).toBe(fine.totalDue);
    expect(fine.outstanding).toBe(0);
  });

  it('Step 6 — creates a new loan for a random eligible member within fund limits', async () => {
    const loan = await newLoan.doNewLoan(meetingData.newLoan);
    loanAmount = loan.amount;
    expect(loan.eligible).toContain(loan.member);
    expect(roster).toContain(loan.member);
    expect(loan.amount).toBeLessThanOrEqual(loan.totalLoanFund);
    expect(loan.amount).toBeLessThanOrEqual(loan.maxLoan);
    expect(loan.amount).toBe(Math.min(parseInt(meetingData.newLoan.amount, 10), loan.totalLoanFund, loan.maxLoan));
    expect(loan.interest).toBe(loan.amount * loan.ratePercent / 100);
    expect(loan.balanceDue).toBe(loan.amount + loan.interest);
  });

  it('Step 7 — repays one loan in full and another in part when several are outstanding', async () => {
    const results = await repayments.doLoanRepayment();
    paidAmount = results.reduce((sum, r) => sum + r.paid, 0);

    // Several loans -> [full, partial]; a single loan -> [partial]. Mode drives the checks.
    const loanCount = results[0].outstandingLoans;
    expect(results.map(r => r.mode)).toEqual(loanCount > 1 ? ['full', 'partial'] : ['partial']);
    expect(new Set(results.map(r => r.member)).size).toBe(results.length);
    results.forEach(r => {
      expect(r.paid).toBeLessThanOrEqual(r.outstandingBefore);
      expect(r.balanceAfter).toBe(r.outstandingBefore - r.paid);
    });
    results.filter(r => r.mode === 'full').forEach(r => expect(r.balanceAfter).toBe(0));
    results.filter(r => r.mode === 'partial').forEach(r => expect(r.paid).toBeLessThan(r.outstandingBefore));
  });

  it('Step 8 — completes Closing Summary with a member signature', async () => {
    const closing = await meeting.doClosingSummary();
    expect(roster).toContain(closing.signer);
    expect(closing.newLoans).toBe(-loanAmount);
    expect(closing.loanRepayments).toBe(paidAmount);
    expect(closing.fines).toBe(fineAmount);
    expect(closing.endBalance).toBe(
      closing.startingBalance + closing.newSavings + closing.loanRepayments + closing.newLoans + closing.fines,
    );
  });

  it('Step 9 — backs up meeting data and ends the meeting', async () => {
    const { backupTitle, completedMeeting } = await meeting.endMeeting();
    expect(backupTitle).toMatch(/backed up|saved to the internet/i);
    expect(completedMeeting).toBe(`Meeting ${completedBefore + 1}`);
  });

  it('Step 10 — verifies the Meetings tab shows one more completed meeting', async () => {
    expect(await meeting.getMeetingsCompletedCount()).toBe(completedBefore + 1);
  });
});
