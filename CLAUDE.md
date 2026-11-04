# DreamSave QA Automation — Architecture & Coding Standards

These rules are **mandatory** for every test scenario and page object added to this repository.
They reflect the architecture locked in at commit `14d6bc4` and verified at **15/15 passing**.

---

## 1. Strict Page Object Model (POM) Boundaries

### Test Specs (`tests/`)
- Contain **only** test step orchestration and `expect` assertions.
- Zero raw selectors (`$`, `$$`, `s()`, `byText()`), zero direct `driver`/`browser` calls.
- Each `it` block maps to one numbered workflow step; name it accordingly.

```typescript
// ✅ correct
it('Step 2 — creates a new group', async () => {
  await groupSetup.tapCreateNewGroup();
  await groupSetup.enterGroupName(testData.group.name);
  expect(await groupSetup.getGroupName()).toBe(testData.group.name);
});

// ❌ wrong — raw selector in test file
it('Step 2 — creates a new group', async () => {
  const el = await $(s('edt_group_name'));
  await el.setValue('Agent');
});
```

### Page Objects (`pages/`)
- Must `extend BasePage`.
- Contain **only** locators, page actions, and state-retrieval helpers.
- Zero `expect(...)` or `assert(...)` calls — assertions belong in the spec.

```typescript
// ✅ correct
async getGroupName(): Promise<string> {
  const el = await $(s('edt_group_name'));
  return el.getValue();
}

// ❌ wrong — assertion inside a page object
async getGroupName(): Promise<string> {
  const el = await $(s('edt_group_name'));
  expect(await el.getValue()).toBe('Agent'); // never here
  return el.getValue();
}
```

---

## 2. Locator & Interaction Standards — Zero Coordinates

- **Never** use hardcoded X/Y coordinates, pixel offsets, or absolute XPaths.
- **Never** call `driver.getWindowSize()` to derive tap targets — that's what `tapElement` already does.
- Always pick a locator in this priority order:
  1. `s('resource_id')` — resource-id (most stable)
  2. `byText('resource_id', 'text')` — resource-id + text (for lists/spinners)
  3. UIAutomator2 selector — only for scrollable containers or elements below the fold
- Always interact through `BasePage` helpers (`waitAndTap`, `tapElement`, `scrollIntoViewAndTap`, etc.) — never call `.click()` directly on a located element except inside `BasePage` itself.

```typescript
// ✅ correct
await this.waitAndTap(s('btn_next'));
await this.scrollIntoViewAndTap('btn_done');

// ❌ wrong — raw coordinate tap
await driver.execute('mobile: clickGesture', { x: 540, y: 1800 });
```

---

## 3. Wait & Synchronization Strategy — No Blind Pauses

**Never** add an undocumented `browser.pause()`.

Always reach for a deterministic `BasePage` wait helper first:

| Situation | Helper to use |
|---|---|
| Tap a button once it appears | `waitAndTap(selector, timeout?)` |
| Wait for any element to be visible | `waitForElement(selector, timeout?)` |
| Wait for keyboard to close | `waitForKeyboardClosed()` |
| Wait for radio/checkbox checked state | `waitForCheckedState(el, expected?, timeout?)` |
| Check if optional element appears | `waitForOptionalElement(selector, timeout?)` |
| Custom condition | `browser.waitUntil(fn, { timeout, interval })` |

**Only exception — hardware/instrumentation boundaries:**
If a `UiScrollable` fling, `getPageSource()` XML snapshot, or `adb shell input text` focus
genuinely has no deterministic end signal, a settle buffer is permitted **only** if it carries:

```typescript
await browser.pause(400); // intentional stabilization: <exact technical reason>
```

No comment → PR is blocked. The 18 existing documented pauses are the reference examples.

---

## 4. Multi-Environment & Data Standards

### Environments
Never hardcode package names, APK paths, or any environment-specific string inside `tests/` or `pages/`.
All environment config lives exclusively in `config/env.ts`:

| `TEST_ENV` | Package | APK |
|---|---|---|
| `dev` | `com.dreamstartlabs.dreamsave.dev` | `apps/dreamsave-dev.apk` |
| `stage` *(default)* | `com.dreamstartlabs.dreamsave.staging.beta` | `apps/dreamsave-staging.apk` |
| `qa` | `com.dreamstartlabs.dreamsave.qa.beta` | `apps/dreamsave-qa.apk` |
| `prod` | `com.dreamstartlabs.dreamsave` | `apps/dreamsave-prod.apk` |

Switch environment at the command line — no code changes required:
```bash
# PowerShell
$env:TEST_ENV = "qa"; npm run test:group-creation

# Bash / CI
TEST_ENV=prod npm run test:group-creation
```

Adding a new environment = one new entry in `CONFIGS` in `config/env.ts` only.

### Test Data (`data/testData.ts`)
- Group names, member names, meeting dates, and share-out dates **must be generated dynamically** so each run is independent and repeatable on any date.
- Fixed values (share price, partner ID, loan terms, passcodes) are acceptable and intentional.
- Never hardcode today's date as a string literal.

---

## 5. Code Simplicity & Type Safety

- Keep every page method ≤ 30 lines of dense logic. If a method grows beyond that, extract the sub-flow into a named `private` helper (see `ensureCheckboxSelected`, `waitForChecklistAfterSave` as references).
- Never use `// @ts-nocheck` or `// @ts-ignore`. Suppress TypeScript errors by fixing the type, not hiding it.
- Every new page object or test file must pass with **zero errors** before running:
  ```bash
  npx tsc --noEmit
  # or
  npm run tsc:check
  ```
- `tsconfig.json` has `"strict": false` deliberately (Appium/WDIO globals are loosely typed). Do not enable strict mode without a full audit pass.

---

## Project Layout

```
DreamSave_Project/
├── apps/               # APK binaries (gitignored)
├── config/
│   └── env.ts          # All environment config — the ONLY place for pkg names / APK paths
├── data/
│   └── testData.ts     # Dynamic test data generation
├── pages/
│   ├── BasePage.ts     # Shared wait/interaction utilities — extend this in every page object
│   ├── WelcomePage.ts
│   ├── PermissionsPage.ts
│   ├── GroupSetupPage.ts
│   ├── PartnerPage.ts
│   ├── CycleConfigPage.ts
│   ├── FinancialRulesPage.ts
│   ├── MemberCreationPage.ts
│   ├── OfficerElectionPage.ts
│   ├── ReviewPage.ts
│   └── BackupPage.ts
├── tests/
│   └── groupCreation.test.ts
├── wdio.conf.ts        # WDIO + Appium runner config (reads from config/env.ts)
├── tsconfig.json
└── package.json
```

---

## Running the Suite

```bash
# Default (stage env)
npm run test:group-creation

# Specific environment
$env:TEST_ENV = "qa"; npm run test:group-creation   # PowerShell
TEST_ENV=qa npm run test:group-creation              # Bash / CI

# Type-check only (no device needed)
npm run tsc:check
```

Appium server starts and stops automatically via `@wdio/appium-service`.
Failure screenshots are saved to `screenshots/` (gitignored) via the `afterTest` hook in `wdio.conf.ts`.
