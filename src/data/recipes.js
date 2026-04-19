export const INGREDIENTS = [
  { id: 'beans',   name: 'Coffee Beans', color: 0x6b3a2a },
  { id: 'milk',    name: 'Milk',         color: 0xffeedd },
  { id: 'sugar',   name: 'Sugar',        color: 0xffee99 },
  { id: 'water',   name: 'Water',        color: 0x88ccff },
  { id: 'cream',   name: 'Cream',        color: 0xfffde7 },
  { id: 'caramel', name: 'Caramel',      color: 0xd4842a },
  { id: 'ice',     name: 'Ice',          color: 0xb3ecff },
  { id: 'choc',    name: 'Chocolate',    color: 0x4a2010 },
];

// Slot order matters: [slot1, slot2, slot3], null = slot must be empty
export const RECIPES = [
  { ingredients: ['beans', 'water', null],      result: 'Americano'         },
  { ingredients: ['beans', 'milk',  null],      result: 'Latte'             },
  { ingredients: ['beans', 'milk',  'sugar'],   result: 'Sweet Latte'       },
  { ingredients: ['beans', 'cream', 'caramel'], result: 'Caramel\nMacchiato'},
  { ingredients: ['beans', 'choc',  'milk'],    result: 'Mocha'             },
  { ingredients: ['beans', 'ice',   'milk'],    result: 'Iced Latte'        },
];
