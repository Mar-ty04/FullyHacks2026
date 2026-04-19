export const INGREDIENTS = [
  { id: 'beans_light', name: 'Light Beans',  color: 0xd4a574 },
  { id: 'beans_med',   name: 'Med. Beans',   color: 0x8b5a2b },
  { id: 'beans_dark',  name: 'Dark Beans',   color: 0x3d1c0a },
  { id: 'milk',        name: 'Milk',         color: 0xffeedd },
  { id: 'sugar',       name: 'Sugar',        color: 0xffee99 },
  { id: 'water',       name: 'Water',        color: 0x88ccff },
  { id: 'cream',       name: 'Cream',        color: 0xfffde7 },
  { id: 'caramel',     name: 'Caramel',      color: 0xd4842a },
  { id: 'ice',         name: 'Ice',          color: 0xb3ecff },
  { id: 'choc',        name: 'Chocolate',    color: 0x4a2010 },
];

// Slot order matters: [slot1, slot2, slot3], null = empty slot
export const RECIPES = [
  // ── Light Roast ──
  { ingredients: ['beans_light', 'water', null],      result: 'Light Roast'      },
  { ingredients: ['beans_light', 'milk',  null],      result: 'Flat White'       },
  { ingredients: ['beans_light', 'milk',  'sugar'],   result: 'Sweet Flat White' },

  // ── Medium Roast ──
  { ingredients: ['beans_med', 'water', null],        result: 'Americano'         },
  { ingredients: ['beans_med', 'milk',  null],        result: 'Latte'             },
  { ingredients: ['beans_med', 'milk',  'sugar'],     result: 'Sweet Latte'       },
  { ingredients: ['beans_med', 'cream', 'caramel'],   result: 'Caramel\nMacchiato'},
  { ingredients: ['beans_med', 'choc',  'milk'],      result: 'Mocha'             },
  { ingredients: ['beans_med', 'ice',   'milk'],      result: 'Iced Latte'        },

  // ── Dark Roast ──
  { ingredients: ['beans_dark', 'water', null],       result: 'Espresso'          },
  { ingredients: ['beans_dark', 'milk',  null],       result: 'Dark Latte'        },
  { ingredients: ['beans_dark', 'cream', null],       result: 'Dark Macchiato'    },
];
