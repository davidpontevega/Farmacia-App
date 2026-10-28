// Consulta por síntoma: diccionario fijo y reglas puras. No diagnostica: orienta sobre qué hay en el local.
import { normalize } from "./text";

export type SymptomGroup = {
  /** Cómo lo dice el cliente (palabras clave). */
  keywords: string[];
  category: string;
  /** Principios activos relacionados. */
  ingredients: string[];
  description: string;
};

export const SYMPTOM_GROUPS: readonly SymptomGroup[] = [
  { keywords: ["dolor de cabeza", "cefalea", "jaqueca", "migraña", "cabeza"], category: "Analgésico", ingredients: ["paracetamol", "ibuprofeno", "naproxeno", "aspirina", "metamizol"], description: "Para el dolor de cabeza y cefalea" },
  { keywords: ["fiebre", "temperatura", "calentura", "febril"], category: "Analgésico", ingredients: ["paracetamol", "ibuprofeno", "metamizol", "naproxeno"], description: "Para reducir la fiebre" },
  { keywords: ["dolor de garganta", "garganta", "amigdalitis", "faringitis", "anginas"], category: "Antibiótico", ingredients: ["amoxicilina", "azitromicina", "cefalexina", "ibuprofeno", "paracetamol"], description: "Para infecciones de garganta" },
  { keywords: ["tos", "bronquitis", "catarro", "resfrio", "resfriado", "gripe"], category: "Antigripal", ingredients: ["ambroxol", "bromhexina", "dextrometorfano", "guaifenesina", "paracetamol"], description: "Para la tos y resfriados" },
  { keywords: ["estomago", "gastritis", "acidez", "reflujo", "ardor estomacal"], category: "Gastroprotector", ingredients: ["omeprazol", "ranitidina", "esomeprazol", "pantoprazol", "famotidina"], description: "Para la gastritis y acidez estomacal" },
  { keywords: ["nauseas", "vomito", "mareo", "mareos"], category: "Antiemético", ingredients: ["metoclopramida", "dimenhidrinato", "domperidona", "ondansetron"], description: "Para náuseas y vómitos" },
  { keywords: ["diarrea", "intestino", "colitis", "deposiciones"], category: "Antidiarreico", ingredients: ["loperamida", "bismuto", "sales de rehidratacion", "ciprofloxacino"], description: "Para la diarrea" },
  { keywords: ["estreñimiento", "constipacion", "no puedo ir al baño"], category: "Laxante", ingredients: ["bisacodilo", "lactulosa", "polietilenglicol", "sen"], description: "Para el estreñimiento" },
  { keywords: ["presion alta", "hipertension", "tension alta"], category: "Antihipertensivo", ingredients: ["enalapril", "losartan", "amlodipino", "captopril", "metoprolol"], description: "Para la presión arterial alta" },
  { keywords: ["diabetes", "azucar alta", "glucosa alta"], category: "Antidiabético", ingredients: ["metformina", "glibenclamida", "glimepirida", "sitagliptina"], description: "Para controlar el azúcar en sangre" },
  { keywords: ["riñones", "riñon", "infeccion urinaria", "orina", "cistitis"], category: "Antibiótico", ingredients: ["ciprofloxacino", "norfloxacino", "nitrofurantoina", "trimetoprim", "fosfomicina"], description: "Para infecciones urinarias y del tracto renal" },
  { keywords: ["dolor muscular", "musculos", "contractura", "lumbar", "espalda"], category: "Analgésico", ingredients: ["ibuprofeno", "naproxeno", "diclofenaco", "metocarbamol", "paracetamol"], description: "Para el dolor muscular" },
  { keywords: ["alergia", "picazon", "urticaria", "rinitis", "estornudos"], category: "Antihistamínico", ingredients: ["loratadina", "cetirizina", "fexofenadina", "clorfenamina", "desloratadina"], description: "Para alergias y picazón" },
  { keywords: ["hongos", "candida", "micosis", "pie de atleta", "candidiasis"], category: "Antifúngico", ingredients: ["fluconazol", "clotrimazol", "miconazol", "terbinafina", "ketoconazol"], description: "Para infecciones por hongos" },
  { keywords: ["parasitos", "lombrices", "oxiuros", "amebas", "giardia"], category: "Antiparasitario", ingredients: ["albendazol", "mebendazol", "metronidazol", "tinidazol"], description: "Para infecciones parasitarias" },
  { keywords: ["vitaminas", "vitamina", "defensas", "sistema inmune", "cansancio", "debilidad"], category: "Vitaminas", ingredients: ["vitamina c", "vitamina d", "zinc", "complejo b", "hierro", "calcio"], description: "Para fortalecer el sistema inmune" },
  { keywords: ["dolor de oido", "oido", "otitis"], category: "Antibiótico", ingredients: ["amoxicilina", "ciprofloxacino", "azitromicina", "paracetamol"], description: "Para infecciones de oído" },
  { keywords: ["conjuntivitis", "ojo rojo", "ojos", "irritacion ocular"], category: "Antibiótico", ingredients: ["tobramicina", "ciprofloxacino oftalmico", "cloranfenicol"], description: "Para infecciones oculares" },
  { keywords: ["anemia", "hierro", "hemoglobina baja", "sangre"], category: "Vitaminas", ingredients: ["sulfato ferroso", "hierro", "acido folico", "vitamina b12"], description: "Para la anemia y falta de hierro" },
  { keywords: ["dolor de muela", "muela", "diente", "dental", "encia"], category: "Analgésico", ingredients: ["ibuprofeno", "paracetamol", "naproxeno", "amoxicilina", "diclofenaco"], description: "Para el dolor dental" },
  { keywords: ["insomnio", "no puedo dormir", "dormir", "sueño"], category: "Otro", ingredients: ["melatonina", "valeriana", "difenhidramina"], description: "Para conciliar el sueño" },
  { keywords: ["ansiedad", "nervios", "estres", "tension"], category: "Otro", ingredients: ["valeriana", "passiflora", "tilo"], description: "Para la ansiedad y el estrés" },
  { keywords: ["dolor abdominal", "abdomen", "vientre", "retortijon", "colicos", "menstruales"], category: "Antiespasmódico", ingredients: ["butilhioscina", "diciclomina", "paracetamol"], description: "Para dolor abdominal y cólicos" },
  // Spec 021: situaciones comunes de botica. Borrador técnico: debe revisarlo un químico farmacéutico antes de usarse con clientes.
  { keywords: ["acne", "granos", "espinillas", "barros"], category: "Dermatológico", ingredients: ["peroxido de benzoilo", "acido salicilico", "adapaleno", "clindamicina"], description: "Para el acné y los granos" },
  { keywords: ["quemadura", "quemaduras", "quemadura de sol", "me queme", "insolacion"], category: "Dermatológico", ingredients: ["sulfadiazina de plata", "dexpantenol", "aloe vera"], description: "Para quemaduras leves y quemadura de sol" },
  { keywords: ["herpes", "herpes labial", "ampolla en el labio"], category: "Antiviral", ingredients: ["aciclovir"], description: "Para el herpes labial" },
  { keywords: ["hemorroides", "almorranas", "fisura anal"], category: "Dermatológico", ingredients: ["lidocaina", "hidrocortisona", "diosmina", "hesperidina", "hamamelis"], description: "Para hemorroides" },
  { keywords: ["piojos", "pediculosis", "liendres"], category: "Antiparasitario", ingredients: ["permetrina", "dimeticona", "ivermectina"], description: "Para piojos y liendres" },
  { keywords: ["congestion nasal", "nariz tapada", "sinusitis", "mocos", "rinorrea"], category: "Descongestionante", ingredients: ["oximetazolina", "xilometazolina", "suero fisiologico"], description: "Para la congestión nasal y la sinusitis" },
  { keywords: ["dolor de rodilla", "artrosis", "artritis", "articulaciones", "dolor de huesos", "reumatismo"], category: "Analgésico", ingredients: ["diclofenaco", "naproxeno", "ibuprofeno", "glucosamina", "condroitina"], description: "Para el dolor articular" },
  { keywords: ["varices", "piernas cansadas", "piernas hinchadas", "circulacion"], category: "Vascular", ingredients: ["diosmina", "hesperidina", "castaño de indias", "troxerrutina"], description: "Para piernas cansadas y várices" },
  { keywords: ["aftas", "llagas en la boca", "dolor de boca", "llaga en la boca"], category: "Bucal", ingredients: ["clorhexidina", "benzocaina", "lidocaina", "acido hialuronico"], description: "Para aftas y llagas en la boca" },
  { keywords: ["pañalitis", "irritacion del pañal", "dermatitis", "rozadura", "salpullido", "sarpullido"], category: "Dermatológico", ingredients: ["oxido de zinc", "dexpantenol", "hidrocortisona", "clotrimazol"], description: "Para pañalitis, rozaduras y dermatitis" },
  { keywords: ["picadura", "zancudo", "mosquito", "pulgas", "piquete"], category: "Dermatológico", ingredients: ["hidrocortisona", "calamina", "difenhidramina", "loratadina", "cetirizina"], description: "Para picaduras de insectos" },
  { keywords: ["ojo seco", "resequedad ocular", "lagrimas artificiales", "ardor ocular"], category: "Oftálmico", ingredients: ["hialuronato de sodio", "carboximetilcelulosa", "hipromelosa", "polietilenglicol"], description: "Para el ojo seco" },
  { keywords: ["colesterol", "trigliceridos", "acido urico", "podagra"], category: "Metabólico", ingredients: ["atorvastatina", "simvastatina", "omega 3", "alopurinol", "colchicina"], description: "Para el colesterol y el ácido úrico" },
  { keywords: ["deshidratacion", "suero oral", "rehidratacion", "sed intensa"], category: "Hidratación", ingredients: ["sales de rehidratacion oral", "suero oral", "electrolitos"], description: "Para la deshidratación" },
];

/** Principios que solo se venden con receta (antibióticos, antihipertensivos, antidiabéticos, antieméticos, estatinas, antivirales, antigotosos). Los psicotrópicos (alprazolam…) no se sugieren. */
const RX = new Set(
  [
    "amoxicilina", "azitromicina", "cefalexina", "ciprofloxacino", "ciprofloxacino oftalmico", "norfloxacino", "nitrofurantoina", "trimetoprim", "fosfomicina", "tobramicina", "cloranfenicol", "metronidazol", "tinidazol",
    "enalapril", "losartan", "amlodipino", "captopril", "metoprolol",
    "metformina", "glibenclamida", "glimepirida", "sitagliptina",
    "ondansetron", "metoclopramida",
    "adapaleno", "clindamicina", "sulfadiazina de plata", "aciclovir", "ivermectina",
    "atorvastatina", "simvastatina", "alopurinol", "colchicina",
  ].map(normalize),
);

export const requiresRx = (ingredient: string) => RX.has(normalize(ingredient));

export const MEDICAL_NOTICE = "Se recomienda consultar con un médico para un diagnóstico adecuado";

export const QUICK_QUERIES = ["dolor de cabeza", "fiebre", "pastilla para los riñones", "dolor de estómago", "alergia", "tos", "vitaminas", "presión alta"];

export { normalize };

// Palabras de relleno: no describen ningún síntoma y «para» está dentro de «paracetamol».
const FILLER = new Set(["para", "algo", "tengo", "tiene", "tienen", "pastilla", "pastillas", "crema", "jarabe", "como", "mucho", "mucha", "quiero", "necesito", "medicina", "medicinas", "remedio", "contra", "esta", "estoy", "unos", "unas", "sobre", "desde", "hasta", "porque", "cuando", "donde", "pero", "tambien", "dame", "dar"]);

const NORMALIZED = SYMPTOM_GROUPS.map((g) => ({ group: g, keywords: g.keywords.map(normalize), ingredients: g.ingredients.map(normalize) }));

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * La clave aparece al comienzo de alguna palabra del texto: «alergias» contiene «alergia», pero «piojos» no contiene «ojos».
 * Antes bastaba con que el texto la contuviera en cualquier parte y «piojos» sugería antibióticos para los ojos.
 */
export const hasKeyword = (text: string, keyword: string) => new RegExp(`(?:^|[^a-z0-9])${escapeRe(keyword)}`).test(text);

export type Interpretation =
  | { found: true; description: string; ingredients: string[] }
  | { found: false; suggestions: string[] };

/** Qué grupos de síntomas describe lo escrito: por frase completa y, si no hay, palabra por palabra. */
export function interpret(query: string): Interpretation {
  const q = normalize(query);
  let hits = NORMALIZED.filter((g) => g.keywords.some((k) => hasKeyword(q, k)));
  if (hits.length === 0) {
    const words = q.split(" ").filter((w) => w.length > 3 && !FILLER.has(w));
    hits = NORMALIZED.filter((g) => words.some((w) => g.keywords.some((k) => k.includes(w)) || g.ingredients.some((i) => i.split(" ").some((t) => t.startsWith(w)))));
  }
  if (hits.length === 0) return { found: false, suggestions: SYMPTOM_GROUPS.slice(0, 6).map((g) => g.keywords[0]) };
  return {
    found: true,
    description: hits[0].group.description,
    ingredients: [...new Set(hits.flatMap((g) => g.ingredients))],
  };
}

export type ConsultProduct = {
  id: string;
  commercialName: string;
  genericName: string | null;
  salePrice: number;
  sellableStock: number;
  shelf: string | null;
  shelfRow: string | null;
  aliases?: readonly string[];
};

export type ConsultResult<P extends ConsultProduct> = {
  /** Productos activos cuyo nombre comercial o genérico contiene algún principio; con stock primero. */
  products: (P & { requiresRx: boolean })[];
  /** Principios que no están en el catálogo, como referencia (máximo 3). */
  references: string[];
};

/** Cruza los principios con el catálogo. Un producto sin nombre genérico solo coincide por su nombre comercial. */
export function matchProducts<P extends ConsultProduct>(ingredients: string[], catalog: P[]): ConsultResult<P> {
  const covered = new Set<string>();
  const products = catalog.flatMap((p) => {
    const names = [normalize(p.commercialName), p.genericName ? normalize(p.genericName) : "", ...(p.aliases ?? []).map(normalize)];
    const hit = ingredients.filter((i) => names.some((n) => n.includes(i)));
    hit.forEach((i) => covered.add(i));
    return hit.length > 0 ? [{ ...p, requiresRx: hit.some(requiresRx) }] : [];
  });
  products.sort((a, b) => Number(b.sellableStock > 0) - Number(a.sellableStock > 0) || a.commercialName.localeCompare(b.commercialName, "es"));
  return { products, references: ingredients.filter((i) => !covered.has(i)).slice(0, 3) };
}
