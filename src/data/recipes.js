export const INGREDIENTS = [
  { id: 'beans_light', name: 'Light Beans',  color: 0xd4a574, cost: 3 },
  { id: 'beans_med',   name: 'Med. Beans',   color: 0x8b5a2b, cost: 3 },
  { id: 'beans_dark',  name: 'Dark Beans',   color: 0x3d1c0a, cost: 4 },
  { id: 'milk',        name: 'Milk',         color: 0xffeedd, cost: 5 },
  { id: 'sugar',       name: 'Sugar',        color: 0xffee99, cost: 2 },
  { id: 'water',       name: 'Water',        color: 0x88ccff, cost: 1 },
  { id: 'cream',       name: 'Cream',        color: 0xfffde7, cost: 6 },
  { id: 'caramel',     name: 'Caramel',      color: 0xd4842a, cost: 5 },
  { id: 'ice',         name: 'Ice',          color: 0xb3ecff, cost: 2 },
  { id: 'choc',        name: 'Chocolate',    color: 0x4a2010, cost: 5 },
];

export const PASTRIES = [
  // Donuts
  { id: 'pink_donut',        name: 'Pink Donut',        cost: 3, sprite: '/sprites/pastry/pink donut.png' },
  { id: 'chocolate_donut',   name: 'Chocolate Donut',   cost: 4, sprite: '/sprites/pastry/chocolate donut.png' },
  // Cakes
  { id: 'matcha_cake',       name: 'Matcha Cake',       cost: 5, sprite: '/sprites/pastry/matcha cake.png' },
  // Croissants
  { id: 'croissant',         name: 'Croissant',         cost: 4, sprite: '/sprites/pastry/crossiant.png' },
  { id: 'strawberry_croissant', name: 'Strawberry Croissant', cost: 5, sprite: '/sprites/pastry/strawberry crossaint.png' },
  { id: 'matcha_croissant',  name: 'Matcha Croissant',  cost: 5, sprite: '/sprites/pastry/matcha crossain.png' },
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
