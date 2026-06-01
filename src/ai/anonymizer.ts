/**
 * Anonimização de PII antes de enviar texto para o Gemini quando rodando no
 * free tier (Google pode usar prompts para treino).
 *
 * Por que substituir por placeholders: o LLM continua entendendo a estrutura
 * ("o CPF do João é <CPF_1>") sem que o número real saia do servidor. Após o
 * loop, a chamada de tool usa o valor REAL (recuperado via lookup) — só o
 * texto livre é mascarado.
 *
 * Modo simples (regex): cobre 95% dos casos. Não é cripto.
 */

const CPF_RE = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;
const CNPJ_RE = /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g;
const EMAIL_RE = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g;
const PHONE_RE = /\b\(?\d{2}\)?[\s-]?\d{4,5}-?\d{4}\b/g;

export interface AnonymizeResult {
  text: string;
  /** Mapa placeholder → valor real, para a tool layer recuperar quando precisar. */
  lookup: Record<string, string>;
}

export function shouldAnonymize(): boolean {
  return (process.env.GEMINI_TIER ?? 'free') === 'free';
}

export function anonymize(text: string): AnonymizeResult {
  const lookup: Record<string, string> = {};
  let cpfCount = 0;
  let cnpjCount = 0;
  let emailCount = 0;
  let phoneCount = 0;

  let out = text.replace(CPF_RE, (m) => {
    cpfCount++;
    const ph = `<CPF_${cpfCount}>`;
    lookup[ph] = m;
    return ph;
  });
  out = out.replace(CNPJ_RE, (m) => {
    cnpjCount++;
    const ph = `<CNPJ_${cnpjCount}>`;
    lookup[ph] = m;
    return ph;
  });
  out = out.replace(EMAIL_RE, (m) => {
    emailCount++;
    const ph = `<EMAIL_${emailCount}>`;
    lookup[ph] = m;
    return ph;
  });
  out = out.replace(PHONE_RE, (m) => {
    phoneCount++;
    const ph = `<PHONE_${phoneCount}>`;
    lookup[ph] = m;
    return ph;
  });

  return { text: out, lookup };
}

/**
 * Reverte placeholders → valores reais nos args que vão para tools (services
 * internos NÃO devem operar com `<CPF_1>` — apenas o LLM enxerga essa forma).
 */
export function deanonymizeArgs<T>(args: T, lookup: Record<string, string>): T {
  if (Object.keys(lookup).length === 0) return args;
  const json = JSON.stringify(args);
  const out = Object.entries(lookup).reduce(
    (acc, [ph, real]) => acc.split(ph).join(real),
    json,
  );
  return JSON.parse(out) as T;
}
