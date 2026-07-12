import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import { stringify } from "csv-stringify";
import type { Response } from "express";
import type { ReportResult } from "./service.js";

export function streamReportAsPdf(res: Response, report: ReportResult) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${report.title.replace(/\s+/g, "-").toLowerCase()}.pdf"`);

  const doc = new PDFDocument({ margin: 40 });
  doc.pipe(res);

  doc.fontSize(18).text(report.title, { align: "left" });
  doc.moveDown();

  const colWidth = 500 / report.columns.length;
  doc.fontSize(10).font("Helvetica-Bold");
  report.columns.forEach((col, i) => {
    doc.text(col, 40 + i * colWidth, doc.y, { width: colWidth, continued: i < report.columns.length - 1 });
  });
  doc.moveDown(0.5);
  doc.font("Helvetica");

  for (const row of report.rows) {
    const y = doc.y;
    report.columns.forEach((col, i) => {
      doc.text(String(row[col] ?? ""), 40 + i * colWidth, y, { width: colWidth, continued: i < report.columns.length - 1 });
    });
    doc.moveDown(0.5);
  }

  doc.end();
}

export async function streamReportAsExcel(res: Response, report: ReportResult) {
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${report.title.replace(/\s+/g, "-").toLowerCase()}.xlsx"`);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(report.title.slice(0, 31));
  sheet.columns = report.columns.map((col) => ({ header: col, key: col, width: 22 }));
  sheet.getRow(1).font = { bold: true };
  for (const row of report.rows) {
    sheet.addRow(row);
  }

  await workbook.xlsx.write(res);
  res.end();
}

export function streamReportAsCsv(res: Response, report: ReportResult) {
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${report.title.replace(/\s+/g, "-").toLowerCase()}.csv"`);

  const stringifier = stringify({ header: true, columns: report.columns });
  stringifier.pipe(res);
  for (const row of report.rows) {
    stringifier.write(row);
  }
  stringifier.end();
}
