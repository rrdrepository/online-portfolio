// ─────────────────────────────────────────────────────────────
// YOUR RESUME — edit this file to update the whole site.
// The laptop screen, the code view and the section panels all read from here.
// Content taken from Radin_Mikael_CV.pdf.
// ─────────────────────────────────────────────────────────────

export const todo = (note) => ({ __todo: note })

export const RESUME = {
  name: 'Radin Mikael',
  role: 'Computer Science Student',
  location: 'Malaysia',

  education: [
    {
      school: 'Sunway University',
      degree: 'B.S. in Computer Science',
      dates: 'Feb 2025 – Present',
      gpa: '3.35 / 4.0',
      certificates: ['CCNA ITN Certification'],
      coursework: {
        'Object-Oriented Programming': 'A',
        'Data Structures and Algorithms': 'A-',
        'AI Foundation and Applications': 'A+',
        'Computer Networks': 'A-',
        'Software Engineering': 'B+',
        'Database Fundamentals': 'B',
      },
    },
    {
      school: 'INTEC Education College',
      degree: 'American Degree Transfer Program (ADTP)',
      dates: 'Aug 2022 – Sep 2024',
      gpa: '3.03 / 4.0',
      coursework: ['Calculus', 'Pre-Calculus', 'Physics I', 'Computer Programming II', 'Statistic Theory for Scientist', 'Linear Algebra'],
    },
  ],

  skills: {
    languages: ['Java', 'C++', 'Python'],
    web: ['HTML', 'CSS', 'JavaScript'],
    databases: ['SQL', 'Oracle APEX'],
    networking: ['Cisco Packet Tracer', 'Linux', 'Network Configuration', 'IP Addressing', 'Routing'],
  },

  projects: [
    {
      title: 'Carbon Emissions Monitoring & Sustainability Solution',
      role: 'Project Lead',
      context: 'Startup Foundry',
      dates: 'May 2026 – Aug 2026',
      points: [
        'Proposed actionable sustainability recommendations to help SMEs identify opportunities to reduce their environmental impact.',
        'Conceptualized a digital platform enabling SMEs to upload utility bills for carbon emissions assessment and environmental impact tracking.',
        'Developed a CO₂ sensor prototype to monitor indoor carbon dioxide levels and support ongoing environmental monitoring.',
      ],
    },
    {
      title: 'Enterprise Network Design & Implementation',
      role: 'Network Configuration Lead',
      context: 'Computer Networks',
      dates: 'May 2026 – Aug 2026',
      points: [
        'Configured VLANs 10, 20, 30 and 99, implementing Router-on-a-Stick inter-VLAN routing on Cisco routers using 802.1Q subinterfaces.',
        'Configured DHCP pools for multiple VLANs, including excluded IP address ranges, default gateways and DNS settings to automate client IP address assignment.',
        'Implemented static routing and verified end-to-end connectivity through DHCP address checks, gateway and ISP ping tests, and Cisco IOS diagnostic commands.',
      ],
    },
    {
      title: 'Online Library Management System',
      role: 'Software Developer',
      context: 'Computer Programming II',
      dates: 'Jan 2024 – Apr 2024',
      points: [
        'Collaborated with JPA and MARA scholars to develop a Java-based online library management system.',
        'Implemented core functionalities for book management, borrowing and returning books and user authentication.',
        'Applied object-oriented programming principles to support the development of system functionality.',
      ],
    },
  ],

  experience: [
    {
      title: 'Retail Associate, Permanent Part-Time',
      org: 'Zara',
      dates: 'Nov 2025 – Feb 2026',
      points: [
        'Generated approximately RM5,000 in revenue from individual online iPod sales over a 3-month period.',
        'Helped the team achieve a record RM6,397,430 monthly sales.',
      ],
    },
    {
      title: 'Retail Associate, Part-Time',
      org: 'Cotton On',
      dates: 'Mar 2025 – Jul 2025',
      points: [
        "Assisted in the annual stock take process, contributing to improved accuracy compared to previous years' results.",
        'Improved donation KPI performance from 1 in 4 to 1 in 3 customers through effective customer engagement.',
      ],
    },
  ],

  leadership: [
    {
      title: 'Scriptwriter & Lead Actor',
      org: 'Educational Awareness Project, Bulimia Nervosa',
      dates: 'Mar 2024 – Apr 2024',
      points: ['Scripted and starred in a 15-minute educational video promoting awareness of bulimia nervosa and mental health among students.'],
    },
    {
      title: 'Co-Founder',
      org: 'Humanity INTEC, Non-Profit Organization',
      dates: 'Aug 2022 – Dec 2022',
      points: [
        'Co-founded a student-led nonprofit with three team members to raise awareness of human exploitation through educational campaigns.',
        'Led online awareness campaigns that generated 50,000 views and engagements, earning recognition from college leadership.',
      ],
    },
  ],

  availability: {
    internship: '25 Jan 2027 – 23 Apr 2027',
  },

  contact: {
    email: 'radinmikaelwork@hotmail.com',
    linkedin: 'https://www.linkedin.com/in/radin-mikael-9a3857274',
    github: 'https://github.com/rrdrepository',
    // Phone number deliberately left off the public site. Add it here if you want it shown:
    // phone: '+60 ...',
  },
}
