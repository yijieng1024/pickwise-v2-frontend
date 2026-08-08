import { apiFetch } from "@/lib/api/client";

export type QuestionType = "single_choice" | "multiple_choice" | "ranking";

/**
 * The backend column is an untyped `List[dict]`, so the shape is convention,
 * not contract. Live data uses `{value, label}` where `value` is a string —
 * except the budget question, whose value is a `{min, max}` RM range object.
 * Anything that writes options has to preserve that.
 */
export interface QuestionOption {
  value: unknown;
  label: string;
}

/** Mirrors the backend's `QuestionnaireQuestionRead`. */
export interface AdminQuestion {
  id: string;
  product_type_id: string;
  step_order: number;
  question_text: string;
  question_type: QuestionType;
  /** Which `LaptopUserPreference` column the answer populates. */
  target_field: string;
  /** `null` is meaningful: the brand question is filled from GET /brands. */
  options: QuestionOption[] | null;
  help_text: string | null;
  is_active: boolean;
  created_at: string;
}

export interface QuestionInput {
  product_type_id: string;
  step_order: number;
  question_text: string;
  question_type: QuestionType;
  target_field: string;
  options?: QuestionOption[] | null;
  help_text?: string | null;
  is_active?: boolean;
}

/**
 * The columns an answer can populate. Free text here would silently break
 * personalization, so the editor offers these rather than an input.
 */
export const TARGET_FIELDS = [
  { value: "budget", label: "Budget", note: "Expects a {min, max} range value" },
  { value: "purpose", label: "Purpose", note: "List of use cases" },
  { value: "priorities", label: "Priorities", note: "Ranked factors" },
  { value: "screen_size", label: "Screen size", note: "List of size bands" },
  { value: "portability", label: "Portability", note: "Single value" },
  {
    value: "brand_preferences",
    label: "Brand preferences",
    note: "Leave options empty — brands are loaded live",
  },
  { value: "tech_savviness", label: "Tech savviness", note: "Single value" },
] as const;

/** Admin view includes inactive questions; the customer-facing call does not. */
export function listQuestions(productType = "laptop"): Promise<AdminQuestion[]> {
  return apiFetch<AdminQuestion[]>(
    `/questionnaire?product_type=${encodeURIComponent(productType)}&include_inactive=true`,
    { next: { revalidate: 0 } },
  );
}

export function createQuestion(token: string, input: QuestionInput): Promise<AdminQuestion> {
  return apiFetch<AdminQuestion>("/questionnaire", {
    method: "POST",
    token,
    body: JSON.stringify(input),
    next: { revalidate: 0 },
  });
}

export function updateQuestion(
  token: string,
  id: string,
  input: Partial<QuestionInput>,
): Promise<AdminQuestion> {
  return apiFetch<AdminQuestion>(`/questionnaire/${id}`, {
    method: "PUT",
    token,
    body: JSON.stringify(input),
    next: { revalidate: 0 },
  });
}

export function deleteQuestion(token: string, id: string): Promise<void> {
  return apiFetch<void>(`/questionnaire/${id}`, {
    method: "DELETE",
    token,
    next: { revalidate: 0 },
  });
}

/**
 * Swaps two questions' step positions.
 *
 * Needs three writes, not two. The backend rejects any update that would put
 * two *active* questions on the same step (409), so a direct swap always
 * collides on the first write. Parking one question on a temporary step above
 * everything else clears the way.
 *
 * The questionnaire is live while this runs, so the parked question briefly
 * sorts last. All questions stay present and answerable throughout — only
 * their order is momentarily off, which is why this is acceptable and a
 * deactivate-then-move approach is not.
 */
export async function swapSteps(
  token: string,
  a: AdminQuestion,
  b: AdminQuestion,
  allQuestions: AdminQuestion[],
): Promise<void> {
  const parking = Math.max(...allQuestions.map((q) => q.step_order), 0) + 1;

  await updateQuestion(token, a.id, { step_order: parking });
  try {
    await updateQuestion(token, b.id, { step_order: a.step_order });
    await updateQuestion(token, a.id, { step_order: b.step_order });
  } catch (err) {
    // Never strand a question on the parking step: put it back before
    // surfacing the failure, so a failed reorder is a no-op rather than a
    // visibly broken questionnaire.
    await updateQuestion(token, a.id, { step_order: a.step_order }).catch(() => {});
    throw err;
  }
}
