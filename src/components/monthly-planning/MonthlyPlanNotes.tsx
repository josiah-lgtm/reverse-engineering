import { Section } from '../primitives/Card';
import { usePlan } from '../../selectors/hooks';
import { useStore } from '../../state/store';

const CARDS: {
  k: 'announcements' | 'premortem' | 'team' | 'ideas';
  icon: string;
  iconClass: string;
  title: string;
  sub: string;
  placeholder: string;
}[] = [
  {
    k: 'announcements', icon: '📢', iconClass: 'announce', title: 'Announcements',
    sub: 'What does the team need to know? New hires, comp changes, target shifts.',
    placeholder: 'e.g. New SDR starting June 5 — first month ramp; Joshua taking 1 wk off mid-month...',
  },
  {
    k: 'premortem', icon: '⚠', iconClass: 'premortem', title: 'Pre-mortem',
    sub: "If this month underperforms, what's the most likely reason? Name the risks before they happen.",
    placeholder: "e.g. LinkedIn accept rate has dipped 2pts MoM; if it keeps sliding we'll miss bookings target...",
  },
  {
    k: 'team', icon: '👥', iconClass: 'notes-icon', title: 'Team notes',
    sub: 'Per-person context — workload, ramp status, performance, anything the team needs to see.',
    placeholder: 'e.g. Daniel: 14 closes month-over-month, ready for senior role; Sev: needs more pipeline support; new junior ramps in week 3...',
  },
  {
    k: 'ideas', icon: '💡', iconClass: 'ideas', title: 'Ideas',
    sub: 'Experiments to test, channels to try, processes to improve.',
    placeholder: 'e.g. Trial a 3rd email domain to spread sending load; rework call 2 confirmation SMS to bump show2 rate from 80→85...',
  },
];

export function MonthlyPlanNotes() {
  const plan = usePlan();
  const setPlanNote = useStore((s) => s.setPlanNote);

  return (
    <Section title="Monthly plan" summary="announcements · pre-mortem · team notes · ideas">
      {CARDS.map((card) => (
        <div className="plan-card" key={card.k}>
          <h3>
            <span className={`icon ${card.iconClass}`}>{card.icon}</span>
            {card.title}
          </h3>
          <p className="sub">{card.sub}</p>
          <textarea
            value={plan.notes[card.k] || ''}
            placeholder={card.placeholder}
            onChange={(e) => setPlanNote(card.k, e.target.value)}
          />
        </div>
      ))}
    </Section>
  );
}
