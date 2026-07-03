import { prisma } from "@/lib/db";
import { baseCatalogEntries } from "@/lib/mock-data";
import type { ProductRecord, ProductSource } from "@/lib/types";

// Helper to gracefully fallback when DB is missing (for local dev without MySQL)
let _hasMySql = true;
async function isMySqlConfigured() {
  if (!_hasMySql) return false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (e) {
    _hasMySql = false;
    return false;
  }
}

function toPlainProduct(record: ProductRecord) {
  return {
    ...record,
    baseInfo: record.baseInfo
  };
}

export function normalizeInput(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/([a-z])(\d)/g, "$1 $2")
    .replace(/(\d)([a-z])/g, "$1 $2")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactText(text: string) {
  return text.replace(/\s+/g, "");
}

function getSearchVariants(text: string) {
  const normalized = normalizeInput(text);
  const compact = compactText(normalized);
  const tokens = normalized.split(/\s+/).filter(Boolean);

  return {
    normalized,
    compact,
    tokens
  };
}

function parseSourceMetadata(metadata: unknown) {
  if (typeof metadata !== "string" || !metadata.trim()) {
    return null;
  }

  try {
    return JSON.parse(metadata);
  } catch {
    return null;
  }
}

function getSourceCustomerName(source: ProductSource) {
  const metadata = parseSourceMetadata(source.metadata);
  return String(metadata?.customerName ?? "").trim();
}

function parseDeclaredAtToTimestamp(value: string | undefined) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return null;
  }

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return Date.UTC(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
  }

  const localMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (localMatch) {
    return Date.UTC(Number(localMatch[3]), Number(localMatch[2]) - 1, Number(localMatch[1]));
  }

  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? null : parsed;
}

function compareTextAsc(left: string | undefined, right: string | undefined) {
  return String(left ?? "").localeCompare(String(right ?? ""), "vi", {
    sensitivity: "base",
    numeric: true
  });
}

function sortDeclarationSources(sources: ProductSource[]) {
  return [...sources].sort((left, right) => {
    const leftDate = parseDeclaredAtToTimestamp(left.declaredAt);
    const rightDate = parseDeclaredAtToTimestamp(right.declaredAt);

    if (leftDate !== null && rightDate !== null && leftDate !== rightDate) {
      return rightDate - leftDate;
    }

    if (leftDate !== null && rightDate === null) {
      return -1;
    }

    if (leftDate === null && rightDate !== null) {
      return 1;
    }

    const byCustomerName = compareTextAsc(getSourceCustomerName(left), getSourceCustomerName(right));
    if (byCustomerName !== 0) {
      return byCustomerName;
    }

    return compareTextAsc(left.referenceCode, right.referenceCode);
  });
}

function sortProductsByName<T extends { name: string }>(products: T[]) {
  return [...products].sort((left, right) => compareTextAsc(left.name, right.name));
}

function scoreText(value: string | undefined | null, normalizedQuery: string) {
  if (!value) {
    return 0;
  }

  const normalizedValue = normalizeInput(value);

  if (!normalizedValue) {
    return 0;
  }

  const compactValue = compactText(normalizedValue);
  const compactQuery = compactText(normalizedQuery);

  if (normalizedValue === normalizedQuery) {
    return 100;
  }

  if (compactValue === compactQuery) {
    return 98;
  }

  if (normalizedValue.startsWith(normalizedQuery)) {
    return 95;
  }

  if (normalizedValue.includes(normalizedQuery)) {
    return 88;
  }

  if (compactValue.includes(compactQuery)) {
    return 84;
  }

  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const valueTokens = normalizedValue.split(/\s+/).filter(Boolean);
  const exactHits = queryTokens.filter((token) => valueTokens.includes(token)).length;
  const partialHits = queryTokens.filter((token) => {
    if (valueTokens.includes(token)) {
      return false;
    }

    return valueTokens.some((valueToken) => valueToken.includes(token) || token.includes(valueToken));
  }).length;

  if (exactHits === 0 && partialHits === 0) {
    return 0;
  }

  return Math.round((((exactHits * 1) + (partialHits * 0.6)) / queryTokens.length) * 75);
}

function scoreProduct(product: ProductRecord, normalizedQuery: string) {
  const candidateScores = [
    scoreText(product.name, normalizedQuery),
    ...((product.aliases ?? []).map((alias) => Math.round(scoreText(alias, normalizedQuery) * 0.97))),
    Math.round(scoreText(product.contractOrPo, normalizedQuery) * 0.8),
    ...((product.baseInfo ? [product.baseInfo] : []).concat(product.declarationHistory).flatMap((source) => ([
      Math.round(scoreText(source.brand, normalizedQuery) * 0.72),
      Math.round(scoreText(source.origin, normalizedQuery) * 0.55),
      Math.round(scoreText(source.hsCode, normalizedQuery) * 0.7),
      Math.round(scoreText(source.description, normalizedQuery) * 0.5),
      Math.round(scoreText(source.dimensions, normalizedQuery) * 0.45)
    ])))
  ];

  return Math.max(...candidateScores, 0);
}

function normalizeSource(source: ProductSource) {
  return {
    ...source,
    id: source.id
  };
}

export async function listProducts(query?: string) {
  const normalizedQuery = query ? normalizeInput(query) : undefined;
  const queryVariants = normalizedQuery ? getSearchVariants(normalizedQuery) : null;
  const dbConnected = await isMySqlConfigured();

  if (!dbConnected) {
    const items = baseCatalogEntries
      .map(toPlainProduct)
      .map((item) => ({
        ...item,
        declarationHistory: sortDeclarationSources(item.declarationHistory)
      }))
      .filter((item) => {
        if (!normalizedQuery) {
          return true;
        }

        return scoreProduct(item, normalizedQuery) >= 35;
      })
      .map((item) => ({
        ...item,
        matchScore: normalizedQuery ? scoreProduct(item, normalizedQuery) : 100
      }))
      .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));

    return normalizedQuery ? items : sortProductsByName(items);
  }

  const products = await prisma.product.findMany({
    where: queryVariants ? {
      OR: [
        { normalizedName: { contains: queryVariants.normalized } },
        { aliases: { contains: queryVariants.normalized } },
        { contractOrPo: { contains: queryVariants.normalized } },
        ...queryVariants.tokens.flatMap((token) => ([
          { normalizedName: { contains: token } },
          { aliases: { contains: token } },
          { contractOrPo: { contains: token } },
          {
            sources: {
              some: {
                OR: [
                  { brand: { contains: token } },
                  { origin: { contains: token } },
                  { hsCode: { contains: token } },
                  { description: { contains: token } },
                  { dimensions: { contains: token } }
                ]
              }
            }
          }
        ]))
      ]
    } : undefined,
    orderBy: { name: "asc" },
    include: { sources: true }
  });

  const mappedProducts = products.map((doc) => {
    const baseInfoSource = doc.sources.find(s => s.type === "manual");
    const declarationHistory = sortDeclarationSources(
      doc.sources.filter(s => s.type === "customs-declaration") as any as ProductSource[]
    );

    const product: ProductRecord = {
      id: doc.id,
      name: doc.name,
      normalizedName: doc.normalizedName,
      contractOrPo: doc.contractOrPo ?? undefined,
      aliases: (() => {
        if (!doc.aliases) return [];
        try {
          const parsed = JSON.parse(doc.aliases);
          return Array.isArray(parsed) ? parsed : [String(parsed)];
        } catch {
          return doc.aliases.split(',').map(s => s.trim()).filter(Boolean);
        }
      })(),
      baseInfo: baseInfoSource ? (baseInfoSource as any as ProductSource) : undefined,
      declarationHistory: declarationHistory
    };

    return {
      ...product,
      matchScore: normalizedQuery ? scoreProduct(product, normalizedQuery) : 100
    };
  }).filter((item) => !normalizedQuery || (item.matchScore ?? 0) >= 35);

  if (normalizedQuery) {
    return mappedProducts.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
  }

  return sortProductsByName(mappedProducts);
}

export async function getProductSources(id: string) {
  const dbConnected = await isMySqlConfigured();

  if (!dbConnected) {
    const product = baseCatalogEntries.find((item) => item.id === id);

    if (!product) {
      return null;
    }

    return {
      id: product.id,
      name: product.name,
      contractOrPo: product.contractOrPo,
      sources: [
        ...(product.baseInfo ? [normalizeSource(product.baseInfo)] : []),
        ...sortDeclarationSources(product.declarationHistory).map(normalizeSource)
      ] satisfies ProductSource[]
    };
  }

  const document = await prisma.product.findUnique({
    where: { id },
    include: { sources: true }
  });

  if (!document) {
    return null;
  }

  const baseInfoSource = document.sources.find(s => s.type === "manual");
  const declarationHistory = sortDeclarationSources(
    document.sources.filter(s => s.type === "customs-declaration") as any as ProductSource[]
  );

  return {
    id: document.id,
    name: document.name,
    contractOrPo: document.contractOrPo ?? undefined,
    sources: [
      ...(baseInfoSource ? [baseInfoSource as any as ProductSource] : []),
      ...declarationHistory.map(s => s as any as ProductSource)
    ] satisfies ProductSource[]
  };
}
