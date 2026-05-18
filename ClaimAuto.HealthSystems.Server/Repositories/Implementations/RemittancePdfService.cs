using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace ClaimAuto.HealthSystems.Server.Services.Implementations
{
    public class RemittancePdfService : IRemittancePdfService
    {
        private readonly Data.ApplicationDbContext _context;

        public RemittancePdfService(Data.ApplicationDbContext context)
        {
            _context = context;
        }

        public byte[] GenerateRemittancePdf(
            Remittance remittance,
            Payment payment)
        {
            QuestPDF.Settings.License = LicenseType.Community;

            var claim = _context.Claims
                .Include(c => c.Member)
                    .ThenInclude(m => m.Policy)
                .FirstOrDefault(c => c.ClaimID == payment.ClaimID);

            var memberName = claim?.Member?.Name ?? "—";
            var memberNumber = claim?.Member?.MemberNumber ?? "—";
            var memberDob = claim?.Member?.DOB.ToString("dd MMM yyyy") ?? "—";
            var planName = claim?.Member?.Policy?.PlanName ?? "—";
            var planCode = claim?.Member?.Policy?.PlanCode ?? "—";
            var deductible = claim?.Member?.Policy?.DeductibleAmount ?? 0;
            var oopMax = claim?.Member?.Policy?.OutOfPocketMax ?? 0;
            var claimType = claim?.ClaimType.ToString() ?? "—";
            var claimNotes = string.IsNullOrWhiteSpace(claim?.Notes)
                               ? "—" : claim!.Notes!;
            var submittedAt = claim?.SubmittedAt.ToString("dd MMM yyyy") ?? "—";

            var purple = "#667eea";
            var darkPurple = "#764ba2";
            var darkText = "#1e2a3a";
            var grayText = "#9e9e9e";
            var lightGray = "#e0e0e0";
            var lightBg = "#f5f5f5";
            var purpleBg = "#f7f5ff";
            var greenBg = "#d1f2eb";
            var greenText = "#085041";
            var noteBg = "#fafafa";

            // ── SVG Circular Stamp ────────────────────────────────────
            var stampSvg = @"
<svg xmlns='http://www.w3.org/2000/svg'
     width='90' height='90' viewBox='0 0 90 90'>

  <!-- Outer ring -->
  <circle cx='45' cy='45' r='42'
    fill='none' stroke='#667eea'
    stroke-width='2.5' opacity='0.7'/>

  <!-- Inner ring -->
  <circle cx='45' cy='45' r='34'
    fill='none' stroke='#667eea'
    stroke-width='1' opacity='0.4'/>

  <!-- 4 dots -->
  <circle cx='45' cy='4'  r='2' fill='#667eea' opacity='0.6'/>
  <circle cx='45' cy='86' r='2' fill='#667eea' opacity='0.6'/>
  <circle cx='4'  cy='45' r='2' fill='#667eea' opacity='0.6'/>
  <circle cx='86' cy='45' r='2' fill='#667eea' opacity='0.6'/>

  <!-- Top separator line -->
  <line x1='25' y1='33' x2='65' y2='33'
    stroke='#667eea' stroke-width='0.8' opacity='0.5'/>

  <!-- Bottom separator line -->
  <line x1='25' y1='57' x2='65' y2='57'
    stroke='#667eea' stroke-width='0.8' opacity='0.5'/>

  <!-- CLAIMAUTO -->
  <text x='45' y='30'
    text-anchor='middle'
    font-family='Helvetica'
    font-size='7'
    font-weight='bold'
    fill='#667eea'
    opacity='0.8'>CLAIMAUTO</text>

  <!-- PAID -->
  <text x='45' y='51'
    text-anchor='middle'
    font-family='Helvetica'
    font-size='14'
    font-weight='bold'
    fill='#667eea'
    opacity='0.85'>PAID</text>

  <!-- VERIFIED -->
  <text x='45' y='65'
    text-anchor='middle'
    font-family='Helvetica'
    font-size='7'
    fill='#667eea'
    opacity='0.7'>VERIFIED</text>

</svg>";

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
                            row.RelativeItem().Column(c =>
                            {
                                c.Item().Row(r =>
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
                                            .Text("Health Systems")
                                            .FontSize(9)
                                            .FontColor(grayText);
                                    });
                                });

                                c.Item().Height(4);
                                c.Item()
                                    .Text("Licensed Health Insurance Claims Processor")
                                    .FontSize(9)
                                    .FontColor(grayText);
                            });

                            row.ConstantItem(120).Column(c =>
                            {
                                c.Item().AlignRight()
                                    .Text("Receipt No.")
                                    .FontSize(9)
                                    .FontColor(grayText);
                                c.Item().AlignRight()
                                    .Text($"#REM-{remittance.RemittanceID}")
                                    .FontSize(15).Bold()
                                    .FontColor(darkText);
                                c.Item().AlignRight()
                                    .Text(remittance.GeneratedAt
                                        .ToString("dd MMM yyyy"))
                                    .FontSize(9)
                                    .FontColor(grayText);
                            });
                        });

                        col.Item().Height(10);

                        // ── Double divider ────────────────────────────
                        col.Item().Height(2).Background(purple);
                        col.Item().Height(2);
                        col.Item().Height(0.5f).Background(lightGray);

                        col.Item().Height(14);

                        // ── Title ─────────────────────────────────────
                        col.Item().AlignCenter()
                            .Text("Payment Receipt")
                            .FontSize(18).Bold()
                            .FontColor(darkText);

                        col.Item().Height(18);

                        // ── Local helpers ─────────────────────────────
                        void SectionHeader(ColumnDescriptor c, string title)
                        {
                            c.Item()
                                .BorderBottom(1).BorderColor(lightGray)
                                .PaddingBottom(5)
                                .Text(title)
                                .FontSize(10).Bold()
                                .FontColor(purple);
                            c.Item().Height(7);
                        }

                        void DetailRow(ColumnDescriptor c,
                            string label, string value)
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

                        // ── Row 1: Payment details + Paid to ─────────
                        col.Item().Row(row =>
                        {
                            row.RelativeItem().Column(c =>
                            {
                                SectionHeader(c, "Payment Details");
                                DetailRow(c, "Receipt no.",
                                    $"#REM-{remittance.RemittanceID}");
                                DetailRow(c, "Payment ID",
                                    $"#PAY-{payment.PaymentID}");
                                DetailRow(c, "Claim ID",
                                    $"Claim #{payment.ClaimID}");
                                DetailRow(c, "Date issued",
                                    remittance.GeneratedAt
                                        .ToString("dd MMM yyyy"));
                                DetailRow(c, "Executed on",
                                    payment.ExecutedAt?
                                        .ToString("dd MMM yyyy, HH:mm")
                                    ?? "—");
                            });

                            row.ConstantItem(24);

                            row.RelativeItem().Column(c =>
                            {
                                SectionHeader(c, "Paid To");
                                DetailRow(c, "Hospital",
                                    payment.Payee?.Name ?? "—");
                                DetailRow(c, "Payee ID",
                                    $"#{payment.PayeeID}");
                                DetailRow(c, "Method",
                                    payment.PaymentMethod.ToString());
                                DetailRow(c, "Reference no.",
                                    payment.ReferenceNumber ?? "—");
                            });
                        });

                        col.Item().Height(18);

                        // ── Row 2: Member details + Policy details ────
                        col.Item().Row(row =>
                        {
                            row.RelativeItem().Column(c =>
                            {
                                SectionHeader(c, "Member Details");
                                DetailRow(c, "Name", memberName);
                                DetailRow(c, "Member no.", memberNumber);
                                DetailRow(c, "Date of birth", memberDob);
                                DetailRow(c, "Claim type", claimType);
                                DetailRow(c, "Submitted on", submittedAt);
                            });

                            row.ConstantItem(24);

                            row.RelativeItem().Column(c =>
                            {
                                SectionHeader(c, "Policy Details");
                                DetailRow(c, "Plan name", planName);
                                DetailRow(c, "Plan code", planCode);
                                DetailRow(c, "Deductible",
                                    $"INR {deductible:N0}");
                                DetailRow(c, "Out of pocket max",
                                    $"INR {oopMax:N0}");
                            });
                        });

                        col.Item().Height(18);

                        // ── Amount box ────────────────────────────────
                        col.Item()
                            .Border(1).BorderColor("#c5bef5")
                            .Background(purpleBg)
                            .Padding(16)
                            .Row(row =>
                            {
                                row.RelativeItem().Column(c =>
                                {
                                    c.Item()
                                        .Text("Amount Paid")
                                        .FontSize(9)
                                        .FontColor(grayText);
                                    c.Item().Height(4);
                                    c.Item()
                                        .Text($"INR {payment.Amount:N2}")
                                        .FontSize(26).Bold()
                                        .FontColor(darkPurple);
                                    c.Item().Height(2);
                                    c.Item()
                                        .Text($"Indian Rupee · " +
                                              $"{payment.PaymentMethod}")
                                        .FontSize(9)
                                        .FontColor(grayText);
                                });

                                row.ConstantItem(16);
                                row.ConstantItem(1).Background(lightGray);
                                row.ConstantItem(16);

                                row.RelativeItem()
                                    .AlignMiddle()
                                    .AlignCenter()
                                    .Column(c =>
                                    {
                                        c.Item()
                                            .Background(greenBg)
                                            .Padding(10)
                                            .AlignCenter()
                                            .Text("Payment Sent")
                                            .FontSize(11).Bold()
                                            .FontColor(greenText);
                                    });
                            });

                        col.Item().Height(18);

                        // ── Treatment notes ───────────────────────────
                        col.Item()
                            .BorderBottom(1).BorderColor(lightGray)
                            .PaddingBottom(5)
                            .Text("Treatment Notes")
                            .FontSize(10).Bold()
                            .FontColor(purple);
                        col.Item().Height(7);
                        col.Item()
                            .BorderLeft(3).BorderColor(purple)
                            .Background(noteBg)
                            .Padding(8)
                            .Text(claimNotes)
                            .FontSize(10).Italic()
                            .FontColor("#555555");

                        col.Item().Height(18);

                        // ── Claim details table ───────────────────────
                        col.Item()
                            .BorderBottom(1).BorderColor(lightGray)
                            .PaddingBottom(5)
                            .Text("Claim Details")
                            .FontSize(10).Bold()
                            .FontColor(purple);
                        col.Item().Height(7);

                        col.Item().Table(table =>
                        {
                            table.ColumnsDefinition(c =>
                            {
                                c.RelativeColumn(1.2f);
                                c.RelativeColumn(2f);
                                c.RelativeColumn(1.5f);
                                c.RelativeColumn(1f);
                                c.RelativeColumn(1.5f);
                                c.RelativeColumn(1f);
                            });

                            void HeaderCell(string text)
                            {
                                table.Cell()
                                    .Background(lightBg)
                                    .BorderBottom(1).BorderColor(lightGray)
                                    .Padding(7)
                                    .Text(text)
                                    .FontSize(9).Bold()
                                    .FontColor("#555555");
                            }

                            HeaderCell("Claim ID");
                            HeaderCell("Provider");
                            HeaderCell("Type");
                            HeaderCell("Method");
                            HeaderCell("Amount");
                            HeaderCell("Status");

                            table.Cell()
                                .Border(0.5f).BorderColor(lightGray)
                                .Padding(7)
                                .Text($"Claim #{payment.ClaimID}")
                                .FontSize(10).FontColor(darkText);

                            table.Cell()
                                .Border(0.5f).BorderColor(lightGray)
                                .Padding(7)
                                .Text(payment.Payee?.Name ?? "—")
                                .FontSize(10).Bold().FontColor(darkText);

                            table.Cell()
                                .Border(0.5f).BorderColor(lightGray)
                                .Padding(7)
                                .Text(claimType)
                                .FontSize(10).FontColor(darkText);

                            table.Cell()
                                .Border(0.5f).BorderColor(lightGray)
                                .Padding(7)
                                .Text(payment.PaymentMethod.ToString())
                                .FontSize(10).FontColor(darkText);

                            table.Cell()
                                .Border(0.5f).BorderColor(lightGray)
                                .Padding(7)
                                .Text($"INR {payment.Amount:N2}")
                                .FontSize(10).Bold().FontColor(darkPurple);

                            table.Cell()
                                .Border(0.5f).BorderColor(lightGray)
                                .Background(greenBg)
                                .Padding(7)
                                .Text("Sent")
                                .FontSize(10).Bold().FontColor(greenText);
                        });

                        col.Item().Height(24);

                        // ── Double divider ────────────────────────────
                        col.Item().Height(0.5f).Background(lightGray);
                        col.Item().Height(2);
                        col.Item().Height(2).Background(purple);
                        col.Item().Height(14);

                        // ── Footer ────────────────────────────────────
                        col.Item().Row(row =>
                        {
                            row.RelativeItem().Column(c =>
                            {
                                c.Item().Row(r =>
                                {
                                    r.ConstantItem(20).Height(20)
                                        .Background(purple)
                                        .AlignCenter()
                                        .AlignMiddle()
                                        .Text("C")
                                        .FontSize(10).Bold()
                                        .FontColor("#ffffff");
                                    r.ConstantItem(6);
                                    r.RelativeItem().AlignMiddle()
                                        .Text("ClaimAuto Health Systems")
                                        .FontSize(11).Bold()
                                        .FontColor(purple);
                                });
                                c.Item().Height(6);
                                c.Item()
                                    .Text("System-generated document · " +
                                          "No signature required")
                                    .FontSize(9).Italic()
                                    .FontColor("#bbbbbb");
                                c.Item().Height(2);
                                c.Item()
                                    .Text($"DOC-REM-{remittance.RemittanceID}" +
                                          $"-{remittance.GeneratedAt:yyyyMMdd}")
                                    .FontSize(9)
                                    .FontColor("#bbbbbb");
                            });

                            row.ConstantItem(20);

                            // ── Circular stamp via SVG ────────────────
                            row.ConstantItem(90).Height(90)
                                .Svg(stampSvg);
                        });
                    });
                });
            }).GeneratePdf();
        }
    }
}