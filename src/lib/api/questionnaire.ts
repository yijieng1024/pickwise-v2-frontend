import { apiFetch } from "./client";

/**
 * Mirrors the backend's `QuestionnaireQuestionRead` (GET /questionnaire).
 * `options` values are strings except the budget question, whose values are
 * `{min, max}` RM ranges; the brand question ships `options: null` and is
 * populated from GET /brands instead.
 */
export interface QuestionOption {
  value: unknown;
  label: string;
}

export interface QuestionnaireQuestion {
  id: string;
  step_order: number;
  question_text: string;
  question_type: "single_choice" | "multiple_choice" | "ranking";
  /** Which `LaptopUserPreference` field the answer populates. */
  target_field: string;
  options: QuestionOption[] | null;
  help_text: string | null;
  is_active: boolean;
}

/** Mirrors the backend's `BrandRead` (GET /brands). */
export interface Brand {
  id: string;
  name: string;
  icons_url: string | null;
  is_active: boolean;
}

export function getQuestionnaire(
  productType = "laptop",
): Promise<QuestionnaireQuestion[]> {
  return apiFetch<QuestionnaireQuestion[]>(
    `/questionnaire?product_type=${encodeURIComponent(productType)}`,
  );
}

export function getBrands(): Promise<Brand[]> {
  return apiFetch<Brand[]>("/brands?is_active=true");
}
