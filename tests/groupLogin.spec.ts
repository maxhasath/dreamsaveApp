import { LoginPage } from '../pages/LoginPage';
import { loginData } from '../data/testData';

describe('DreamSave — Group Login Flow (Village Sunrise)', () => {
  const login = new LoginPage();

  it('Step 1 — selects Zambia as country and taps Get Started!', async () => {
    await login.selectCountryAndStart(loginData.country);
  });

  it('Step 2 — handles country modal and all permission dialogs', async () => {
    await login.dismissPermissionsAndModals();
  });

  it('Step 3 — navigates to Group Login screen', async () => {
    await login.tapGroupLogin();
  });

  it('Step 4 — enters Dream ID and passcode for all 3 members', async () => {
    await login.enterCredentialSlot(1, loginData.member1.dreamId, loginData.member1.passcode);
    await login.enterCredentialSlot(2, loginData.member2.dreamId, loginData.member2.passcode);
    await login.enterCredentialSlot(3, loginData.member3.dreamId, loginData.member3.passcode);
  });

  it('Step 5 — submits login and waits for cloud sync', async () => {
    await login.submitLogin();
  });

  it('Step 6 — verifies Dashboard shows Village Sunrise group details', async () => {
    const groupName = await login.getGroupName();
    expect(groupName).toContain(loginData.groupName);

    const savings = await login.getTotalSavings();
    expect(savings).toBeDefined();
    expect(savings.length).toBeGreaterThan(0);
  });
});
