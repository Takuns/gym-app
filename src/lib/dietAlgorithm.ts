export interface DietIdea {
  dia: string;
  comidas: {
    nombre: string;
    detalles: string;
    preparacion: string;
    calorias: number;
    proteinas: number;
    carbohidratos: number;
    grasas: number;
  }[];
}

const templates = [
  {
    dia: "Lunes",
    comidas: [
      { 
        nombre: "Desayuno", 
        detalles: "Huevos revueltos con espinaca y tostada integral", 
        preparacion: "Bate 3 claras de huevo y 1 huevo entero. Cocina en una sartén caliente antiadherente con un puñado de espinacas frescas. Acompaña con una rebanada de pan integral tostado.",
        calRatio: 0.25, pRatio: 0.35, cRatio: 0.20, fRatio: 0.20 
      },
      { 
        nombre: "Almuerzo", 
        detalles: "Pechuga de pollo a la plancha con quinoa y brócoli", 
        preparacion: "Cocina la quinoa (1 parte de quinoa por 2 de agua) a fuego lento durante 15 minutos. Cocina la pechuga de pollo a la plancha condimentada con sal y pimienta. Sirve con brócoli al vapor.",
        calRatio: 0.35, pRatio: 0.40, cRatio: 0.40, fRatio: 0.15 
      },
      { 
        nombre: "Cena", 
        detalles: "Salmón al horno con batata y espárragos", 
        preparacion: "Precalienta el horno a 200°C. Corta la batata en rodajas. Coloca el salmón y la batata en una bandeja para hornear y añade los espárragos a un lado. Hornea durante 20-25 minutos con unas gotas de aceite de oliva.",
        calRatio: 0.30, pRatio: 0.25, cRatio: 0.30, fRatio: 0.50 
      },
      { 
        nombre: "Snack", 
        detalles: "Yogur griego con almendras", 
        preparacion: "Sirve 200g de yogur griego natural sin azúcar en un tazón y mézclalo con 15-20g de almendras crudas o tostadas.",
        calRatio: 0.10, pRatio: 0.20, cRatio: 0.10, fRatio: 0.15 
      }
    ]
  },
  {
    dia: "Martes",
    comidas: [
      { 
        nombre: "Desayuno", 
        detalles: "Avena con proteína en polvo, plátano y nueces", 
        preparacion: "Cocina la avena con agua o leche desnatada en el microondas por 2 minutos. Añade un cazo de proteína en polvo (whey) y mezcla bien. Decora con medio plátano en rodajas y unas nueces troceadas.",
        calRatio: 0.25, pRatio: 0.25, cRatio: 0.40, fRatio: 0.15 
      },
      { 
        nombre: "Almuerzo", 
        detalles: "Ensalada de atún con garbanzos y aguacate", 
        preparacion: "En un bol grande, mezcla garbanzos cocidos escurridos con una lata de atún al natural. Añade medio aguacate cortado en cubos y aliña con jugo de limón, sal y una cucharadita de aceite de oliva.",
        calRatio: 0.35, pRatio: 0.35, cRatio: 0.30, fRatio: 0.40 
      },
      { 
        nombre: "Cena", 
        detalles: "Lomo de cerdo magro con puré de patata", 
        preparacion: "Cocina el lomo de cerdo a la plancha. Para el puré, hierve una patata grande, aplástala con un tenedor y añade un chorrito de leche desnatada, sal y pimienta al gusto.",
        calRatio: 0.30, pRatio: 0.30, cRatio: 0.20, fRatio: 0.30 
      },
      { 
        nombre: "Snack", 
        detalles: "Batido de proteína de suero y manzana", 
        preparacion: "Mezcla un cazo de proteína de suero con 300ml de agua en un shaker. Acompaña comiendo una manzana verde.",
        calRatio: 0.10, pRatio: 0.30, cRatio: 0.10, fRatio: 0.05 
      }
    ]
  },
  {
    dia: "Miércoles",
    comidas: [
      { 
        nombre: "Desayuno", 
        detalles: "Pancakes de avena y claras de huevo", 
        preparacion: "Licúa 50g de avena con 4 claras de huevo, una pizca de canela y edulcorante. Cocina la mezcla en una sartén antiadherente caliente haciendo pequeños pancakes de lado a lado.",
        calRatio: 0.25, pRatio: 0.30, cRatio: 0.35, fRatio: 0.10 
      },
      { 
        nombre: "Almuerzo", 
        detalles: "Ternera magra picada con arroz integral y pimientos", 
        preparacion: "Saltea ternera picada magra en una sartén con pimientos rojos y verdes cortados en tiras. Sirve junto con arroz integral cocido.",
        calRatio: 0.35, pRatio: 0.35, cRatio: 0.45, fRatio: 0.20 
      },
      { 
        nombre: "Cena", 
        detalles: "Pechuga de pavo asada con ensalada mixta", 
        preparacion: "Cocina la pechuga de pavo a la plancha o al horno con hierbas provenzales. Acompaña con una ensalada de lechuga, tomate y pepino aliñada ligeramente.",
        calRatio: 0.30, pRatio: 0.35, cRatio: 0.10, fRatio: 0.20 
      },
      { 
        nombre: "Snack", 
        detalles: "Queso cottage con arándanos", 
        preparacion: "Sirve 150g de queso cottage bajo en grasa en un bol y añade un puñado de arándanos frescos.",
        calRatio: 0.10, pRatio: 0.25, cRatio: 0.10, fRatio: 0.05 
      }
    ]
  },
  {
    dia: "Jueves",
    comidas: [
      { 
        nombre: "Desayuno", 
        detalles: "Tostadas con aguacate y huevos poché", 
        preparacion: "Tuesta dos rebanadas de pan integral. Unta un cuarto de aguacate en cada tostada. Coloca encima un huevo poché (cocido en agua hirviendo con vinagre durante 3 minutos) en cada una.",
        calRatio: 0.25, pRatio: 0.25, cRatio: 0.25, fRatio: 0.35 
      },
      { 
        nombre: "Almuerzo", 
        detalles: "Pasta integral con pollo y salsa de tomate casera", 
        preparacion: "Hierve pasta integral. En otra sartén, saltea dados de pechuga de pollo y añade salsa de tomate triturado natural con especias. Mezcla todo antes de servir.",
        calRatio: 0.35, pRatio: 0.30, cRatio: 0.50, fRatio: 0.15 
      },
      { 
        nombre: "Cena", 
        detalles: "Filete de pescado blanco con vegetales al vapor", 
        preparacion: "Cocina al vapor un filete de merluza u otro pescado blanco junto con calabacín, zanahorias y judías verdes durante 12-15 minutos.",
        calRatio: 0.30, pRatio: 0.35, cRatio: 0.15, fRatio: 0.15 
      },
      { 
        nombre: "Snack", 
        detalles: "Un puñado de nueces mixtas", 
        preparacion: "Pesa e ingiere 30g de nueces, almendras y avellanas al natural sin sal.",
        calRatio: 0.10, pRatio: 0.10, cRatio: 0.05, fRatio: 0.35 
      }
    ]
  },
  {
    dia: "Viernes",
    comidas: [
      { 
        nombre: "Desayuno", 
        detalles: "Batido de proteína, avena, espinaca y mantequilla de maní", 
        preparacion: "Licúa en una batidora: 1 cazo de proteína, 40g de avena, un puñado de espinacas frescas, una cucharada de mantequilla de maní y 300ml de agua o leche de almendras.",
        calRatio: 0.25, pRatio: 0.30, cRatio: 0.30, fRatio: 0.25 
      },
      { 
        nombre: "Almuerzo", 
        detalles: "Fajitas de pollo con tortillas integrales y guacamole", 
        preparacion: "Saltea tiras de pollo con cebolla y pimiento. Rellena dos tortillas integrales calentadas y añade una cucharada de guacamole natural en cada una.",
        calRatio: 0.35, pRatio: 0.30, cRatio: 0.40, fRatio: 0.25 
      },
      { 
        nombre: "Cena", 
        detalles: "Ensalada César con pollo (aderezo ligero)", 
        preparacion: "Mezcla lechuga romana, pollo a la plancha en tiras y costrones de pan integral tostado. Adereza con yogur natural mezclado con limón, ajo en polvo y sal.",
        calRatio: 0.30, pRatio: 0.35, cRatio: 0.15, fRatio: 0.25 
      },
      { 
        nombre: "Snack", 
        detalles: "Gelatina sin azúcar y yogur", 
        preparacion: "Toma una porción de gelatina sin azúcar (alta en agua) y acompáñala con 125g de yogur desnatado natural.",
        calRatio: 0.10, pRatio: 0.15, cRatio: 0.05, fRatio: 0.00 
      }
    ]
  },
  {
    dia: "Sábado",
    comidas: [
      { 
        nombre: "Desayuno", 
        detalles: "Omelette de claras con jamón de pavo y tomate", 
        preparacion: "Bate 4 claras de huevo con sal y pimienta. Cocina en la sartén y añade dados de jamón de pavo y rodajas de tomate antes de doblar la tortilla a la mitad.",
        calRatio: 0.25, pRatio: 0.40, cRatio: 0.10, fRatio: 0.15 
      },
      { 
        nombre: "Almuerzo", 
        detalles: "Burger casera de ternera magra en pan integral", 
        preparacion: "Prepara una hamburguesa de ternera magra a la plancha. Sírvela en un pan de hamburguesa integral con hojas de espinaca, tomate y cebolla.",
        calRatio: 0.35, pRatio: 0.35, cRatio: 0.35, fRatio: 0.30 
      },
      { 
        nombre: "Cena", 
        detalles: "Sushi (salmón/atún) y edamames", 
        preparacion: "Consume una ración de sushi variado (preferiblemente nigiris o maki con pescados crudos) y edamames cocidos al vapor con una pizca de sal marina.",
        calRatio: 0.30, pRatio: 0.25, cRatio: 0.50, fRatio: 0.15 
      },
      { 
        nombre: "Snack", 
        detalles: "Fruta fresca de temporada", 
        preparacion: "Lava e ingiere una pieza de fruta fresca grande (ej: naranja, pera o una taza de fresas).",
        calRatio: 0.10, pRatio: 0.05, cRatio: 0.25, fRatio: 0.00 
      }
    ]
  },
  {
    dia: "Domingo",
    comidas: [
      { 
        nombre: "Desayuno", 
        detalles: "Tazón de acai con proteína y chía", 
        preparacion: "Mezcla pulpa de acai puro con hielo y un cazo de proteína. Sirve en un tazón y decora con semillas de chía y un puñado de bayas o fresas.",
        calRatio: 0.25, pRatio: 0.20, cRatio: 0.45, fRatio: 0.15 
      },
      { 
        nombre: "Almuerzo", 
        detalles: "Pollo al horno con patatas asadas", 
        preparacion: "Coloca muslos de pollo sin piel en una fuente para horno con patatas cortadas en rodajas. Hornea a 190°C por 45 minutos sazonando con tomillo, limón y sal.",
        calRatio: 0.35, pRatio: 0.35, cRatio: 0.40, fRatio: 0.20 
      },
      { 
        nombre: "Cena", 
        detalles: "Sopa de lentejas y verduras", 
        preparacion: "Calienta una porción de sopa de lentejas cocidas a fuego lento con zanahoria, cebolla, calabacín y tomate picado.",
        calRatio: 0.30, pRatio: 0.25, cRatio: 0.40, fRatio: 0.10 
      },
      { 
        nombre: "Snack", 
        detalles: "Chocolate negro (>85%) y almendras", 
        preparacion: "Consume 20g de chocolate negro de alta pureza (mínimo 85% cacao) y 10g de almendras crudas.",
        calRatio: 0.10, pRatio: 0.10, cRatio: 0.10, fRatio: 0.30 
      }
    ]
  }
];

export function generateWeeklyDiet(objetivo: string, caloriasObjetivo: number): DietIdea[] {
  let targetProt = 0.30, targetCarb = 0.40, targetFat = 0.30;
  
  if (objetivo?.toLowerCase() === 'volumen') {
    targetProt = 0.30; targetCarb = 0.50; targetFat = 0.20;
  } else if (objetivo?.toLowerCase() === 'definicion' || objetivo?.toLowerCase() === 'definición') {
    targetProt = 0.40; targetCarb = 0.30; targetFat = 0.30;
  }

  const totalProt = (caloriasObjetivo * targetProt) / 4;
  const totalCarb = (caloriasObjetivo * targetCarb) / 4;
  const totalFat = (caloriasObjetivo * targetFat) / 9;

  return templates.map(day => ({
    dia: day.dia,
    comidas: day.comidas.map(meal => {
      const p = Math.round(totalProt * (meal.pRatio / (day.comidas.reduce((s, m) => s + m.pRatio, 0))));
      const c = Math.round(totalCarb * (meal.cRatio / (day.comidas.reduce((s, m) => s + m.cRatio, 0))));
      const f = Math.round(totalFat * (meal.fRatio / (day.comidas.reduce((s, m) => s + m.fRatio, 0))));
      
      return {
        nombre: meal.nombre,
        detalles: meal.detalles,
        preparacion: meal.preparacion,
        proteinas: p,
        carbohidratos: c,
        grasas: f,
        calorias: (p * 4) + (c * 4) + (f * 9),
      };
    })
  }));
}
