/** Shared shape for server actions consumed by `useActionState`. */
export interface ActionState {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string[]>;
}

export const idleState: ActionState = { status: "idle" };

export function errorState(message: string, fieldErrors?: Record<string, string[]>): ActionState {
  return { status: "error", message, fieldErrors };
}

export function successState(message?: string): ActionState {
  return { status: "success", message };
}
