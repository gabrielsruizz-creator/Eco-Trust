/** Datas no formato "AAAA-MM-DD" e meses "AAAA-MM", sempre no fuso do celular. */

function doisDigitos(n: number) {
  return String(n).padStart(2, '0');
}

export function paraDataLocal(data: Date) {
  return `${data.getFullYear()}-${doisDigitos(data.getMonth() + 1)}-${doisDigitos(data.getDate())}`;
}

export function hoje() {
  return paraDataLocal(new Date());
}

export function ontem() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return paraDataLocal(d);
}

export function mesAtual() {
  return hoje().slice(0, 7);
}

export function dataValida(texto: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
  const [ano, mes, dia] = texto.split('-').map(Number);
  const d = new Date(ano, mes - 1, dia);
  return d.getFullYear() === ano && d.getMonth() === mes - 1 && d.getDate() === dia;
}

/** Soma (ou subtrai, com número negativo) meses a um "AAAA-MM". */
export function somarMeses(mes: string, quantidade: number) {
  const [ano, m] = mes.split('-').map(Number);
  const d = new Date(ano, m - 1 + quantidade, 1);
  return `${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}`;
}

function paraDate(data: string) {
  const [ano, mes, dia] = data.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
}

/** Dias de `de` até `ate` (negativo se `ate` vem antes). */
export function diasEntre(de: string, ate: string) {
  return Math.round((paraDate(ate).getTime() - paraDate(de).getTime()) / 86_400_000);
}

/** Soma meses a uma data, sem pular para o mês seguinte: 31/01 + 1 mês = 28/02 (ou 29/02). */
export function somarMesesNaData(data: string, quantidade: number) {
  const [ano, mes, dia] = data.split('-').map(Number);
  const ultimoDia = new Date(ano, mes - 1 + quantidade + 1, 0).getDate();
  return paraDataLocal(new Date(ano, mes - 1 + quantidade, Math.min(dia, ultimoDia)));
}

/** "2026-10" → "outubro de 2026" */
export function nomeDoMes(mes: string) {
  const [ano, m] = mes.split('-').map(Number);
  return new Date(ano, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

/** "2026-10-06" → "06/10/2026" */
export function formatarData(data: string) {
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
}

/** "2026-10-06" → "terça-feira, 6 de outubro de 2026" */
export function formatarDataPorExtenso(data: string) {
  const [ano, mes, dia] = data.split('-').map(Number);
  return new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Coloca as barras enquanto o usuário digita: "0610" → "06/10", "06102026" → "06/10/2026". */
export function mascararData(texto: string) {
  const digitos = texto.replace(/\D/g, '').slice(0, 8);
  if (digitos.length <= 2) return digitos;
  if (digitos.length <= 4) return `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
  return `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}/${digitos.slice(4)}`;
}

/** "06/10/2026" → "2026-10-06". Retorna null se a data estiver incompleta ou não existir. */
export function lerDataDigitada(texto: string): string | null {
  const partes = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto.trim());
  if (!partes) return null;
  const data = `${partes[3]}-${partes[2]}-${partes[1]}`;
  return dataValida(data) ? data : null;
}

/** "6 de out." (data AAAA-MM-DD) */
export function formatarDataCurta(data: string) {
  const [ano, mes, dia] = data.split('-').map(Number);
  return new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
}

/** Tempo desde um momento (ISO): "agora", "há 5 min", "há 3 h", "ontem", "há 4 dias" ou a data. */
export function tempoRelativo(momento: string, agora = new Date()) {
  const minutos = Math.floor((agora.getTime() - new Date(momento).getTime()) / 60_000);
  if (minutos < 1) return 'agora';
  if (minutos < 60) return `há ${minutos} min`;
  if (minutos < 24 * 60) return `há ${Math.floor(minutos / 60)} h`;
  const dias = diasEntre(paraDataLocal(new Date(momento)), paraDataLocal(agora));
  if (dias === 1) return 'ontem';
  if (dias < 30) return `há ${dias} dias`;
  return formatarData(paraDataLocal(new Date(momento)));
}

/**
 * Grade do calendário de um mês (AAAA-MM), em semanas de domingo a sábado.
 * Os dias de fora do mês ficam como null.
 */
export function montarGradeDoMes(mes: string): (string | null)[][] {
  const [ano, m] = mes.split('-').map(Number);
  const primeiroDiaSemana = new Date(ano, m - 1, 1).getDay();
  const diasNoMes = new Date(ano, m, 0).getDate();
  const celulas: (string | null)[] = [
    ...Array<null>(primeiroDiaSemana).fill(null),
    ...Array.from({ length: diasNoMes }, (_, i) => `${mes}-${doisDigitos(i + 1)}`),
  ];
  while (celulas.length % 7 !== 0) celulas.push(null);
  const semanas: (string | null)[][] = [];
  for (let i = 0; i < celulas.length; i += 7) semanas.push(celulas.slice(i, i + 7));
  return semanas;
}

/** "outubro de 2026" → "Outubro de 2026" (para títulos). */
export function nomeDoMesTitulo(mes: string) {
  const nome = nomeDoMes(mes);
  return nome.charAt(0).toLocaleUpperCase('pt-BR') + nome.slice(1);
}

/** Idade completa em anos numa data (AAAA-MM-DD), considerando se já fez aniversário. */
export function idadeEm(nascimento: string, data = hoje()) {
  const [an, mn, dn] = nascimento.split('-').map(Number);
  const [a, m, d] = data.split('-').map(Number);
  return a - an - (m < mn || (m === mn && d < dn) ? 1 : 0);
}

/** Data (AAAA-MM-DD) somada de alguns dias (negativo volta). */
export function somarDias(data: string, dias: number) {
  const [ano, mes, dia] = data.split('-').map(Number);
  return paraDataLocal(new Date(ano, mes - 1, dia + dias));
}
