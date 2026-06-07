import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import type { ReportEntity } from '../../core/models/entities/report.entity';

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 20;
const CONTENT_W = PAGE_W - MARGIN * 2;
const LINE_H = 5;
const FOOTER_Y = PAGE_H - 12;
const TEAL: [number, number, number] = [0, 137, 123];

/**
 * Génère un rapport médical au format PDF via jsPDF.
 *
 * @remarks
 * Responsabilité unique : transformer un ReportEntity en fichier PDF téléchargeable.
 * En-tête FlowEase, pagination automatique, nom de fichier conforme spec §3.4.
 * Couche infrastructure — dépend de la librairie externe jsPDF.
 */
@Injectable({ providedIn: 'root' })
export class PdfReportService {
  /**
   * Génère et déclenche le téléchargement du PDF.
   *
   * @param report - Rapport à exporter
   * @param aiSummary - Synthèse IA optionnelle (null si non demandée)
   */
  generate(report: ReportEntity, aiSummary: string | null): void {
    const doc = this.createDoc();
    let y = MARGIN;

    y = this.addHeader(doc, report, y);

    if (aiSummary) {
      y = this.addBlock(doc, '✨ Synthèse IA', aiSummary, y, true);
    }

    for (const section of report.sections) {
      if (section.included) {
        y = this.addBlock(doc, section.title, section.content, y, false);
      }
    }

    this.addFooters(doc);

    const date = new Date().toISOString().slice(0, 10);
    this.save(doc, `FlowEase_rapport_${date}.pdf`);
  }

  /** @internal Séparé pour permettre l'injection d'un doc mock en test. */
  protected createDoc(): jsPDF {
    return new jsPDF('p', 'mm', 'a4');
  }

  /** @internal Séparé pour permettre le test sans déclencher de téléchargement. */
  protected save(doc: jsPDF, filename: string): void {
    doc.save(filename);
  }

  private addHeader(doc: jsPDF, report: ReportEntity, startY: number): number {
    let y = startY;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(...TEAL);
    doc.text('FlowEase', MARGIN, y);

    y += 7;
    doc.setFontSize(13);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    doc.text('Rapport médical', MARGIN, y);

    y += 6;
    doc.setFontSize(9);
    doc.setTextColor(130, 130, 130);
    const dateStr = new Date(report.generatedAt).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
    doc.text(
      `Généré le ${dateStr}  ·  Période : ${report.windowDays} jours`,
      MARGIN, y,
    );

    y += 5;
    doc.setDrawColor(...TEAL);
    doc.setLineWidth(0.6);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);

    return y + 10;
  }

  private addBlock(doc: jsPDF, title: string, content: string, startY: number, isAi: boolean): number {
    let y = startY;

    if (y > PAGE_H - 45) {
      doc.addPage();
      y = MARGIN;
    }

    const titleColor: [number, number, number] = isAi ? TEAL : [70, 70, 70];
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...titleColor);
    doc.text(title.toUpperCase(), MARGIN, y);

    y += 2;
    const ruleColor: [number, number, number] = isAi ? TEAL : [210, 210, 210];
    doc.setDrawColor(...ruleColor);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);

    const lines = doc.splitTextToSize(content.trim(), CONTENT_W) as string[];
    for (const line of lines) {
      if (y + LINE_H > PAGE_H - MARGIN) {
        doc.addPage();
        y = MARGIN;
      }
      doc.text(line, MARGIN, y);
      y += LINE_H;
    }

    return y + 6;
  }

  private addFooters(doc: jsPDF): void {
    const total = doc.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(160, 160, 160);
      doc.text('FlowEase — Document confidentiel', MARGIN, FOOTER_Y);
      doc.text(`${i} / ${total}`, PAGE_W - MARGIN, FOOTER_Y, { align: 'right' });
    }
  }
}
