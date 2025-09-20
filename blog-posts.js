/**
 * Blog posts rendered on the home page.
 *
 * To add a new post, append an object to the array below. Only
 * `title`, `url`, `excerpt`, `image`, and `date` are required;
 * everything else is optional.
 */
window.blogPosts = [
  {
    title: 'Inside Tesla\'s carbon-sleeved motors',
    url: '/blog/tesla-carbon-sleeve-motor-breakdown',
    excerpt:
      'We tore down the Model S Plaid\'s drive unit to understand how carbon overwrap, oil cooling, and hairpin windings unlock 1,000+ hp.',
    image: 'https://images.unsplash.com/photo-1617786037733-006c4179e309?auto=format&fit=crop&w=1200&q=60',
    alt: 'Electric motor rotor on a workbench',
    category: 'Drivetrains',
    date: 'January 4, 2024',
    readTime: '11 min read'
  },
  {
    title: 'Solid-state batteries: where the bottlenecks remain',
    url: '/blog/solid-state-battery-bottlenecks',
    excerpt:
      'From sulfide electrolytes to stack pressure, here\'s the manufacturing math that keeps solid-state cells in pilot lines—for now.',
    image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=60',
    alt: 'Lithium battery research lab',
    category: 'Energy Storage',
    date: 'December 14, 2023',
    readTime: '9 min read'
  },
  {
    title: 'The coming wave of megawatt charging depots',
    url: '/blog/megawatt-charging-depots',
    excerpt:
      'Grid upgrades, cooling, and connector design for MCS sites that can fast charge Class 8 trucks without melting the cables.',
    image: 'https://images.unsplash.com/photo-1615714276770-3f0232d9544d?auto=format&fit=crop&w=1200&q=60',
    alt: 'Electric truck charging at an industrial depot',
    category: 'Charging',
    date: 'November 30, 2023',
    readTime: '7 min read'
  },
  {
    title: 'Software-defined vehicles need new E/E architectures',
    url: '/blog/software-defined-vehicle-architecture',
    excerpt:
      'Domain controllers, zonal wiring, and gigabit Ethernet promise faster development cycles—if OEMs can retool their platforms.',
    image: 'https://images.unsplash.com/photo-1582719478580-4ff2730ed3b7?auto=format&fit=crop&w=1200&q=60',
    alt: 'Engineer reviewing automotive wiring diagrams',
    category: 'Future Mobility',
    date: 'November 8, 2023',
    readTime: '8 min read'
  },
  {
    title: 'Heat pump HVAC design for sub-zero efficiency',
    url: '/blog/ev-heat-pump-hvac',
    excerpt:
      'Sizing vapor-injected compressors, valves, and refrigerants to hold cabin comfort without torching winter range.',
    image: 'https://images.unsplash.com/photo-1607860108855-227bf51e96a0?auto=format&fit=crop&w=1200&q=60',
    alt: 'EV HVAC system components on display',
    category: 'Thermal Systems',
    date: 'October 26, 2023',
    readTime: '6 min read'
  },
  {
    title: 'How inverter switching speeds impact NVH',
    url: '/blog/inverter-switching-nvh',
    excerpt:
      'SiC MOSFETs switch faster, but that EMI and torque ripple can sneak into cabins—here\'s how OEMs damp it out.',
    image: 'https://images.unsplash.com/photo-1580894906472-c4af2c56e8f2?auto=format&fit=crop&w=1200&q=60',
    alt: 'Power electronics board with components',
    category: 'Power Electronics',
    date: 'October 5, 2023',
    readTime: '10 min read'
  }
];
