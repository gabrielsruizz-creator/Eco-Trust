/**
 * Programas estaduais que devolvem parte do ICMS ou sorteiam prêmios para quem pede CPF na nota.
 * Só estão aqui os programas confirmados; as regras mudam, então o app sempre manda conferir no site
 * oficial da Secretaria da Fazenda do estado.
 */

export type ProgramaEstadual = {
  uf: string;
  nome: string;
  beneficio: string;
  /** Site oficial (.gov.br), quando conhecido */
  site: string | null;
};

export const PROGRAMAS_ESTADUAIS: ProgramaEstadual[] = [
  {
    uf: 'SP',
    nome: 'Nota Fiscal Paulista',
    beneficio: 'devolve parte do ICMS em créditos e participa de sorteios',
    site: 'https://portal.fazenda.sp.gov.br/servicos/nfp',
  },
  {
    uf: 'PR',
    nome: 'Nota Paraná',
    beneficio: 'devolve parte do ICMS em créditos e participa de sorteios',
    site: 'https://notaparana.pr.gov.br',
  },
  {
    uf: 'RS',
    nome: 'Nota Fiscal Gaúcha',
    beneficio: 'participa de sorteios de prêmios',
    site: 'https://nfg.sefaz.rs.gov.br',
  },
  {
    uf: 'DF',
    nome: 'Nota Legal',
    beneficio: 'gera créditos para abater IPTU e IPVA e participa de sorteios',
    site: 'https://www.notalegal.df.gov.br',
  },
  {
    uf: 'BA',
    nome: 'Nota Premiada Bahia',
    beneficio: 'participa de sorteios de prêmios',
    site: 'https://www.notapremiada.ba.gov.br',
  },
  { uf: 'MG', nome: 'Nota Fiscal Mineira', beneficio: 'participa de sorteios de prêmios', site: null },
  { uf: 'GO', nome: 'programa de CPF na nota de Goiás', beneficio: 'participa de sorteios de prêmios', site: null },
];

export function programaDoEstado(uf: string): ProgramaEstadual | null {
  return PROGRAMAS_ESTADUAIS.find((p) => p.uf === uf) ?? null;
}
