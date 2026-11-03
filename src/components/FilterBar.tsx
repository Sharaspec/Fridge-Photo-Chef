import { DIETS, MAX_MINUTES, MEALS, type Filters } from "../../shared/filters";

interface Props {
  filters: Filters;
  onChange: (next: Filters) => void;
}

const DIET_LABELS: Record<(typeof DIETS)[number], string> = {
  vegetarian: "Vegetarian",
  vegan: "Vegan",
  "high-protein": "High-protein",
};

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/** PRD F8: meal type, video length and diet, as accessible radio "pills". */
export function FilterBar({ filters, onChange }: Props) {
  const active = [filters.meal, filters.maxMinutes, filters.diet].filter(Boolean).length;
  return (
    <details className="filters" open={active > 0 || undefined}>
      <summary>
        Filters{active > 0 && <span className="filters__count">{active}</span>}
        <span className="filters__optional">optional</span>
      </summary>
      <div className="filters__body">
        <PillGroup
          legend="Meal"
          name="meal"
          value={filters.meal ?? ""}
          options={[["", "Any"], ...MEALS.map((m) => [m, cap(m)] as [string, string])]}
          onChange={(v) => onChange({ ...filters, meal: (v || undefined) as Filters["meal"] })}
        />
        <PillGroup
          legend="Video length"
          name="max"
          value={String(filters.maxMinutes ?? "")}
          options={[["", "Any"], ...MAX_MINUTES.map((m) => [String(m), `Under ${m} min`] as [string, string])]}
          onChange={(v) => onChange({ ...filters, maxMinutes: (v ? Number(v) : undefined) as Filters["maxMinutes"] })}
        />
        <PillGroup
          legend="Diet"
          name="diet"
          value={filters.diet ?? ""}
          options={[["", "Any"], ...DIETS.map((d) => [d, DIET_LABELS[d]] as [string, string])]}
          onChange={(v) => onChange({ ...filters, diet: (v || undefined) as Filters["diet"] })}
        />
      </div>
    </details>
  );
}

function PillGroup(props: {
  legend: string;
  name: string;
  value: string;
  options: [string, string][];
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="pill-group">
      <legend>{props.legend}</legend>
      <div className="pills">
        {props.options.map(([value, label]) => (
          <label key={value || "any"} className="pill">
            <input
              type="radio"
              name={props.name}
              value={value}
              checked={props.value === value}
              onChange={() => props.onChange(value)}
            />
            <span>{label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
