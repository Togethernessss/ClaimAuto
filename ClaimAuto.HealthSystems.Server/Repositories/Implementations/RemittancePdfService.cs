using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Services.Interfaces;

namespace ClaimAuto.HealthSystems.Server.Services.Implementations
{
    public class RemittancePdfService : IRemittancePdfService
    {
        public byte[] GenerateRemittancePdf(
            Remittance remittance,
            Payment payment)
        {
            QuestPDF.Settings.License = LicenseType.Community;

            return Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(40);
                    page.DefaultTextStyle(x =>
                        x.FontSize(11).FontFamily("Arial"));

                    page.Content().Column(col =>
                    {
                        // ── Header ────────────────────────────────
                        col.Item().Row(row =>
                        {
                            row.RelativeItem().Column(c =>
                            {
                                c.Item().Text("ClaimAuto Health Systems")
                                    .FontSize(20).Bold()
                                    .FontColor("#667eea");
                                c.Item().Text(
                                    "Licensed Health Insurance Claims Processor")
                                    .FontSize(10)
                                    .FontColor("#9e9e9e");
                            });
                            row.ConstantItem(140).Column(c =>
                            {
                                c.Item().AlignRight()
                                    .Text($"#REM-{remittance.RemittanceID}")
                                    .FontSize(14).Bold();
                                c.Item().AlignRight()
                                    .Text(remittance.GeneratedAt
                                        .ToString("dd MMM yyyy"))
                                    .FontSize(11)
                                    .FontColor("#9e9e9e");
                            });
                        });

                        col.Item().PaddingVertical(8)
                            .LineHorizontal(1)
                            .LineColor("#dee2e6");

                        // ── Title bar ─────────────────────────────
                        col.Item().Background("#667eea")
                            .Padding(10).Row(row =>
                            {
                                row.RelativeItem()
                                    .Text("REMITTANCE ADVICE")
                                    .FontSize(13).Bold()
                                    .FontColor("#ffffff");
                                row.ConstantItem(80)
                                    .AlignRight()
                                    .Text(remittance.Status.ToString()
                                        .ToUpper())
                                    .FontSize(11).Bold()
                                    .FontColor("#ffffff");
                            });

                        col.Item().Height(16);

                        // ── Two column section ────────────────────
                        col.Item().Row(row =>
                        {
                            // Left — Remittance details
                            row.RelativeItem().Column(c =>
                            {
                                c.Item().Text("Remittance Details")
                                    .FontSize(11).Bold()
                                    .FontColor("#667eea");
                                c.Item().PaddingBottom(6)
                                    .LineHorizontal(1.5f)
                                    .LineColor("#667eea");
                                c.Item().Height(6);

                                void RemRow(string label, string value)
                                {
                                    c.Item().Row(r =>
                                    {
                                        r.RelativeItem()
                                            .Text(label)
                                            .FontSize(10)
                                            .FontColor("#9e9e9e");
                                        r.RelativeItem()
                                            .AlignRight()
                                            .Text(value)
                                            .FontSize(10).Bold();
                                    });
                                    c.Item().Height(4);
                                }

                                RemRow("Remittance ID",
                                    $"#REM-{remittance.RemittanceID}");
                                RemRow("Payment ID",
                                    $"#PAY-{payment.PaymentID}");
                                RemRow("Claim ID",
                                    $"Claim #{payment.ClaimID}");
                                RemRow("Generated On",
                                    remittance.GeneratedAt
                                        .ToString("dd MMM yyyy"));
                                RemRow("Sent On",
                                    remittance.SentToProviderAt
                                        ?.ToString("dd MMM yyyy")
                                    ?? "—");
                            });

                            row.ConstantItem(20);

                            // Right — Payee details
                            row.RelativeItem().Column(c =>
                            {
                                c.Item().Text("Payee Details")
                                    .FontSize(11).Bold()
                                    .FontColor("#667eea");
                                c.Item().PaddingBottom(6)
                                    .LineHorizontal(1.5f)
                                    .LineColor("#667eea");
                                c.Item().Height(6);

                                void PayRow(string label, string value)
                                {
                                    c.Item().Row(r =>
                                    {
                                        r.RelativeItem()
                                            .Text(label)
                                            .FontSize(10)
                                            .FontColor("#9e9e9e");
                                        r.RelativeItem()
                                            .AlignRight()
                                            .Text(value)
                                            .FontSize(10).Bold();
                                    });
                                    c.Item().Height(4);
                                }

                                PayRow("Hospital",
                                    payment.Payee?.Name ?? "Unknown");
                                PayRow("Payee ID",
                                    $"#{payment.PayeeID}");
                                PayRow("Method",
                                    payment.PaymentMethod.ToString());
                                PayRow("Currency",
                                    payment.Currency);
                            });
                        });

                        col.Item().Height(16);

                        // ── Amount highlight box ──────────────────
                        col.Item().Background("#f3f0ff")
                            .Border(1.5f).BorderColor("#667eea")
                            .Padding(14).Row(row =>
                            {
                                row.RelativeItem().Column(c =>
                                {
                                    c.Item().Text(
                                        "Total Amount Disbursed")
                                        .FontSize(10)
                                        .FontColor("#9e9e9e");
                                    c.Item().Text(
                                        $"₹{payment.Amount:N0}")
                                        .FontSize(26).Bold()
                                        .FontColor("#764ba2");
                                    c.Item().Text(
                                        $"{payment.Currency} · " +
                                        $"{payment.PaymentMethod}")
                                        .FontSize(10)
                                        .FontColor("#9e9e9e");
                                });
                                row.ConstantItem(180)
                                    .AlignRight().Column(c =>
                                    {
                                        c.Item().AlignRight()
                                            .Text("Reference Number")
                                            .FontSize(10)
                                            .FontColor("#9e9e9e");
                                        c.Item().AlignRight()
                                            .Text(payment.ReferenceNumber ?? "—")
                                            .FontSize(12).Bold();
                                        c.Item().Height(6);
                                        c.Item().AlignRight()
                                            .Text("Executed On")
                                            .FontSize(10)
                                            .FontColor("#9e9e9e");
                                        c.Item().AlignRight()
                                            .Text(payment.ExecutedAt
                                                ?.ToString("dd MMM yyyy, HH:mm")
                                            ?? "—")
                                            .FontSize(11).Bold();
                                    });
                            });

                        col.Item().Height(16);

                        // ── Claim Details table ───────────────────
                        col.Item().Text("Claim Details")
                            .FontSize(11).Bold()
                            .FontColor("#667eea");
                        col.Item().PaddingBottom(6)
                            .LineHorizontal(1.5f)
                            .LineColor("#667eea");
                        col.Item().Height(6);

                        col.Item().Table(table =>
                        {
                            table.ColumnsDefinition(c =>
                            {
                                c.RelativeColumn(2);
                                c.RelativeColumn(3);
                                c.RelativeColumn(2);
                                c.RelativeColumn(2);
                                c.RelativeColumn(2);
                            });

                            // Normal cell
                            void DataCell(string text,
                                string color = "#1e2a3a")
                            {
                                table.Cell()
                                    .Border(0.5f)
                                    .BorderColor("#dee2e6")
                                    .Padding(7)
                                    .Text(text)
                                    .FontSize(10)
                                    .FontColor(color);
                            }

                            // Bold cell
                            void DataCellBold(string text,
                                string color = "#1e2a3a")
                            {
                                table.Cell()
                                    .Border(0.5f)
                                    .BorderColor("#dee2e6")
                                    .Padding(7)
                                    .Text(text)
                                    .FontSize(10).Bold()
                                    .FontColor(color);
                            }

                            // Header cell
                            void HeaderCell(string text)
                            {
                                table.Cell()
                                    .Background("#f8f9fa")
                                    .Border(0.5f)
                                    .BorderColor("#dee2e6")
                                    .Padding(7)
                                    .Text(text)
                                    .FontSize(10).Bold()
                                    .FontColor("#6c757d");
                            }

                            HeaderCell("Claim ID");
                            HeaderCell("Provider");
                            HeaderCell("Method");
                            HeaderCell("Amount");
                            HeaderCell("Status");

                            DataCell($"Claim #{payment.ClaimID}");
                            DataCellBold(
                                payment.Payee?.Name ?? "Unknown");
                            DataCell(
                                payment.PaymentMethod.ToString());
                            DataCellBold(
                                $"₹{payment.Amount:N0}",
                                color: "#764ba2");
                            DataCellBold(
                                remittance.Status.ToString(),
                                color: "#633806");
                        });

                        col.Item().Height(16);

                        // ── Important notice ──────────────────────
                        col.Item().BorderLeft(3)
                            .BorderColor("#667eea")
                            .PaddingLeft(10)
                            .Background("#f8f9fa")
                            .Padding(10).Text(text =>
                            {
                                text.Span("Important: ")
                                    .Bold().FontSize(10);
                                text.Span(
                                    "Please acknowledge receipt of " +
                                    "this remittance advice within " +
                                    "7 business days by logging into " +
                                    "the ClaimAuto portal. This " +
                                    "confirms that the payment has " +
                                    "been received by your institution.")
                                    .FontSize(10)
                                    .FontColor("#6c757d");
                            });

                        col.Item().Height(24);

                        col.Item().LineHorizontal(1)
                            .LineColor("#dee2e6");
                        col.Item().Height(10);

                        // ── Footer ────────────────────────────────
                        col.Item().Row(row =>
                        {
                            row.RelativeItem().Column(c =>
                            {
                                c.Item().Text("Issued by")
                                    .FontSize(10)
                                    .FontColor("#9e9e9e");
                                c.Item().Text(
                                    "ClaimAuto Health Systems")
                                    .FontSize(12).Bold()
                                    .FontColor("#667eea");
                                c.Item().Text(
                                    "support@claimauto.com")
                                    .FontSize(10)
                                    .FontColor("#9e9e9e");
                            });
                            row.RelativeItem().AlignRight().Column(c =>
                            {
                                c.Item().AlignRight()
                                    .Text(
                                    "This is a system-generated document.")
                                    .FontSize(9).Italic()
                                    .FontColor("#9e9e9e");
                                c.Item().AlignRight()
                                    .Text("No signature required.")
                                    .FontSize(9).Italic()
                                    .FontColor("#9e9e9e");
                                c.Item().Height(4);
                                c.Item().AlignRight()
                                    .Text(
                                    $"DOC-REM-{remittance.RemittanceID}" +
                                    $"-{DateTime.UtcNow:yyyyMMdd}")
                                    .FontSize(9)
                                    .FontColor("#9e9e9e");
                            });
                        });
                    });
                });
            }).GeneratePdf();
        }
    }
}