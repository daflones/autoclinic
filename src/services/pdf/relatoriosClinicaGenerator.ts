import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { COLOR_THEMES, type ColorTheme } from './propostaGenerator'
import type { RelatoriosClinicaData, RelatoriosPeriodo } from '@/services/api/relatorios-clinica'

declare module 'jspdf' {
  interface jsPDF {
    autoTable: typeof autoTable
    lastAutoTable?: {
      finalY: number
    }
  }
}

const COLORS = {
  dark: '#0f172a',
  muted: '#64748b',
  white: '#ffffff',
  border: '#e2e8f0',
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [168, 85, 247]
}

function formatIsoToPtBr(iso: string) {
  try {
    return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return iso
  }
}

function getPeriodoLabel(periodo: RelatoriosPeriodo): string {
  const labels: Record<RelatoriosPeriodo, string> = {
    hoje: 'Hoje',
    semana: 'Esta Semana',
    mes: 'Este Mês',
    trimestre: 'Trimestre',
    ano: 'Este Ano',
  }
  return labels[periodo] || periodo
}

export type RelatorioTipo = 'vendas' | 'vendedores' | 'produtos' | 'financeiro' | 'pipeline' | 'clientes' | 'geral'

export interface RelatoriosClinicaPdfOptions {
  theme?: ColorTheme
  empresaNome?: string
  periodo: RelatoriosPeriodo
  tipo?: RelatorioTipo
}

export class RelatoriosClinicaPDFGenerator {
  private doc: jsPDF
  private pageWidth: number
  private pageHeight: number
  private margin = 18
  private currentY = 18
  private theme: typeof COLOR_THEMES.purple
  private empresaNome: string

  constructor(theme: ColorTheme = 'purple', empresaNome?: string) {
    this.doc = new jsPDF('p', 'mm', 'a4')
    this.pageWidth = this.doc.internal.pageSize.getWidth()
    this.pageHeight = this.doc.internal.pageSize.getHeight()
    this.theme = COLOR_THEMES[theme]
    this.empresaNome = empresaNome || 'AutoClinic'
  }

  private ensureSpace(height: number) {
    if (this.currentY + height <= this.pageHeight - this.margin) return
    this.doc.addPage()
    this.currentY = this.margin
  }

  private setTextColor(hex: string) {
    const [r, g, b] = hexToRgb(hex)
    this.doc.setTextColor(r, g, b)
  }

  private setTextColorRgb(r: number, g: number, b: number) {
    this.doc.setTextColor(r, g, b)
  }

  private setFillColor(hex: string) {
    const [r, g, b] = hexToRgb(hex)
    this.doc.setFillColor(r, g, b)
  }

  private setDrawColor(hex: string) {
    const [r, g, b] = hexToRgb(hex)
    this.doc.setDrawColor(r, g, b)
  }

  private addHeader(periodo: RelatoriosPeriodo, tipo: RelatorioTipo, data: RelatoriosClinicaData) {
    this.setFillColor(this.theme.primary)
    this.doc.rect(0, 0, this.pageWidth, 26, 'F')

    const tipoLabels: Record<RelatorioTipo, string> = {
      vendas: 'RELATÓRIO DE VENDAS',
      vendedores: 'PERFORMANCE DE VENDEDORES',
      produtos: 'ANÁLISE DE PRODUTOS',
      financeiro: 'RELATÓRIO FINANCEIRO',
      pipeline: 'PIPELINE DE VENDAS',
      clientes: 'ANÁLISE DE CLIENTES',
      geral: 'RELATÓRIO DA CLÍNICA',
    }

    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(16)
    this.doc.setTextColor(255, 255, 255)
    this.doc.text(tipoLabels[tipo], this.margin, 12)

    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(9)
    const subtitle = `${this.empresaNome} • Período: ${getPeriodoLabel(periodo)}`
    this.doc.text(subtitle, this.margin, 19)

    this.currentY = 34

    this.doc.setFontSize(9)
    this.setTextColor(COLORS.muted)
    this.doc.text(`Início: ${formatIsoToPtBr(data.range.startIso)}`, this.margin, this.currentY)
    this.doc.text(`Fim: ${formatIsoToPtBr(data.range.endIso)}`, this.pageWidth - this.margin, this.currentY, {
      align: 'right',
    })

    this.currentY += 10
  }

  private addMetricCards(cards: { label: string; value: string }[]) {
    const gap = 6
    const cardW = (this.pageWidth - this.margin * 2 - gap * (cards.length - 1)) / cards.length
    const cardH = 18

    this.ensureSpace(cardH + 4)

    cards.forEach((c, idx) => {
      const x = this.margin + idx * (cardW + gap)
      const y = this.currentY

      this.setFillColor('#ffffff')
      this.doc.roundedRect(x, y, cardW, cardH, 2, 2, 'F')
      this.setDrawColor(COLORS.border)
      this.doc.roundedRect(x, y, cardW, cardH, 2, 2, 'S')

      this.doc.setFont('helvetica', 'normal')
      this.doc.setFontSize(7)
      this.setTextColor(COLORS.muted)
      this.doc.text(c.label, x + 3, y + 6)

      this.doc.setFont('helvetica', 'bold')
      this.doc.setFontSize(10)
      this.setTextColor(COLORS.dark)
      this.doc.text(c.value, x + 3, y + 14)
    })

    this.currentY += cardH + 8
  }

  private addSectionTitle(title: string) {
    this.ensureSpace(10)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(11)
    this.setTextColor(COLORS.dark)
    this.doc.text(title, this.margin, this.currentY)
    this.currentY += 6
  }

  private addTable(title: string, head: string[], body: (string | number)[][]) {
    this.addSectionTitle(title)
    this.ensureSpace(20)

    autoTable(this.doc, {
      head: [head],
      body,
      startY: this.currentY,
      margin: { left: this.margin, right: this.margin },
      styles: {
        font: 'helvetica',
        fontSize: 8,
        cellPadding: 2,
        textColor: hexToRgb(COLORS.dark) as any,
        lineColor: hexToRgb(COLORS.border) as any,
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: hexToRgb(this.theme.primary) as any,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
    })

    this.currentY = ((this.doc as any).lastAutoTable?.finalY ?? this.currentY) + 10
  }

  public async generateVendas(periodo: RelatoriosPeriodo, data: RelatoriosClinicaData): Promise<Blob> {
    this.addHeader(periodo, 'vendas', data)
    
    this.addMetricCards([
      { label: 'Faturamento', value: `R$ ${data.metricas.faturamento.toFixed(2)}` },
      { label: 'Ticket médio', value: `R$ ${data.metricas.ticketMedio.toFixed(2)}` },
      { label: 'Conversão', value: `${data.metricas.conversao}%` },
      { label: 'Novos clientes', value: String(data.metricas.novosClientes) },
    ])

    this.addTable(
      'Procedimentos mais vendidos',
      ['Procedimento', 'Agend.', 'Concl.', 'Conversão', 'Faturamento'],
      data.topProcedimentos.map((p) => [p.nome, p.total, p.concluidos, `${p.conversao}%`, `R$ ${p.faturamento.toFixed(2)}`])
    )

    this.addTable(
      'Protocolos/Pacotes mais vendidos',
      ['Pacote', 'Agend.', 'Concl.', 'Conversão', 'Faturamento'],
      data.topPacotes.map((p) => [p.nome, p.total, p.concluidos, `${p.conversao}%`, `R$ ${p.faturamento.toFixed(2)}`])
    )

    return this.doc.output('blob')
  }

  public async generateVendedores(periodo: RelatoriosPeriodo, data: RelatoriosClinicaData): Promise<Blob> {
    this.addHeader(periodo, 'vendedores', data)
    
    this.addMetricCards([
      { label: 'Faturamento', value: `R$ ${data.metricas.faturamento.toFixed(2)}` },
      { label: 'Agendamentos', value: String(data.metricas.agendamentosTotal) },
      { label: 'Concluídos', value: String(data.metricas.agendamentosConcluidos) },
      { label: 'Conversão', value: `${data.metricas.conversao}%` },
    ])

    this.addTable(
      'Performance por profissional',
      ['Profissional', 'Agend.', 'Concl.', 'Proced.', 'Pacotes', 'Faturamento'],
      data.profissionaisAnalise.slice(0, 15).map((p) => [
        p.nome,
        p.agendamentosTotal,
        p.agendamentosConcluidos,
        p.procedimentosVendidos,
        p.pacotesVendidos,
        `R$ ${p.faturamento.toFixed(2)}`,
      ])
    )

    return this.doc.output('blob')
  }

  public async generateProdutos(periodo: RelatoriosPeriodo, data: RelatoriosClinicaData): Promise<Blob> {
    this.addHeader(periodo, 'produtos', data)
    
    this.addTable(
      'Procedimentos mais vendidos',
      ['Procedimento', 'Agend.', 'Concl.', 'Conversão', 'Faturamento'],
      data.topProcedimentos.map((p) => [p.nome, p.total, p.concluidos, `${p.conversao}%`, `R$ ${p.faturamento.toFixed(2)}`])
    )

    this.addTable(
      'Protocolos/Pacotes mais vendidos',
      ['Pacote', 'Agend.', 'Concl.', 'Conversão', 'Faturamento'],
      data.topPacotes.map((p) => [p.nome, p.total, p.concluidos, `${p.conversao}%`, `R$ ${p.faturamento.toFixed(2)}`])
    )

    return this.doc.output('blob')
  }

  public async generateFinanceiro(periodo: RelatoriosPeriodo, data: RelatoriosClinicaData): Promise<Blob> {
    this.addHeader(periodo, 'financeiro', data)
    
    this.addMetricCards([
      { label: 'Faturamento', value: `R$ ${data.metricas.faturamento.toFixed(2)}` },
      { label: 'Ticket médio', value: `R$ ${data.metricas.ticketMedio.toFixed(2)}` },
      { label: 'Conversão', value: `${data.metricas.conversao}%` },
      { label: 'Novos clientes', value: String(data.metricas.novosClientes) },
    ])

    this.addTable(
      'Faturamento por dia',
      ['Data', 'Faturamento', 'Agend.', 'Concl.'],
      data.serieDiaria.map((s) => [s.dia, `R$ ${s.faturamento.toFixed(2)}`, s.agendamentosTotal, s.agendamentosConcluidos])
    )

    return this.doc.output('blob')
  }

  public async generatePipeline(periodo: RelatoriosPeriodo, data: RelatoriosClinicaData): Promise<Blob> {
    this.addHeader(periodo, 'pipeline', data)
    
    const total = data.distribuicaoStatus.reduce((acc, s) => acc + s.total, 0)
    
    this.addMetricCards([
      { label: 'Total', value: String(total) },
      { label: 'Agendados', value: String(data.distribuicaoStatus.find((s) => s.status === 'agendado')?.total ?? 0) },
      { label: 'Confirmados', value: String(data.distribuicaoStatus.find((s) => s.status === 'confirmado')?.total ?? 0) },
      { label: 'Concluídos', value: String(data.distribuicaoStatus.find((s) => s.status === 'concluido')?.total ?? 0) },
    ])

    this.addTable(
      'Distribuição por status',
      ['Status', 'Total', 'Percentual'],
      data.distribuicaoStatus.map((s) => [s.status, s.total, `${total ? Math.round((s.total / total) * 100) : 0}%`])
    )

    return this.doc.output('blob')
  }

  public async generateClientes(periodo: RelatoriosPeriodo, data: RelatoriosClinicaData): Promise<Blob> {
    this.addHeader(periodo, 'clientes', data)
    
    this.addTable(
      'Top clientes por faturamento',
      ['Cliente', 'Agend.', 'Concl.', 'Faturamento'],
      data.topClientes.map((c) => [c.nome, c.agendamentosTotal, c.agendamentosConcluidos, `R$ ${c.faturamento.toFixed(2)}`])
    )

    this.addTable(
      'Análise detalhada de clientes',
      ['Cliente', 'Concl.', 'Faturamento', 'Procedimentos', 'Pacotes'],
      data.clientesAnalise.slice(0, 20).map((c) => [
        c.nome,
        c.agendamentosConcluidos,
        `R$ ${c.faturamento.toFixed(2)}`,
        c.procedimentos.map((p) => `${p.nome} (${p.total})`).join(', ') || '—',
        c.pacotes.map((p) => `${p.nome} (${p.total})`).join(', ') || '—',
      ])
    )

    return this.doc.output('blob')
  }

  public async generateGeral(periodo: RelatoriosPeriodo, data: RelatoriosClinicaData): Promise<Blob> {
    this.addHeader(periodo, 'geral', data)
    
    this.addMetricCards([
      { label: 'Faturamento', value: `R$ ${data.metricas.faturamento.toFixed(2)}` },
      { label: 'Ticket médio', value: `R$ ${data.metricas.ticketMedio.toFixed(2)}` },
      { label: 'Conversão', value: `${data.metricas.conversao}%` },
      { label: 'Novos clientes', value: String(data.metricas.novosClientes) },
    ])

    this.addTable(
      'Procedimentos mais vendidos',
      ['Procedimento', 'Agend.', 'Concl.', 'Conversão', 'Faturamento'],
      data.topProcedimentos.map((p) => [p.nome, p.total, p.concluidos, `${p.conversao}%`, `R$ ${p.faturamento.toFixed(2)}`])
    )

    this.addTable(
      'Protocolos/Pacotes mais vendidos',
      ['Pacote', 'Agend.', 'Concl.', 'Conversão', 'Faturamento'],
      data.topPacotes.map((p) => [p.nome, p.total, p.concluidos, `${p.conversao}%`, `R$ ${p.faturamento.toFixed(2)}`])
    )

    this.addTable(
      'Performance dos profissionais',
      ['Profissional', 'Agend.', 'Concl.', 'Conversão', 'Faturamento'],
      data.performanceProfissionais.map((p) => [p.nome, p.total, p.concluidos, `${p.conversao}%`, `R$ ${p.faturamento.toFixed(2)}`])
    )

    this.addTable(
      'Top clientes',
      ['Cliente', 'Agend.', 'Concl.', 'Faturamento'],
      data.topClientes.map((c) => [c.nome, c.agendamentosTotal, c.agendamentosConcluidos, `R$ ${c.faturamento.toFixed(2)}`])
    )

    return this.doc.output('blob')
  }
}

export async function generateRelatoriosClinicaPDF(
  opts: RelatoriosClinicaPdfOptions,
  data: RelatoriosClinicaData
): Promise<Blob> {
  const generator = new RelatoriosClinicaPDFGenerator(opts.theme || 'purple', opts.empresaNome)
  const tipo = opts.tipo || 'geral'

  switch (tipo) {
    case 'vendas':
      return generator.generateVendas(opts.periodo, data)
    case 'vendedores':
      return generator.generateVendedores(opts.periodo, data)
    case 'produtos':
      return generator.generateProdutos(opts.periodo, data)
    case 'financeiro':
      return generator.generateFinanceiro(opts.periodo, data)
    case 'pipeline':
      return generator.generatePipeline(opts.periodo, data)
    case 'clientes':
      return generator.generateClientes(opts.periodo, data)
    default:
      return generator.generateGeral(opts.periodo, data)
  }
}

export async function downloadRelatoriosClinicaPDF(
  opts: RelatoriosClinicaPdfOptions,
  data: RelatoriosClinicaData
): Promise<void> {
  const pdfBlob = await generateRelatoriosClinicaPDF(opts, data)
  const url = URL.createObjectURL(pdfBlob)
  const link = document.createElement('a')
  link.href = url
  const tipo = opts.tipo || 'geral'
  link.download = `relatorio-${tipo}-${opts.periodo}-${new Date().toISOString().slice(0, 10)}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
