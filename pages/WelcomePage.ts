import { BasePage, s, byText } from './BasePage';

export class WelcomePage extends BasePage {
  private _selectedLanguage = '';
  private _selectedCountry = '';

  async selectLanguage(language: string): Promise<void> {
    await this.tap(s('spinner_language'));
    await this.waitAndTap(byText('tv_item_name', language));
    this._selectedLanguage = language;
  }

  async selectCountry(country: string): Promise<void> {
    await this.tap(s('spinner_country'));
    await this.waitAndTap(byText('tv_item_name', country));
    this._selectedCountry = country;
  }

  async tapContinue(): Promise<void> {
    await this.tap(s('btn_start_app'));
    // Country confirmation dialog (device SIM ≠ selected country).
    // btn_ok = "Yes, continue". clickable:false — handled by waitAndTap via tapElement.
    try {
      await this.waitAndTap(s('btn_ok'), 6000);
    } catch { /* no country dialog */ }
  }

  // Returns cached value — the spinner is gone after tapContinue navigates away
  async getSelectedLanguage(): Promise<string> {
    return this._selectedLanguage;
  }

  async getSelectedCountry(): Promise<string> {
    return this._selectedCountry;
  }
}
