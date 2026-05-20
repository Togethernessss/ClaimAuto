using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Services.Interfaces;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace ClaimAuto.HealthSystems.Server.Services.Implementations
{
    public class ReconciliationPdfService : IReconciliationPdfService
    {
        // ── IST timezone helper ───────────────────────────────────────
        private static readonly TimeZoneInfo IST =
            TimeZoneInfo.FindSystemTimeZoneById("India Standard Time");

        private static string ToIST(DateTime? utc, string format) =>
            utc.HasValue
                ? TimeZoneInfo.ConvertTimeFromUtc(utc.Value, IST)
                    .ToString(format)
                : "—";

        private static string ToIST(DateTime utc, string format) =>
            TimeZoneInfo.ConvertTimeFromUtc(utc, IST)
                .ToString(format);

        public byte[] GenerateReconciliationPdf(
            Reconciliation reconciliation,
            List<Payment> payments)
        {
            QuestPDF.Settings.License = LicenseType.Community;

            var purple = "#667eea";
            var darkText = "#1e2a3a";
            var grayText = "#9e9e9e";
            var lightGray = "#e0e0e0";
            var lightBg = "#f5f5f5";

            var executedPayments = payments
                .Where(p => p.Status == PaymentStatus.Executed)
                .ToList();

            var totalAmount = executedPayments.Sum(p => p.Amount);

            return Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(40);
                    page.DefaultTextStyle(x =>
                        x.FontSize(11)
                         .FontFamily("Helvetica")
                         .FontColor(darkText));

                    page.Content().Column(col =>
                    {
                        // ── HEADER ────────────────────────────────────
                        col.Item().Row(row =>
                        {
                            row.RelativeItem().Row(r =>
                            {
                                r.ConstantItem(32).Height(32)
                                    .Background(purple)
                                    .AlignCenter()
                                    .AlignMiddle()
                                    .Text("C")
                                    .FontSize(16).Bold()
                                    .FontColor("#ffffff");

                                r.ConstantItem(8);

                                r.RelativeItem().Column(inner =>
                                {
                                    inner.Item()
                                        .Text("ClaimAuto")
                                        .FontSize(16).Bold()
                                        .FontColor(purple);
                                    inner.Item()
                                        .Text("Health Insurance")
                                        .FontSize(9)
                                        .FontColor(grayText);
                                });
                            });

                            row.ConstantItem(120).Column(c =>
                            {
                                c.Item().AlignRight()
                                    .Text("Reconciliation Report")
                                    .FontSize(9)
                                    .FontColor(grayText);
                                c.Item().AlignRight()
                                    .Text($"#REC-{reconciliation.ReconID}")
                                    .FontSize(15).Bold()
                                    .FontColor(darkText);
                                c.Item().AlignRight()
                                    .Text(ToIST(reconciliation.ReconciledAt,
                                        "dd MMM yyyy"))
                                    .FontSize(9)
                                    .FontColor(grayText);
                            });
                        });

                        col.Item().Height(10);
                        col.Item().Height(2).Background(purple);
                        col.Item().Height(2);
                        col.Item().Height(0.5f).Background(lightGray);
                        col.Item().Height(14);

                        // ── TITLE ─────────────────────────────────────
                        col.Item().AlignCenter()
                            .Text("Payment Reconciliation Report")
                            .FontSize(18).Bold()
                            .FontColor(darkText);

                        col.Item().Height(18);

                        // ── PERIOD + SUMMARY ──────────────────────────
                        col.Item().Row(row =>
                        {
                            row.RelativeItem().Column(c =>
                            {
                                c.Item()
                                    .BorderBottom(1)
                                    .BorderColor(lightGray)
                                    .PaddingBottom(5)
                                    .Text("Report Details")
                                    .FontSize(10).Bold()
                                    .FontColor(purple);
                                c.Item().Height(7);

                                void DetailRow(string label, string value)
                                {
                                    c.Item().Row(r =>
                                    {
                                        r.RelativeItem()
                                            .Text(label)
                                            .FontSize(10)
                                            .FontColor(grayText);
                                        r.RelativeItem().AlignRight()
                                            .Text(value)
                                            .FontSize(10).Bold()
                                            .FontColor(darkText);
                                    });
                                    c.Item().Height(4);
                                }

                                DetailRow("Report ID",
                                    $"#REC-{reconciliation.ReconID}");
                                DetailRow("Period Start",
                                    ToIST(reconciliation.PeriodStart,
                                        "dd MMM yyyy"));
                                DetailRow("Period End",
                                    ToIST(reconciliation.PeriodEnd,
                                        "dd MMM yyyy"));
                                DetailRow("Generated At",
                                    ToIST(reconciliation.ReconciledAt,
                                        "dd MMM yyyy, hh:mm tt"));
                            });

                            row.ConstantItem(24);

                            row.RelativeItem().Column(c =>
                            {
                                c.Item()
                                    .BorderBottom(1)
                                    .BorderColor(lightGray)
                                    .PaddingBottom(5)
                                    .Text("Summary")
                                    .FontSize(10).Bold()
                                    .FontColor(purple);
                                c.Item().Height(7);

                                void SummaryRow(string label, string value)
                                {
                                    c.Item().Row(r =>
                                    {
                                        r.RelativeItem()
                                            .Text(label)
                                            .FontSize(10)
                                            .FontColor(grayText);
                                        r.RelativeItem().AlignRight()
                                            .Text(value)
                                            .FontSize(10).Bold()
                                            .FontColor(darkText);
                                    });
                                    c.Item().Height(4);
                                }

                                SummaryRow("Total Payments",
                                    payments.Count.ToString());
                                SummaryRow("Executed Payments",
                                    executedPayments.Count.ToString());
                                SummaryRow("Pending Payments",
                                    payments.Count(p =>
                                        p.Status == PaymentStatus.Pending)
                                        .ToString());
                                SummaryRow("Total Amount Executed",
                                    $"INR {totalAmount:N2}");
                                SummaryRow("Discrepancies", "None");
                            });
                        });

                        col.Item().Height(20);

                        // ── PAYMENTS TABLE ────────────────────────────
                        col.Item()
                            .BorderBottom(1).BorderColor(lightGray)
                            .PaddingBottom(5)
                            .Text("Payment Records")
                            .FontSize(10).Bold()
                            .FontColor(purple);
                        col.Item().Height(8);

                        col.Item().Table(table =>
                        {
                            table.ColumnsDefinition(c =>
                            {
                                c.RelativeColumn(1f);
                                c.RelativeColumn(1f);
                                c.RelativeColumn(2f);
                                c.RelativeColumn(1.5f);
                                c.RelativeColumn(1f);
                                c.RelativeColumn(1f);
                                c.RelativeColumn(1.5f);
                            });

                            void HeaderCell(string text)
                            {
                                table.Cell()
                                    .Background(lightBg)
                                    .BorderBottom(1)
                                    .BorderColor(lightGray)
                                    .Padding(6)
                                    .Text(text)
                                    .FontSize(9).Bold()
                                    .FontColor("#555555");
                            }

                            HeaderCell("Payment ID");
                            HeaderCell("Claim ID");
                            HeaderCell("Payee");
                            HeaderCell("Amount");
                            HeaderCell("Method");
                            HeaderCell("Status");
                            HeaderCell("Executed At");

                            foreach (var p in payments)
                            {
                                var isExecuted =
                                    p.Status == PaymentStatus.Executed;

                                table.Cell()
                                    .Border(0.5f).BorderColor(lightGray)
                                    .Padding(6)
                                    .Text($"#PAY-{p.PaymentID}")
                                    .FontSize(9).FontColor(darkText);

                                table.Cell()
                                    .Border(0.5f).BorderColor(lightGray)
                                    .Padding(6)
                                    .Text($"#{p.ClaimID}")
                                    .FontSize(9).FontColor(darkText);

                                table.Cell()
                                    .Border(0.5f).BorderColor(lightGray)
                                    .Padding(6)
                                    .Text(p.Payee?.Name ?? "—")
                                    .FontSize(9).FontColor(darkText);

                                table.Cell()
                                    .Border(0.5f).BorderColor(lightGray)
                                    .Padding(6)
                                    .Text($"INR {p.Amount:N2}")
                                    .FontSize(9).Bold()
                                    .FontColor(darkText);

                                table.Cell()
                                    .Border(0.5f).BorderColor(lightGray)
                                    .Padding(6)
                                    .Text(p.PaymentMethod.ToString())
                                    .FontSize(9).FontColor(darkText);

                                table.Cell()
                                    .Border(0.5f).BorderColor(lightGray)
                                    .Background(isExecuted
                                        ? "#d1f2eb" : "#fff3e0")
                                    .Padding(6)
                                    .Text(p.Status.ToString())
                                    .FontSize(9).Bold()
                                    .FontColor(isExecuted
                                        ? "#085041" : "#e65100");

                                table.Cell()
                                    .Border(0.5f).BorderColor(lightGray)
                                    .Padding(6)
                                    .Text(p.ExecutedAt.HasValue
                                        ? ToIST(p.ExecutedAt.Value,
                                            "dd MMM yyyy") : "—")
                                    .FontSize(9).FontColor(darkText);
                            }
                        });

                        col.Item().Height(20);

                        // ── FOOTER ────────────────────────────────────
                        col.Item().Height(0.5f).Background(lightGray);
                        col.Item().Height(2);
                        col.Item().Height(2).Background(purple);
                        col.Item().Height(10);

                        col.Item().Row(row =>
                        {
                            row.RelativeItem().AlignMiddle().Column(c =>
                            {
                                c.Item()
                                    .Text("System-generated document · " +
                                          "No signature required")
                                    .FontSize(9).Italic()
                                    .FontColor("#bbbbbb");
                                c.Item().Height(2);
                                c.Item()
                                    .Text($"DOC-REC-{reconciliation.ReconID}" +
                                          $"-{ToIST(reconciliation.ReconciledAt, "yyyyMMdd")}")
                                    .FontSize(9)
                                    .FontColor("#bbbbbb");
                            });

                            row.ConstantItem(120).Column(c =>
                            {
                                c.Item().AlignRight()
                                    .Row(r =>
                                    {
                                        r.ConstantItem(18).Height(18)
                                            .Background(purple)
                                            .AlignCenter()
                                            .AlignMiddle()
                                            .Text("C")
                                            .FontSize(9).Bold()
                                            .FontColor("#ffffff");
                                        r.ConstantItem(6);
                                        r.RelativeItem().AlignMiddle()
                                            .Text("ClaimAuto Health Insurance")
                                            .FontSize(10).Bold()
                                            .FontColor(purple);
                                    });
                            });
                        });
                    });
                });
            }).GeneratePdf();
        }
    }
}