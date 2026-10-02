import type { Resource } from '../domain/types';

const icon = (id: string) => `/resources/${id}.svg`;

export const resources: Resource[] = [
  // Elements: one per Forge card.
  { category: 'element', expansionId: 'core', icon: icon('fire'), id: 'fire', name: 'Fire' },
  { category: 'element', expansionId: 'core', icon: icon('thunder'), id: 'thunder', name: 'Thunder' },
  { category: 'element', expansionId: 'core', icon: icon('coral'), id: 'coral', name: 'Coral' },
  { category: 'element', expansionId: 'core', icon: icon('crystal'), id: 'crystal', name: 'Crystal' },
  { category: 'element', expansionId: 'core', icon: icon('metal'), id: 'metal', name: 'Metal' },
  { category: 'element', expansionId: 'core', icon: icon('horn'), id: 'horn', name: 'Horn' },
  { category: 'element', expansionId: 'ice', icon: icon('ice'), id: 'ice', name: 'Ice' },
  { category: 'element', expansionId: 'venom', icon: icon('venon'), id: 'venom', name: 'Venom' },
  { category: 'element', expansionId: 'feather', icon: icon('feather'), id: 'feather', name: 'Feather' },
  // Materials: monster body parts.
  { category: 'material', expansionId: 'core', icon: icon('blood'), id: 'blood', name: 'Blood' },
  { category: 'material', expansionId: 'core', icon: icon('bones'), id: 'bones', name: 'Bones' },
  { category: 'material', expansionId: 'core', icon: icon('scales'), id: 'scales', name: 'Scales' },
  { category: 'material', expansionId: 'core', icon: icon('iride'), id: 'iride', name: 'Iride' },
  { category: 'material', expansionId: 'core', icon: icon('kobaureo'), id: 'kobaureo', name: 'Kobaureo' },
  { category: 'material', expansionId: 'core', icon: icon('zima'), id: 'zima', name: 'Zima' },
  // Plants: Herbalist ingredients.
  { category: 'plant', expansionId: 'core', icon: icon('albalacea'), id: 'albalacea', name: 'Albalacea' },
  { category: 'plant', expansionId: 'core', icon: icon('anthemon'), id: 'anthemon', name: 'Anthemon' },
  { category: 'plant', expansionId: 'core', icon: icon('mellis'), id: 'mellis', name: 'Mellis' },
  { category: 'plant', expansionId: 'core', icon: icon('nillea'), id: 'nillea', name: 'Nillea' },
  { category: 'plant', expansionId: 'core', icon: icon('saelicornia'), id: 'saelicornia', name: 'Saelicornia' },
  { category: 'plant', expansionId: 'core', icon: icon('tarmaret'), id: 'tarmaret', name: 'Tarmaret' },
];
