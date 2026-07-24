const DDDS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37,
  38, 41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64, 65, 66,
  67, 68, 69, 71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88, 89, 91, 92,
  93, 94, 95, 96, 97, 98, 99,
]);

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function formatPhoneMask(value: string): string {
  let d = digitsOnly(value);
  if (d.startsWith("55") && d.length >= 12) d = d.slice(2);
  d = d.slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function validateName(name: string): string | null {
  if (name.trim().length < 2) return "Me conta seu nome completo 🙂";
  return null;
}

export function validateEmail(email: string): string | null {
  if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email.trim())) {
    return "E-mail inválido. Use um domínio completo, tipo nome@agencia.com";
  }
  return null;
}

export function validatePhone(phone: string): string | null {
  let d = digitsOnly(phone);
  if (d.startsWith("55") && d.length >= 12) d = d.slice(2);

  if (d.length !== 10 && d.length !== 11) {
    return "WhatsApp inválido. Use DDD + número, ex: (19) 99999-9999";
  }

  const ddd = Number(d.slice(0, 2));
  if (!DDDS.has(ddd)) return "DDD inválido. Confira o código da sua cidade.";

  if (/^(\d)\1+$/.test(d) || /^(\d)\1+$/.test(d.slice(2))) {
    return "Esse número não parece real. Digite um WhatsApp válido.";
  }

  if (d.length === 11 && d[2] !== "9") {
    return "Celular precisa ter 9 dígitos após o DDD (ex: 9XXXX-XXXX).";
  }

  if (d.length === 10) {
    const first = d[2];
    if (!["2", "3", "4", "5"].includes(first)) {
      return "Número inválido. Use um celular com 9 dígitos após o DDD.";
    }
  }

  return null;
}

export function validateCompany(company: string): string | null {
  if (company.trim().length < 2) return "Me conta o nome da agência 🙂";
  return null;
}

export function validateNumberField(value: string): string | null {
  const n = Number(String(value).replace("+", ""));
  if (!Number.isFinite(n) || n < 1) return "Informe um número válido (≥ 1).";
  return null;
}
