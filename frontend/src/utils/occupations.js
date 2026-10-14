// Values match the backend's occupation_type enum exactly.
export const OCCUPATIONS = [
  { value: "student", label: "Student" },
  { value: "service_holder", label: "Service holder" },
  { value: "businessman", label: "Businessman" },
  { value: "unemployed", label: "Unemployed" },
  { value: "retired", label: "Retired" },
  { value: "other", label: "Other" },
];

export const occupationLabel = (value) =>
  OCCUPATIONS.find((o) => o.value === value)?.label ?? "";

// Which extra detail each occupation has.
export const takesInstitution = (occupation) => occupation === "student";
export const takesWorkplace = (occupation) =>
  occupation === "service_holder" || occupation === "businessman";
export const workplaceLabel = (occupation) =>
  occupation === "businessman" ? "Business name" : "Workplace / company";
