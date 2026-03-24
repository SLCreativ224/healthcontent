// Standalone token store — no imports from AuthProvider or queryClient
// This breaks the circular dependency between those two modules.

let _token: string | null = null;

export function getAuthToken(): string | null {
  return _token;
}

export function setAuthToken(token: string | null): void {
  _token = token;
}
