export class SaveError extends Error {
  constructor(readonly status: number) {
    super(`save failed: ${status}`);
  }
}

export function assertSaved(res: Response) {
  if (!res.ok) throw new SaveError(res.status);
}

/** Mensagem do toast quando um salvamento falha. O que foi digitado continua na tela. */
export function saveErrorMessage(error: unknown, fallback: string) {
  if (error instanceof SaveError) {
    if (error.status === 401) return "Sua sessão expirou. Entre de novo para salvar; o que você digitou continua na tela.";
    if (error.status === 403) return "Seu usuário não tem permissão para salvar nesta área.";
    if (error.status === 409) {
      return "Os dados foram atualizados em outro computador. Recarregue se a alteração não aparecer.";
    }
    if (error.status === 400 || error.status === 413) return "O servidor recusou os dados. Revise os valores e tente de novo.";
  }
  return fallback;
}
