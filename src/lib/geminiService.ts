import type { DietIdea } from './dietAlgorithm';

// Helper genérico para realizar llamadas seguras a Gemini con bucle de modelos (fallback)
async function callGemini(
  apiKey: string,
  prompt: string,
  systemInstruction: string,
  responseSchema: any
): Promise<string> {
  const models = ['gemini-1.5-flash', 'gemini-2.5-flash', 'gemini-3.5-flash', 'gemini-1.5-pro'];
  let lastError: any = null;

  for (const model of models) {
    try {
      console.log(`[Gemini IA] Intentando conectar con el modelo: ${model}...`);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ],
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          },
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: responseSchema
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Código ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!textResponse) {
        throw new Error("Respuesta vacía del servidor.");
      }

      console.log(`[Gemini IA] Respuesta exitosa con el modelo: ${model}`);
      return textResponse;

    } catch (error: any) {
      console.warn(`[Gemini IA] Error con el modelo ${model}:`, error.message || error);
      lastError = error;
    }
  }

  throw new Error(`Fallo en todos los modelos de Gemini. Último error: ${lastError?.message || lastError}`);
}

// 1. GENERAR DIETA SEMANAL COMPLETA CON IA
export async function generateDietWithGemini(
  apiKey: string,
  user: {
    nombre: string;
    peso_actual: number;
    altura: number;
    edad: number;
    objetivo: string;
    calorias_objetivo: number;
  }
): Promise<DietIdea[]> {
  const prompt = `
    Genera un plan de dieta semanal de 7 días (Lunes a Domingo) personalizado para el siguiente usuario:
    - Nombre: ${user.nombre}
    - Peso: ${user.peso_actual} kg
    - Altura: ${user.altura} cm
    - Edad: ${user.edad} años
    - Objetivo de fitness: ${user.objetivo}
    - Calorías diarias deseadas: ${user.calorias_objetivo} kcal
    
    Cada día debe tener exactamente 4 comidas con los nombres de categoría exactos: "Desayuno", "Almuerzo", "Cena" y "Snack".
    Asegúrate de que la suma diaria de calorías sea aproximadamente de ${user.calorias_objetivo} kcal.
    La distribución de macros recomendada según su objetivo es:
    - Para Volumen: Alto en carbohidratos, moderado en proteínas y bajo-moderado en grasas.
    - Para Definición: Alto en proteínas, moderado-bajo en carbohidratos, moderado en grasas.
    - Para Mantenimiento: Balanceado.
    
    Añade instrucciones de preparación muy claras y detalladas en el campo "preparacion" de cada comida.
  `;

  const systemInstruction = "Eres un nutricionista deportivo profesional y un chef saludable. Generas planes de comidas sabrosos, altos en proteína, fáciles de preparar y alineados perfectamente con las calorías y macronutrientes solicitados.";

  const schema = {
    type: "ARRAY",
    description: "Plan de dieta de 7 días (Lunes a Domingo) con 4 comidas por día",
    items: {
      type: "OBJECT",
      properties: {
        dia: { type: "STRING", description: "Nombre del día de la semana (ej: Lunes, Martes...)" },
        comidas: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              nombre: { type: "STRING", description: "Categoría de la comida (Debe ser exactamente: Desayuno, Almuerzo, Cena, Snack)" },
              detalles: { type: "STRING", description: "Nombre descriptivo del plato saludable" },
              preparacion: { type: "STRING", description: "Receta e instrucciones detalladas de preparación paso a paso en español" },
              calorias: { type: "INTEGER", description: "Calorías calculadas para este plato" },
              proteinas: { type: "INTEGER", description: "Gramos de proteína del plato" },
              carbohidratos: { type: "INTEGER", description: "Gramos de carbohidratos del plato" },
              grasas: { type: "INTEGER", description: "Gramos de grasa del plato" }
            },
            required: ["nombre", "detalles", "preparacion", "calorias", "proteinas", "carbohidratos", "grasas"]
          }
        }
      },
      required: ["dia", "comidas"]
    }
  };

  const jsonResponse = await callGemini(apiKey, prompt, systemInstruction, schema);
  return JSON.parse(jsonResponse);
}

// 2. REGENERAR COMIDA INDIVIDUAL
export async function regenerateSingleMeal(
  apiKey: string,
  user: { objetivo: string; calorias_objetivo: number },
  mealName: string,
  previousMealDetails: string
): Promise<DietIdea['comidas'][0]> {
  const prompt = `
    Necesito una alternativa de comida para la categoría "${mealName}".
    El plato anterior era: "${previousMealDetails}".
    Por favor, genera un plato completamente diferente, delicioso y saludable.
    El plan dietético general del usuario es de ${user.calorias_objetivo} kcal con el objetivo de "${user.objetivo}".
    La comida generada debe ser adecuada para esta categoría y tener un aporte calórico y de macronutrientes proporcional a lo que requiere la comida.
    Añade instrucciones paso a paso muy claras y detalladas de preparación en el campo "preparacion".
  `;

  const systemInstruction = "Eres un chef saludable y experto en nutrición fitness. Generas una única sugerencia de plato alternativa, con sus calorías y macros estimados correspondientes, más su receta de cocinado.";

  const schema = {
    type: "OBJECT",
    properties: {
      nombre: { type: "STRING", description: "Debe ser exactamente la categoría solicitada: Desayuno, Almuerzo, Cena, Snack" },
      detalles: { type: "STRING", description: "Nombre del nuevo plato" },
      preparacion: { type: "STRING", description: "Instrucciones de preparación detalladas paso a paso en español" },
      calorias: { type: "INTEGER", description: "Calorías calculadas" },
      proteinas: { type: "INTEGER", description: "Gramos de proteína" },
      carbohidratos: { type: "INTEGER", description: "Gramos de carbohidratos" },
      grasas: { type: "INTEGER", description: "Gramos de grasa" }
    },
    required: ["nombre", "detalles", "preparacion", "calorias", "proteinas", "carbohidratos", "grasas"]
  };

  const jsonResponse = await callGemini(apiKey, prompt, systemInstruction, schema);
  return JSON.parse(jsonResponse);
}

// 3. ANALIZAR TEXTO DE COMIDA PARA REGISTRO DIARIO
export interface FoodAnalysisResult {
  nombre_comida: string;
  detalles: string;
  calorias: number;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
}

export async function analyzeFoodText(
  apiKey: string,
  text: string
): Promise<FoodAnalysisResult> {
  const prompt = `
    Analiza la siguiente comida que el usuario consumió o quiere consumir:
    "${text}"
    
    Estima sus calorías y macronutrientes (proteínas, carbohidratos, grasas) basándote en proporciones típicas e ingredientes descritos.
    Clasifica la comida en una de las categorías estándar: "Desayuno", "Almuerzo", "Cena" o "Snack".
    Genera un nombre claro y resumido para el plato en el campo "detalles" (ej: "Tortilla de 3 huevos y tostada").
  `;

  const systemInstruction = "Eres una base de datos nutricional con inteligencia artificial. Estimas con precisión calorías y macros de platos descritos en lenguaje natural.";

  const schema = {
    type: "OBJECT",
    properties: {
      nombre_comida: { type: "STRING", description: "Debe ser exactamente una de estas categorías: Desayuno, Almuerzo, Cena, Snack" },
      detalles: { type: "STRING", description: "Resumen corto y legible del plato" },
      calorias: { type: "INTEGER", description: "Calorías estimadas en kcal" },
      proteinas: { type: "INTEGER", description: "Gramos de proteína estimados" },
      carbohidratos: { type: "INTEGER", description: "Gramos de carbohidratos estimados" },
      grasas: { type: "INTEGER", description: "Gramos de grasa estimados" }
    },
    required: ["nombre_comida", "detalles", "calorias", "proteinas", "carbohidratos", "grasas"]
  };

  const jsonResponse = await callGemini(apiKey, prompt, systemInstruction, schema);
  return JSON.parse(jsonResponse);
}

// 4. GENERAR RUTINA DE ENTRENAMIENTO COMPLETA
export interface WorkoutAnalysisResult {
  plantillas: {
    nombre_plantilla: string;
    ejercicios: {
      nombre: string;
      series_objetivo: number;
      repeticiones_objetivo: string;
      es_tiempo: boolean;
      descripcion: string;
      tiempo_reposo: number;
    }[];
  }[];
}

export async function generateWorkoutWithGemini(
  apiKey: string,
  intention: string,
  user: {
    objetivo?: string;
    peso_actual?: number;
    altura?: number;
    edad?: number;
  }
): Promise<WorkoutAnalysisResult> {
  const prompt = `
    Crea una rutina de entrenamiento completa basada en la siguiente solicitud e intención del usuario:
    "${intention}"
    
    Datos físicos del usuario para adaptar la dificultad e intensidad:
    - Objetivo general: ${user.objetivo || 'No especificado'}
    - Peso: ${user.peso_actual || 'No especificado'} kg
    - Altura: ${user.altura || 'No especificado'} cm
    - Edad: ${user.edad || 'No especificado'} años
    
    Debes estructurar el plan en múltiples "Plantillas" (sesiones de entrenamiento separadas). Por ejemplo, si el usuario pide entrenar 3 días, genera 3 plantillas (ej: "Plantilla 1: Empuje", "Plantilla 2: Tirón", "Plantilla 3: Pierna").
    Asegúrate de que cada ejercicio contenga series (usualmente 3-5), repeticiones (ej: '10', '8-12', 'Fallo', '60s' si es de tiempo) y un tiempo de reposo en segundos recomendado (usualmente 60, 90, 120).
  `;

  const systemInstruction = "Eres un entrenador personal certificado y experto en fisiología deportiva. Generas rutinas de ejercicios completas, seguras, estructuradas de forma óptima según la ciencia del deporte.";

  const schema = {
    type: "OBJECT",
    properties: {
      plantillas: {
        type: "ARRAY",
        description: "Lista de plantillas de entrenamiento (sesiones)",
        items: {
          type: "OBJECT",
          properties: {
            nombre_plantilla: { type: "STRING", description: "Nombre descriptivo de la sesión, ej: 'Día 1: Empuje'" },
            ejercicios: {
              type: "ARRAY",
              description: "Lista de ejercicios para esta plantilla",
              items: {
                type: "OBJECT",
                properties: {
                  nombre: { type: "STRING", description: "Nombre del ejercicio, ej: Sentadilla libre con barra" },
                  series_objetivo: { type: "INTEGER", description: "Número de series del ejercicio" },
                  repeticiones_objetivo: { type: "STRING", description: "Rango o repeticiones, ej: '8-12', '12', 'Fallo', '30s'" },
                  es_tiempo: { type: "BOOLEAN", description: "Verdadero si el ejercicio se mide por segundos/tiempo (planchas, isométricos)" },
                  descripcion: { type: "STRING", description: "Breve explicación técnica de cómo realizar el ejercicio correctamente" },
                  tiempo_reposo: { type: "INTEGER", description: "Tiempo de descanso entre series recomendado en segundos" }
                },
                required: ["nombre", "series_objetivo", "repeticiones_objetivo", "es_tiempo", "descripcion", "tiempo_reposo"]
              }
            }
          },
          required: ["nombre_plantilla", "ejercicios"]
        }
      }
    },
    required: ["plantillas"]
  };

  const jsonResponse = await callGemini(apiKey, prompt, systemInstruction, schema);
  return JSON.parse(jsonResponse);
}

// Nueva función para analizar deportes con IA
export async function analyzeSportText(
  apiKey: string, 
  textoUsuario: string, 
  pesoUsuario: number
): Promise<{ nombre_deporte: string, duracion_minutos: number, calorias_quemadas: number }> {
  
  const prompt = `Analiza este texto del usuario y extrae la actividad deportiva: "${textoUsuario}". El peso actual del usuario es ${pesoUsuario} kg.`;
  
  const systemInstruction = `Eres un experto fisiólogo del ejercicio. El usuario te proporcionará un texto en el que menciona una actividad deportiva o física que ha realizado y su duración aproximada.
Tu objetivo es extraer:
1. El nombre formal del deporte/actividad.
2. La duración en minutos (infiere si te dice 'una hora', 'media hora').
3. Estimar las calorías quemadas (kcal) teniendo en cuenta el peso del usuario y la duración/intensidad del ejercicio usando METs aproximados.

Devuelve estricto formato JSON según el esquema. Si no entiendes la duración, estima 30 minutos.`;

  const schema = {
    type: "OBJECT",
    properties: {
      nombre_deporte: { type: "STRING", description: "Nombre claro del deporte, ej: Pádel intenso, Natación" },
      duracion_minutos: { type: "INTEGER", description: "Duración en minutos de la actividad" },
      calorias_quemadas: { type: "INTEGER", description: "Calorías quemadas estimadas (kcal)" }
    },
    required: ["nombre_deporte", "duracion_minutos", "calorias_quemadas"]
  };

  const jsonResponse = await callGemini(apiKey, prompt, systemInstruction, schema);
  return JSON.parse(jsonResponse);
}

// 6. ANALIZAR PROMPT LIBRE DEL USUARIO PARA AUTOCONFIGURAR APP
export interface UserProfileAnalysisResult {
  edad: number | null;
  peso: number | null;
  altura: number | null;
  objetivo: string;
  calorias_objetivo: number;
  workout_intention: string;
}

export async function analyzeUserPrompt(
  apiKey: string,
  promptText: string,
  currentProfile: any
): Promise<UserProfileAnalysisResult> {
  const prompt = `
    El usuario quiere configurar su plan de entrenamiento y dieta. Ha escrito lo siguiente:
    "${promptText}"
    
    Perfil actual (si no se menciona en el texto, usa estos datos como fallback):
    Edad: ${currentProfile.edad || 'Desconocida'}
    Peso: ${currentProfile.peso_actual || 'Desconocido'} kg
    Altura: ${currentProfile.altura || 'Desconocida'} cm
    Objetivo Actual: ${currentProfile.objetivo || 'Mantenimiento'}
    
    Tu tarea:
    1. Extrae o deduce la edad, peso y altura si el usuario los menciona (si no, usa los actuales).
    2. Deduce el objetivo principal (elige estrictamente entre: "Perder Peso", "Ganar Masa" o "Mantenimiento").
    3. Calcula un objetivo de calorías diarias recomendado (kcal) usando la fórmula de Harris-Benedict (o similar) y aplicando un déficit/superávit según su objetivo.
    4. Resume las intenciones de entrenamiento (material disponible, días a la semana, limitaciones, etc.) en un párrafo claro. Este resumen se pasará luego a otra IA para generar las rutinas.
  `;

  const systemInstruction = "Eres un Asistente Entrenador de IA. Analizas descripciones de usuarios para extraer datos estructurados y preparar resúmenes de rutinas.";

  const schema = {
    type: "OBJECT",
    properties: {
      edad: { type: "INTEGER", description: "Edad en años (null si no se sabe)", nullable: true },
      peso: { type: "INTEGER", description: "Peso en kg (null si no se sabe)", nullable: true },
      altura: { type: "INTEGER", description: "Altura en cm (null si no se sabe)", nullable: true },
      objetivo: { type: "STRING", description: "Debe ser exactamente: 'Perder Peso', 'Ganar Masa' o 'Mantenimiento'" },
      calorias_objetivo: { type: "INTEGER", description: "Calorías diarias calculadas/recomendadas" },
      workout_intention: { type: "STRING", description: "Resumen detallado de cómo, cuánto y con qué quiere entrenar el usuario (días, material, gimnasio vs casa, etc.)" }
    },
    required: ["objetivo", "calorias_objetivo", "workout_intention"]
  };

  const jsonResponse = await callGemini(apiKey, prompt, systemInstruction, schema);
  return JSON.parse(jsonResponse);
}

// 7. AUTO-COMPLETAR EJERCICIO CON IA SEGÚN EL NOMBRE
export interface ExerciseAISuggestion {
  es_tiempo: boolean;
  descripcion: string;
  met_value: number;
  tiempo_reposo: number;
  series_objetivo: number;
  repeticiones_objetivo: string;
  musculo_principal: string;
}

export async function generateExerciseDetailsWithGemini(
  apiKey: string,
  exerciseName: string
): Promise<ExerciseAISuggestion> {
  const prompt = `
    Dada la actividad física o nombre de ejercicio: "${exerciseName}", determina lo siguiente:
    1. Si es un ejercicio típicamente de fuerza/musculación tradicional por repeticiones o por tiempo/isométrico.
    2. Proporciona una explicación técnica y consejos de ejecución cortos en español en el campo "descripcion".
    3. Estima su valor MET (gasto metabólico equivalente) aproximado. Por ejemplo: Press de banca = 6.0, Sentadillas = 6.0, Correr = 9.0, Planchas = 4.0, TRX = 5.0, estiramiento = 2.5.
    4. Recomienda el número de series (series_objetivo) por defecto, usualmente 3 o 4.
    5. Recomienda el número o rango de repeticiones (repeticiones_objetivo) por defecto (ej: '10', '8-12', o '60s' si es por tiempo).
    6. Recomienda el descanso entre series recomendado (tiempo_reposo) en segundos (ej: 90 para pesas, 60 para abs, 120 para ejercicios compuestos pesados).
    7. Identifica el grupo muscular principal trabajado en español (musculo_principal) (ej: 'Pecho', 'Piernas', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps', 'Core', 'Cardio').
  `;

  const systemInstruction = "Eres un entrenador personal inteligente. Analizas nombres de ejercicios para rellenar de forma coherente sus especificaciones deportivas por defecto.";

  const schema = {
    type: "OBJECT",
    properties: {
      es_tiempo: { type: "BOOLEAN", description: "Verdadero si el ejercicio se mide típicamente por tiempo (planchas, cardio, estiramiento) en lugar de repeticiones" },
      descripcion: { type: "STRING", description: "Breve explicación técnica de cómo realizar el ejercicio correctamente" },
      met_value: { type: "NUMBER", description: "Valor de gasto metabólico (MET) para el cálculo calórico" },
      tiempo_reposo: { type: "INTEGER", description: "Tiempo de descanso óptimo recomendado en segundos" },
      series_objetivo: { type: "INTEGER", description: "Series recomendadas por defecto" },
      repeticiones_objetivo: { type: "STRING", description: "Repeticiones recomendadas por defecto, ej: '10', '8-12' o '45s'" },
      musculo_principal: { type: "STRING", description: "Grupo muscular principal trabajado" }
    },
    required: ["es_tiempo", "descripcion", "met_value", "tiempo_reposo", "series_objetivo", "repeticiones_objetivo", "musculo_principal"]
  };

  const jsonResponse = await callGemini(apiKey, prompt, systemInstruction, schema);
  return JSON.parse(jsonResponse);
}

