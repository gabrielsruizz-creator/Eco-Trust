import { getBanco, notificarMudanca } from '@/data/database';
import type { ImpostosFixos } from '@/types/financas';

type Linha = {
  salario_bruto_centavos: number | null;
  dependentes: number;
  inss_centavos: number | null;
  ir_centavos: number | null;
  ipva_anual_centavos: number;
  iptu_anual_centavos: number;
  outros_mensal_centavos: number;
};

export function buscarImpostosFixos(): ImpostosFixos | null {
  const l = getBanco().getFirstSync<Linha>(
    `SELECT salario_bruto_centavos, dependentes, inss_centavos, ir_centavos,
            ipva_anual_centavos, iptu_anual_centavos, outros_mensal_centavos
     FROM impostos_fixos WHERE id = 1`,
  );
  if (!l) return null;
  return {
    salarioBrutoCentavos: l.salario_bruto_centavos,
    dependentes: l.dependentes,
    inssCentavos: l.inss_centavos,
    irCentavos: l.ir_centavos,
    ipvaAnualCentavos: l.ipva_anual_centavos,
    iptuAnualCentavos: l.iptu_anual_centavos,
    outrosMensalCentavos: l.outros_mensal_centavos,
  };
}

export function gravarImpostosFixos(f: ImpostosFixos) {
  getBanco().runSync(
    `INSERT INTO impostos_fixos (id, salario_bruto_centavos, dependentes, inss_centavos, ir_centavos,
       ipva_anual_centavos, iptu_anual_centavos, outros_mensal_centavos, atualizado_em)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET
       salario_bruto_centavos = excluded.salario_bruto_centavos, dependentes = excluded.dependentes,
       inss_centavos = excluded.inss_centavos, ir_centavos = excluded.ir_centavos,
       ipva_anual_centavos = excluded.ipva_anual_centavos, iptu_anual_centavos = excluded.iptu_anual_centavos,
       outros_mensal_centavos = excluded.outros_mensal_centavos, atualizado_em = excluded.atualizado_em`,
    f.salarioBrutoCentavos,
    f.dependentes,
    f.inssCentavos,
    f.irCentavos,
    f.ipvaAnualCentavos,
    f.iptuAnualCentavos,
    f.outrosMensalCentavos,
    new Date().toISOString(),
  );
  notificarMudanca();
}

export function removerImpostosFixos() {
  getBanco().runSync('DELETE FROM impostos_fixos WHERE id = 1');
  notificarMudanca();
}
