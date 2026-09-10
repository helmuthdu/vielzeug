import '@vielzeug/refine/avatar';
import '@vielzeug/refine/button';
import '@vielzeug/refine/card';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/input';
import '@vielzeug/refine/select';
import '@vielzeug/refine/switch';
import { define, html } from '@vielzeug/ore';
import { toast } from '@vielzeug/refine/toast';
import { travelerProfile, travelPreferences } from '../../core/preferences';
import { activeRoute } from '../../core/router';
import { theme } from '../../core/theme';
import { checkedOf, valueOf } from '../format';

define('account-view', {
  setup() {
    const save = (message: string): void => {
      toast.add({ color: 'success', message });
    };

    if (activeRoute.value === 'settings') {
      return html`
        <div class="page-content account-page">
          <header class="page-header account-heading">
            <div>
              <span class="eyebrow">PREFERENCES</span>
              <h1>Settings</h1>
              <p>Shape Voyage around the way you plan and travel.</p>
            </div>
          </header>
          <div class="settings-layout">
            <nav class="settings-index" aria-label="Settings sections">
              <a href="#appearance">Appearance</a>
              <a href="#regional">Regional preferences</a>
              <a href="#notifications">Notifications</a>
            </nav>
            <div class="settings-sections">
              <section class="account-section" id="appearance">
                <header>
                  <div>
                    <h2>Appearance</h2>
                    <p>Choose the interface that feels most comfortable.</p>
                  </div>
                </header>
                <div class="theme-choices" role="group" aria-label="Color theme">
                  <button
                    type="button"
                    class=${() => (theme.value === 'light' ? 'theme-choice is-selected' : 'theme-choice')}
                    @click=${() => {
                      theme.value = 'light';
                    }}>
                    <span class="theme-preview theme-preview--light">
                      <i></i>
                      <i></i>
                      <i></i>
                    </span>
                    <strong>Light</strong>
                    <small>Bright and calm</small>
                  </button>
                  <button
                    type="button"
                    class=${() => (theme.value === 'dark' ? 'theme-choice is-selected' : 'theme-choice')}
                    @click=${() => {
                      theme.value = 'dark';
                    }}>
                    <span class="theme-preview theme-preview--dark">
                      <i></i>
                      <i></i>
                      <i></i>
                    </span>
                    <strong>Dark</strong>
                    <small>Easy on the eyes</small>
                  </button>
                </div>
              </section>
              <section class="account-section" id="regional">
                <header>
                  <div>
                    <h2>Regional preferences</h2>
                    <p>Control how language, prices, and distances appear.</p>
                  </div>
                </header>
                <div class="settings-grid">
                  <ore-select
                    label="Language"
                    label-placement="outside"
                    value=${() => travelPreferences.value.language}
                    options=${[
                      { label: 'English', value: 'English' },
                      { label: 'Deutsch', value: 'Deutsch' },
                      { label: '日本語', value: '日本語' },
                    ]}
                    @change=${(event: Event) => {
                      travelPreferences.value = { ...travelPreferences.value, language: valueOf(event) };
                    }}></ore-select>
                  <ore-select
                    label="Currency"
                    label-placement="outside"
                    value=${() => travelPreferences.value.currency}
                    options=${[
                      { label: 'Euro (EUR)', value: 'EUR' },
                      { label: 'Japanese yen (JPY)', value: 'JPY' },
                      { label: 'US dollar (USD)', value: 'USD' },
                    ]}
                    @change=${(event: Event) => {
                      travelPreferences.value = { ...travelPreferences.value, currency: valueOf(event) };
                    }}></ore-select>
                  <ore-select
                    label="Distance"
                    label-placement="outside"
                    value=${() => travelPreferences.value.distanceUnit}
                    options=${[{ label: 'Kilometers', value: 'Kilometers' }, { label: 'Miles', value: 'Miles' }]}
                    @change=${(event: Event) => {
                      travelPreferences.value = { ...travelPreferences.value, distanceUnit: valueOf(event) };
                    }}></ore-select>
                </div>
              </section>
              <section class="account-section" id="notifications">
                <header>
                  <div>
                    <h2>Notifications</h2>
                    <p>Decide what deserves your attention.</p>
                  </div>
                </header>
                <div class="notification-list">
                  <div>
                    <span>
                      <strong>Trip reminders</strong>
                      <small>Upcoming check-ins, trains, and activities</small>
                    </span>
                    <ore-switch
                      aria-label="Trip reminders"
                      ?checked=${() => travelPreferences.value.tripReminders}
                      @change=${(event: Event) => {
                        travelPreferences.value = { ...travelPreferences.value, tripReminders: checkedOf(event) };
                      }}></ore-switch>
                  </div>
                  <div>
                    <span>
                      <strong>Price alerts</strong>
                      <small>Changes to saved stays and experiences</small>
                    </span>
                    <ore-switch
                      aria-label="Price alerts"
                      ?checked=${() => travelPreferences.value.priceAlerts}
                      @change=${(event: Event) => {
                        travelPreferences.value = { ...travelPreferences.value, priceAlerts: checkedOf(event) };
                      }}></ore-switch>
                  </div>
                  <div>
                    <span>
                      <strong>Voyage updates</strong>
                      <small>Occasional product news and travel inspiration</small>
                    </span>
                    <ore-switch
                      aria-label="Voyage updates"
                      ?checked=${() => travelPreferences.value.marketingUpdates}
                      @change=${(event: Event) => {
                        travelPreferences.value = { ...travelPreferences.value, marketingUpdates: checkedOf(event) };
                      }}></ore-switch>
                  </div>
                </div>
              </section>
              <div class="account-actions">
                <span>Changes apply to this demo session.</span>
                <ore-button color="primary" @click=${() => save('Settings saved.')}>Save settings</ore-button>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    return html`
      <div class="page-content account-page">
        <header class="profile-hero">
          <ore-avatar
            size="xl"
            initials=${() => `${travelerProfile.value.firstName[0] ?? ''}${travelerProfile.value.lastName[0] ?? ''}`}
            alt=${() => `${travelerProfile.value.firstName} ${travelerProfile.value.lastName}`}></ore-avatar>
          <div>
            <span class="eyebrow">TRAVELER PROFILE</span>
            <h1>${() => `${travelerProfile.value.firstName} ${travelerProfile.value.lastName}`}</h1>
            <p>Japan is next · 4 confirmed bookings</p>
          </div>
        </header>
        <div class="profile-layout">
          <section class="account-section">
            <header>
              <div>
                <h2>Personal details</h2>
                <p>The information attached to your demo reservations.</p>
              </div>
              <ore-icon name="user-round" size="20" aria-hidden="true"></ore-icon>
            </header>
            <div class="profile-form">
              <ore-input
                label="First name"
                label-placement="outside"
                value=${() => travelerProfile.value.firstName}
                @input=${(event: Event) => {
                  travelerProfile.value = { ...travelerProfile.value, firstName: valueOf(event) };
                }}></ore-input>
              <ore-input
                label="Last name"
                label-placement="outside"
                value=${() => travelerProfile.value.lastName}
                @input=${(event: Event) => {
                  travelerProfile.value = { ...travelerProfile.value, lastName: valueOf(event) };
                }}></ore-input>
              <ore-input
                type="email"
                label="Email"
                label-placement="outside"
                value=${() => travelerProfile.value.email}
                @input=${(event: Event) => {
                  travelerProfile.value = { ...travelerProfile.value, email: valueOf(event) };
                }}></ore-input>
              <ore-input
                type="tel"
                label="Phone"
                label-placement="outside"
                value=${() => travelerProfile.value.phone}
                @input=${(event: Event) => {
                  travelerProfile.value = { ...travelerProfile.value, phone: valueOf(event) };
                }}></ore-input>
            </div>
          </section>
          <aside class="profile-sidebar">
            <section class="account-section">
              <header>
                <div>
                  <h2>Travel preferences</h2>
                  <p>Used to tailor suggested journeys.</p>
                </div>
              </header>
              <div class="profile-preferences">
                <ore-input
                  label="Home airport"
                  label-placement="outside"
                  value=${() => travelerProfile.value.homeAirport}
                  @input=${(event: Event) => {
                    travelerProfile.value = { ...travelerProfile.value, homeAirport: valueOf(event) };
                  }}></ore-input>
                <ore-select
                  label="Seat preference"
                  label-placement="outside"
                  value=${() => travelerProfile.value.seatPreference}
                  options=${[
                    { label: 'Window', value: 'Window' },
                    { label: 'Aisle', value: 'Aisle' },
                    { label: 'No preference', value: 'No preference' },
                  ]}
                  @change=${(event: Event) => {
                    travelerProfile.value = { ...travelerProfile.value, seatPreference: valueOf(event) };
                  }}></ore-select>
              </div>
            </section>
            <div class="profile-stat">
              <span>JOURNEYS PLANNED</span>
              <strong>6</strong>
              <small>Across 4 countries</small>
            </div>
          </aside>
        </div>
        <div class="account-actions">
          <span>Changes apply to this demo session.</span>
          <ore-button color="primary" @click=${() => save('Profile saved.')}>Save profile</ore-button>
        </div>
      </div>
    `;
  },
  shadow: false,
});
