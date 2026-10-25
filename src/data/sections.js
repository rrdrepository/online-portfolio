import { RESUME } from './resume'

// Every clickable object in the room.
//
// kind:   'code'  → opens the full-screen code editor (the laptop)
//         'panel' → opens the slide-in panel
// anchor: world position of the hover label (x, y, z in metres)
// focus:  where the camera glides when it opens (position = camera, target = what it looks at)
// blocks: panel content — { p }, { heading }, { list }, { rows: [[label, value]] }, { cards }

const { education, skills, projects, experience, leadership, contact } = RESUME

const asCards = (items) =>
  items.map((x) => ({
    title: x.title,
    meta: [x.role, x.org || x.context, x.dates].filter(Boolean).join(' · '),
    points: x.points,
  }))

export const SECTIONS = [
  {
    id: 'resume',
    kind: 'code',
    label: 'Resume',
    hint: 'Open radin.ts',
    anchor: [0, 1.25, -1.34],
    focus: { position: [0, 1.13, -0.86], target: [0, 1.03, -1.32] },
  },
  {
    id: 'projects',
    kind: 'panel',
    label: 'Projects',
    hint: 'Things I have built and led',
    anchor: [1.15, 1.92, -1.45],
    focus: { position: [1.05, 1.7, -0.25], target: [1.15, 1.6, -1.48] },
    blocks: [
      { cards: asCards(projects) },
      { heading: 'Technical skills' },
      { rows: [
        ['Languages', skills.languages.join(', ')],
        ['Web', skills.web.join(', ')],
        ['Databases', skills.databases.join(', ')],
        ['Networking & systems', skills.networking.join(', ')],
      ] },
    ],
  },
  {
    id: 'education',
    kind: 'panel',
    label: 'Education',
    hint: 'Sunway University · INTEC',
    anchor: [0.6, 1.0, -1.2],
    focus: { position: [1.25, 1.3, -0.35], target: [0.6, 0.86, -1.2] },
    blocks: education.flatMap((e) => [
      { cards: [{ title: e.school, meta: `${e.degree} · ${e.dates}` }] },
      { rows: [
        ['GPA', e.gpa],
        ...(e.certificates ? [['Certificates', e.certificates.join(', ')]] : []),
        ...(Array.isArray(e.coursework)
          ? [['Coursework', e.coursework.join(', ')]]
          : Object.entries(e.coursework).map(([course, grade]) => [course, grade])),
      ] },
    ]),
  },
  {
    id: 'experience',
    kind: 'panel',
    label: 'Experience',
    hint: 'Work and leadership',
    anchor: [-1.55, 1.82, -1.45],
    focus: { position: [-1.3, 1.6, -0.3], target: [-1.55, 1.5, -1.48] },
    blocks: [
      { cards: asCards(experience) },
      { heading: 'Leadership & community' },
      { cards: asCards(leadership) },
      { heading: 'Availability' },
      { p: `Internship: ${RESUME.availability.internship}` },
    ],
  },
  {
    id: 'contact',
    kind: 'panel',
    label: 'Contact',
    hint: 'Say hello',
    anchor: [0.47, 0.9, -0.7],
    focus: { position: [0.9, 1.3, -0.2], target: [0.47, 0.77, -0.7] },
    blocks: [
      { rows: [
        ['Email', contact.email],
        ['LinkedIn', contact.linkedin],
        ['GitHub', contact.github],
        ...(contact.phone ? [['Phone', contact.phone]] : []),
      ] },
    ],
  },
]

export const SECTION_BY_ID = Object.fromEntries(SECTIONS.map((s) => [s.id, s]))
