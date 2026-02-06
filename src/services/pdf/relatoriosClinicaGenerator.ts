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
    return new Date(iso).toLocaleString('pt-BR')
  } catch {
    return iso
  }
}

export interface RelatoriosClinicaPdfOptions {
  theme?: ColorTheme
  empresaNome?: string
  periodo: RelatoriosPeriodo
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

  private setFillColor(hex: string) {
    const [r, g, b] = hexToRgb(hex)
    this.doc.setFillColor(r, g, b)
  }

  private setDrawColor(hex: string) {
    const [r, g, b] = hexToRgb(hex)
    this.doc.setDrawColor(r, g, b)
  }

  private addHeader(periodo: RelatoriosPeriodo, data: RelatoriosClinicaData) {
    this.setFillColor(this.theme.primary)
    this.doc.rect(0, 0, this.pageWidth, 26, 'F')

    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(16)
    this.doc.setTextColor(255, 255, 255)
    this.doc.text('RELATÓRIO DA CLÍNICA', this.margin, 12)

    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(9)
    const subtitle = `${this.empresaNome} • Período: ${periodo.toUpperCase()}`
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

  private addMetricCards(data: RelatoriosClinicaData) {
    const cards = [
      { label: 'Faturamento', value: `R$ ${data.metricas.faturamento.toFixed(2)}` },
      { label: 'Ticket médio', value: `R$ ${data.metricas.ticketMedio.toFixed(2)}` },
      { label: 'Conversão', value: `${data.metricas.conversao}%` },
      { label: 'Novos clientes', value: String(data.metricas.novosClientes) },
    ]

    const gap = 6
    const cardW = (this.pageWidth - this.margin * 2 - gap * 3) / 4
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

  private addSerieDiariaChart(data: RelatoriosClinicaData) {
    const w = this.pageWidth - this.margin * 2
    const h = 42

    this.ensureSpace(h + 8)

    const x = this.margin
    const y = this.currentY

    this.setFillColor('#ffffff')
    this.doc.roundedRect(x, y, w, h, 2, 2, 'F')
    this.setDrawColor(COLORS.border)
    this.doc.roundedRect(x, y, w, h, 2, 2, 'S')

    const padding = 6
    const plotX = x + padding
    const plotY = y + padding + 6
    const plotW = w - padding * 2
    const plotH = h - padding * 2 - 6

    const serie = data.serieDiaria
    const max = Math.max(1, ...serie.map((s) => s.faturamento))

    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(7)
    this.setTextColor(COLORS.muted)
    this.doc.text('Faturamento por dia', x + padding, y + padding + 1)

    this.setDrawColor(COLORS.border)
    this.doc.line(plotX, plotY, plotX, plotY + plotH)
    this.doc.line(plotX, plotY + plotH, plotX + plotW, plotY + plotH)

    if (serie.length >= 2) {
      const step = plotW / (serie.length - 1)
      const points = serie.map((s, idx) => {
        const px = plotX + idx * step
        const py = plotY + plotH - (s.faturamento / max) * plotH
        return { x: px, y: py }
      })

      const [r, g, b] = hexToRgb(this.theme.primary)
      this.doc.setDrawColor(r, g, b)
      this.doc.setLineWidth(1)
      for (let i = 0; i < points.length - 1; i++) {
        this.doc.line(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y)
      }
      this.doc.setLineWidth(0.2)

      this.doc.setFillColor(r, g, b)
      points.forEach((p) => {
        this.doc.circle(p.x, p.y, 0.7, 'F')
      })
    }

    this.currentY += h + 8
  }

  private addStatusBars(data: RelatoriosClinicaData) {
    const rows = data.distribuicaoStatus.slice(0, 8)

    this.ensureSpace(8 + rows.length * 6)

    const x = this.margin
    const w = this.pageWidth - this.margin * 2

    const max = Math.max(1, ...rows.map((r) => r.total))

    rows.forEach((r) => {
      const y = this.currentY
      const barW = (w * r.total) / max

      this.doc.setFont('helvetica', 'normal')
      this.doc.setFontSize(8)
      this.setTextColor(15, 23, 42)
      this.doc.text(`${r.status} (${r.total})`, x, y + 3.8)

      this.setFillColor(this.theme.light)
      this.doc.rect(x, y + 5, w, 2.4, 'F')

      this.setFillColor(this.theme.primary)
      this.doc.rect(x, y + 5, barW, 2.4, 'F')

      this.currentY += 8
    })

    this.currentY += 2
  }

  private addTable(title: string, head: string[], body: (string | number)[][]) {
    this.addSectionTitle(title)

    this.ensureSpace(20)

    this.doc.autoTable({
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

    this.currentY = (this.doc.lastAutoTable?.finalY ?? this.currentY) + 10
  }

  public async generate(periodo: RelatoriosPeriodo, data: RelatoriosClinicaData): Promise<Blob> {
    this.addHeader(periodo, data)
    this.addMetricCards(data)

    this.addSectionTitle('Gráficos')
    this.addSerieDiariaChart(data)
    this.addSectionTitle('Distribuição por status')
    this.addStatusBars(data)

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
      'Top clientes (por faturamento)',
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
  return generator.generate(opts.periodo, data)
}

export async function downloadRelatoriosClinicaPDF(
  opts: RelatoriosClinicaPdfOptions,
  data: RelatoriosClinicaData
): Promise<void> {
  const pdfBlob = await generateRelatoriosClinicaPDF(opts, data)
  const url = URL.createObjectURL(pdfBlob)
  const link = document.createElement('a')
  link.href = url
  link.download = `relatorios-${opts.periodo}-${new Date().toISOString().slice(0, 10)}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
