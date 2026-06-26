// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import App from '../../src/App';
import { useStore } from '../../src/state/store';
import { defaultState } from '../../src/engine/defaults';

beforeEach(() => {
  localStorage.clear();
  // Reset the URL too — jsdom's location persists across tests in a file, and the
  // app now syncs activeView <-> path, so a stale path would leak between tests.
  window.history.replaceState(null, '', '/');
  // Reset the singleton store to a clean default before each test.
  useStore.setState({ ...defaultState(), saveStatus: 'saved', flashEntryId: null });
});
afterEach(cleanup);

describe('App smoke (jsdom)', () => {
  it('renders the Reverse Engineering view with computed funnel + economics', () => {
    render(<App />);
    expect(screen.getByText('REVERSE ENGINEERING')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Reverse Engineering' })).toBeTruthy();
    // Default plan: 120000 / 15000 = 8 closes; funnel + war-plan "Closes" rows.
    expect(screen.getAllByText('Closes').length).toBeGreaterThan(0);
    // Economics LTV tile renders.
    expect(screen.getByText('LTV per close')).toBeTruthy();
    // Funnel "Call 1 booked" hero present.
    expect(screen.getByText('Call 1 booked')).toBeTruthy();
  });

  it('reacts to a revenue target change (closes update)', () => {
    render(<App />);
    const revInput = document.getElementById('rev-target') as HTMLInputElement;
    expect(revInput).toBeTruthy();
    fireEvent.change(revInput, { target: { value: '150000' } });
    expect(useStore.getState().months[useStore.getState().activeMonth].revenueTarget).toBe(150000);
    // 150000 / 15000 = 10 closes; the Monthly Planning war plan reflects it.
    fireEvent.click(screen.getByRole('link', { name: 'Monthly Planning' }));
    expect(screen.getAllByText(/10 closes/).length).toBeGreaterThan(0);
  });

  it('switches to Business Data, adds a weekly entry, and renders the table', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Business Data'));
    expect(screen.getByText(/Weekly tracking/)).toBeTruthy();
    fireEvent.click(screen.getByText('+ Add this week'));
    expect(useStore.getState().activeWeeklyId).toBeTruthy();
    // Default scorecard (cards) view shows the metric.
    expect(screen.getAllByText('Contracted revenue').length).toBeGreaterThan(0);
    // Toggling to Table view reveals the target-header column.
    fireEvent.click(screen.getByRole('button', { name: /Table/ }));
    expect(screen.getByText('Weekly target')).toBeTruthy();
  });

  it('switches to History without crashing and shows the empty state', () => {
    render(<App />);
    fireEvent.click(screen.getByText('History'));
    expect(screen.getByText('📈 History')).toBeTruthy();
    expect(screen.getByText('Hit rate')).toBeTruthy();
    expect(screen.getByText(/Add entries from the Business Data page/)).toBeTruthy();
  });

  it('opens the war-plan publish modal with generated markdown', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('link', { name: 'Monthly Planning' }));
    fireEvent.click(screen.getByText('Send war plan to Notion →'));
    const pre = document.querySelector('.modal-overlay pre');
    expect(pre).toBeTruthy();
    expect(pre!.textContent).toContain('# June');
    expect(pre!.textContent).toContain('## Full funnel');
  });

  it('renders all RE sliders without error (channel cards expanded)', () => {
    render(<App />);
    // LinkedIn + Email channel cards present (also appear in econ + mix).
    expect(screen.getAllByText('LinkedIn').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Email').length).toBeGreaterThan(0);
    // Team capacity recommendation card present.
    const caps = screen.getAllByText(/covers/);
    expect(caps.length).toBeGreaterThan(0);
    void within;
  });
});
