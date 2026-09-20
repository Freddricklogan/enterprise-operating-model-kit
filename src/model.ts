/**
 * Operating-model diagnostic. Three instruments an enterprise leader uses
 * in the first ninety days, each as data:
 *
 *   capabilities  a heat-map of what the organisation must be good at,
 *                 scored for importance and current maturity
 *   raci          a responsibility chart generated from decision rights
 *   okrs          an objective cascade from enterprise to team, with the
 *                 alignment checked rather than assumed
 */

export type Domain = 'strategy' | 'customer' | 'operations' | 'people' | 'technology' | 'finance';
export const DOMAINS: readonly Domain[] = ['strategy', 'customer', 'operations', 'people', 'technology', 'finance'] as const;
export const DOMAIN_LABEL: Record<Domain, string> = { strategy: 'Strategy & governance', customer: 'Customer & service', operations: 'Operations & delivery', people: 'People & culture', technology: 'Technology & data', finance: 'Finance & risk' };

export interface Capability {
  id: string;
  name: string;
  domain: Domain;
  /** How much the strategy depends on this capability, 1–5. */
  importance: number;
  /** Current maturity, 1 (ad hoc) – 5 (optimised). */
  maturity: number;
  /** Maturity the strategy needs within the planning horizon, 1–5. */
  target: number;
  owner: string;
}

export type Right = 'decide' | 'recommend' | 'input' | 'informed';

/** A decision and who holds which right over it. RACI is generated from these. */
export interface Decision {
  id: string;
  name: string;
  domain: Domain;
  rights: Record<string, Right>;
}

export interface Role { id: string; name: string }

export interface KeyResult { id: string; text: string; baseline: number; target: number; current: number; unit: string }
export interface Objective {
  id: string;
  level: 'enterprise' | 'division' | 'team';
  owner: string;
  text: string;
  /** The objective this one contributes to; enterprise objectives have none. */
  parentId: string | null;
  keyResults: KeyResult[];
}

export interface OperatingModel {
  name: string;
  roles: Role[];
  capabilities: Capability[];
  decisions: Decision[];
  objectives: Objective[];
}

export const SAMPLE: OperatingModel = {
  name: 'Regional university — sample operating model',
  roles: [
    { id: 'pres', name: 'President' }, { id: 'provost', name: 'Provost' }, { id: 'cio', name: 'CIO' }, { id: 'cfo', name: 'CFO' },
    { id: 'deans', name: 'Deans' }, { id: 'registrar', name: 'Registrar' }, { id: 'careers', name: 'Career services' }, { id: 'hr', name: 'HR' }
  ],
  capabilities: [
    { id: 'c1', name: 'Enrollment forecasting', domain: 'strategy', importance: 5, maturity: 2, target: 4, owner: 'provost' },
    { id: 'c2', name: 'Programme portfolio review', domain: 'strategy', importance: 4, maturity: 3, target: 4, owner: 'provost' },
    { id: 'c3', name: 'Student advising at scale', domain: 'customer', importance: 5, maturity: 2, target: 4, owner: 'deans' },
    { id: 'c4', name: 'Career-readiness credentialing', domain: 'customer', importance: 4, maturity: 3, target: 5, owner: 'careers' },
    { id: 'c5', name: 'Course scheduling', domain: 'operations', importance: 3, maturity: 4, target: 4, owner: 'registrar' },
    { id: 'c6', name: 'Vendor and contract management', domain: 'operations', importance: 3, maturity: 2, target: 3, owner: 'cfo' },
    { id: 'c7', name: 'Faculty development', domain: 'people', importance: 4, maturity: 3, target: 4, owner: 'provost' },
    { id: 'c8', name: 'Workforce planning', domain: 'people', importance: 3, maturity: 1, target: 3, owner: 'hr' },
    { id: 'c9', name: 'Learning analytics platform', domain: 'technology', importance: 5, maturity: 2, target: 4, owner: 'cio' },
    { id: 'c10', name: 'Identity and access management', domain: 'technology', importance: 4, maturity: 3, target: 4, owner: 'cio' },
    { id: 'c11', name: 'Cybersecurity operations', domain: 'technology', importance: 5, maturity: 3, target: 4, owner: 'cio' },
    { id: 'c12', name: 'Multi-year financial modelling', domain: 'finance', importance: 4, maturity: 2, target: 4, owner: 'cfo' },
    { id: 'c13', name: 'Grant compliance', domain: 'finance', importance: 4, maturity: 4, target: 4, owner: 'cfo' }
  ],
  decisions: [
    { id: 'd1', name: 'Launch or close an academic programme', domain: 'strategy', rights: { pres: 'decide', provost: 'recommend', deans: 'input', cfo: 'input', registrar: 'informed' } },
    { id: 'd2', name: 'Adopt an enterprise learning platform', domain: 'technology', rights: { provost: 'decide', cio: 'recommend', deans: 'input', registrar: 'input', cfo: 'informed', careers: 'informed' } },
    { id: 'd3', name: 'Set tuition and aid strategy', domain: 'finance', rights: { pres: 'decide', cfo: 'recommend', provost: 'input', registrar: 'informed' } },
    { id: 'd4', name: 'Approve a new credential pathway', domain: 'customer', rights: { provost: 'decide', careers: 'recommend', deans: 'input', registrar: 'input', cio: 'informed' } },
    { id: 'd5', name: 'Change the academic calendar', domain: 'operations', rights: { provost: 'recommend', registrar: 'recommend', deans: 'input', cio: 'informed' } },
    { id: 'd6', name: 'Approve faculty hiring plan', domain: 'people', rights: { provost: 'decide', deans: 'recommend', hr: 'input', cfo: 'input' } }
  ],
  objectives: [
    { id: 'o1', level: 'enterprise', owner: 'pres', text: 'Every graduate leaves with a verified, employer-recognised record of what they can do.', parentId: null, keyResults: [
      { id: 'k1', text: 'Graduates with at least one verified credential', baseline: 18, target: 60, current: 31, unit: '%' },
      { id: 'k2', text: 'Employers verifying credentials in the last 90 days', baseline: 4, target: 40, current: 11, unit: 'employers' }
    ] },
    { id: 'o2', level: 'division', owner: 'provost', text: 'Embed credentialing in every undergraduate programme.', parentId: 'o1', keyResults: [
      { id: 'k3', text: 'Programmes with a credential map', baseline: 3, target: 24, current: 9, unit: 'programmes' }
    ] },
    { id: 'o3', level: 'team', owner: 'careers', text: 'Make credential verification effortless for employers.', parentId: 'o2', keyResults: [
      { id: 'k4', text: 'Median time to verify', baseline: 180, target: 5, current: 40, unit: 'seconds' },
      { id: 'k5', text: 'Employer partners onboarded', baseline: 6, target: 40, current: 14, unit: 'employers' }
    ] },
    { id: 'o4', level: 'division', owner: 'cio', text: 'Stand up the learning analytics platform.', parentId: 'o1', keyResults: [
      { id: 'k6', text: 'Courses feeding engagement data', baseline: 0, target: 200, current: 45, unit: 'courses' }
    ] },
    { id: 'o5', level: 'team', owner: 'registrar', text: 'Reduce course-scheduling conflicts.', parentId: null, keyResults: [
      { id: 'k7', text: 'Scheduling conflicts per term', baseline: 320, target: 100, current: 260, unit: 'conflicts' }
    ] }
  ]
};

export function sample(): OperatingModel {
  return structuredClone(SAMPLE);
}
