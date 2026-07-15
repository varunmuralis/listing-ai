import type { Property } from "@/types/domain";
import { formatCurrency, formatNumber } from "@/lib/utils";

/** Read-only facts grid. Missing values render an intentional "Not provided". */
export function PropertyFacts({ property }: { property: Property | null }) {
  const facts: Array<{ label: string; value: string | null }> = [
    { label: "Price", value: property?.price != null ? formatCurrency(property.price) : null },
    { label: "Bedrooms", value: property?.bedrooms != null ? String(property.bedrooms) : null },
    { label: "Bathrooms", value: property?.bathrooms != null ? String(property.bathrooms) : null },
    { label: "Square feet", value: property?.squareFeet != null ? formatNumber(property.squareFeet) : null },
    { label: "Lot size (sq ft)", value: property?.lotSize != null ? formatNumber(property.lotSize) : null },
    { label: "Year built", value: property?.yearBuilt != null ? String(property.yearBuilt) : null },
    { label: "HOA (monthly)", value: property?.hoaMonthly != null ? formatCurrency(property.hoaMonthly) : null },
    {
      label: "Annual property tax",
      value: property?.annualPropertyTax != null ? formatCurrency(property.annualPropertyTax) : null,
    },
  ];

  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4">
      {facts.map((fact) => (
        <div key={fact.label} className="bg-card p-4">
          <dt className="eyebrow">{fact.label}</dt>
          <dd className={fact.value ? "mt-1.5 text-lg font-semibold tabular-nums" : "mt-1.5 text-sm text-muted-foreground"}>
            {fact.value ?? "Not provided"}
          </dd>
        </div>
      ))}
    </dl>
  );
}
