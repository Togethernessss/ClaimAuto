using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Services.Interfaces;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using System.Text.Json;

namespace ClaimAuto.HealthSystems.Server.Services.Implementations
{
    public class ReportPdfService : IReportPdfService
    {
        // ── IST timezone helper ───────────────────────────────────────
        private static readonly TimeZoneInfo IST =
            TimeZoneInfo.FindSystemTimeZoneById(
                "India Standard Time");

        private static string ToIST(DateTime utc, string format) =>
            TimeZoneInfo.ConvertTimeFromUtc(utc, IST)
                .ToString(format);

        public byte[] GenerateReportPdf(Report report)
        {
            QuestPDF.Settings.License = LicenseType.Community;

            var purple = "#667eea";
            var darkText = "#1e2a3a";
            var grayText = "#9e9e9e";
            var lightGray = "#e0e0e0";
            var lightBg = "#f5f5f5";

            // ── Parse metrics ─────────────────────────────────────────
            var metrics = new Dictionary<string, object>();
            if (!string.IsNullOrEmpty(report.MetricsJSON))
            {
                try
                {
                    metrics = JsonSerializer
                        .Deserialize<Dictionary<string, object>>(
                            report.MetricsJSON)
                        ?? new();
                }
                catch { }
            }

            // ── Scope color ───────────────────────────────────────────
            var scopeColor = report.Scope switch
            {
                ReportScope.Operational => "#0d6efd",
                ReportScope.Financial => "#22c55e",
                ReportScope.Fraud => "#ef4444",
                ReportScope.Regulatory => "#764ba2",
                _ => "#667eea"
            };

            // ── Build metrics rows ────────────────────────────────────
            var metricRows = BuildMetricRows(report.Scope, metrics);

            // ── Build SVG bar chart ───────────────────────────────────
            var chartSvg = BuildBarChart(
                report.Scope, metrics, scopeColor);

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

                            row.ConstantItem(140).Column(c =>
                            {
                                c.Item().AlignRight()
                                    .Text($"{report.Scope} Report")
                                    .FontSize(9)
                                    .FontColor(grayText);
                                c.Item().AlignRight()
                                    .Text($"#RPT-{report.ReportID}")
                                    .FontSize(15).Bold()
                                    .FontColor(darkText);
                                c.Item().AlignRight()
                                    .Text(ToIST(report.GeneratedAt,
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
                            .Text($"{report.Scope} Report")
                            .FontSize(18).Bold()
                            .FontColor(darkText);
                        col.Item().Height(4);
                        col.Item().AlignCenter()
                            .Text($"Generated on " +
                                  $"{ToIST(report.GeneratedAt, "dd MMM yyyy, hh:mm tt")} IST")
                            .FontSize(9)
                            .FontColor(grayText);

                        col.Item().Height(18);

                        // ── REPORT DETAILS + SUMMARY ──────────────────
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

                                void DR(string label, string value)
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

                                DR("Report ID",
                                    $"#RPT-{report.ReportID}");
                                DR("Scope",
                                    report.Scope.ToString());
                                DR("Generated By",
                                    report.GeneratedByUser?.Name
                                    ?? "System");
                                DR("Generated At",
                                    ToIST(report.GeneratedAt,
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

                                foreach (var m in metricRows)
                                {
                                    c.Item().Row(r =>
                                    {
                                        r.RelativeItem()
                                            .Text(m.Key)
                                            .FontSize(10)
                                            .FontColor(grayText);
                                        r.RelativeItem().AlignRight()
                                            .Text(m.Value)
                                            .FontSize(10).Bold()
                                            .FontColor(darkText);
                                    });
                                    c.Item().Height(4);
                                }
                            });
                        });

                        col.Item().Height(20);

                        // ── BAR CHART ─────────────────────────────────
                        col.Item()
                            .BorderBottom(1).BorderColor(lightGray)
                            .PaddingBottom(5)
                            .Text("Visual Overview")
                            .FontSize(10).Bold()
                            .FontColor(purple);
                        col.Item().Height(8);

                        col.Item()
                            .Height(160)
                            .Svg(chartSvg);

                        col.Item().Height(20);

                        // ── METRICS TABLE ─────────────────────────────
                        col.Item()
                            .BorderBottom(1).BorderColor(lightGray)
                            .PaddingBottom(5)
                            .Text("Detailed Metrics")
                            .FontSize(10).Bold()
                            .FontColor(purple);
                        col.Item().Height(8);

                        col.Item().Table(table =>
                        {
                            table.ColumnsDefinition(c =>
                            {
                                c.RelativeColumn(2f);
                                c.RelativeColumn(1f);
                            });

                            // Header
                            table.Cell()
                                .Background(lightBg)
                                .BorderBottom(1)
                                .BorderColor(lightGray)
                                .Padding(8)
                                .Text("Metric")
                                .FontSize(9).Bold()
                                .FontColor("#555555");

                            table.Cell()
                                .Background(lightBg)
                                .BorderBottom(1)
                                .BorderColor(lightGray)
                                .Padding(8)
                                .Text("Value")
                                .FontSize(9).Bold()
                                .FontColor("#555555");

                            // Rows
                            foreach (var m in metricRows)
                            {
                                table.Cell()
                                    .Border(0.5f)
                                    .BorderColor(lightGray)
                                    .Padding(8)
                                    .Text(m.Key)
                                    .FontSize(10)
                                    .FontColor(darkText);

                                table.Cell()
                                    .Border(0.5f)
                                    .BorderColor(lightGray)
                                    .Background("#f7f5ff")
                                    .Padding(8)
                                    .Text(m.Value)
                                    .FontSize(10).Bold()
                                    .FontColor(scopeColor);
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
                                    .Text($"DOC-RPT-{report.ReportID}" +
                                          $"-{ToIST(report.GeneratedAt, "yyyyMMdd")}")
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

        // ── Build metric rows per scope ───────────────────────────────
        private static List<KeyValuePair<string, string>>
            BuildMetricRows(
                ReportScope scope,
                Dictionary<string, object> metrics)
        {
            string Get(string key) =>
                metrics.TryGetValue(key, out var v)
                    ? v?.ToString() ?? "—" : "—";

            return scope switch
            {
                ReportScope.Operational => new()
                {
                    new("Total Claims",        Get("totalClaims")),
                    new("Auto-Adjudicated",    Get("autoPaid")),
                    new("Denied",              Get("denied")),
                    new("Denial Rate",         Get("denialRate")),
                },
                ReportScope.Financial => new()
                {
                    new("Total Payments",      Get("totalPayments")),
                    new("Total Executed",
                        $"INR {decimal.Parse(Get("totalPaid") == "—" ? "0" : Get("totalPaid")):N2}"),
                    new("Pending Payments",    Get("pendingPayments")),
                },
                ReportScope.Fraud => new()
                {
                    new("Total Scored",        Get("totalScored")),
                    new("High Risk",           Get("highRisk")),
                    new("Cases Opened",        Get("casesOpened")),
                    new("Cases Resolved",      Get("casesResolved")),
                },
                ReportScope.Regulatory => new()
                {
                    new("Total Audit Logs",    Get("totalLogs")),
                    new("Total Adjudications", Get("totalAdjudications")),
                },
                _ => new()
            };
        }

        // ── Build SVG bar chart ───────────────────────────────────────
        private static string BuildBarChart(
            ReportScope scope,
            Dictionary<string, object> metrics,
            string color)
        {
            string Get(string key) =>
                metrics.TryGetValue(key, out var v)
                    ? v?.ToString() ?? "0" : "0";

            // Build bars list: (label, value)
            var bars = scope switch
            {
                ReportScope.Operational => new List<(string, double)>
                {
                    ("Total Claims",
                        double.TryParse(Get("totalClaims"),
                            out var tc) ? tc : 0),
                    ("Auto-Adj",
                        double.TryParse(Get("autoPaid"),
                            out var ap) ? ap : 0),
                    ("Denied",
                        double.TryParse(Get("denied"),
                            out var dn) ? dn : 0),
                },
                ReportScope.Financial => new List<(string, double)>
                {
                    ("Total Payments",
                        double.TryParse(Get("totalPayments"),
                            out var tp) ? tp : 0),
                    ("Pending",
                        double.TryParse(Get("pendingPayments"),
                            out var pp) ? pp : 0),
                },
                ReportScope.Fraud => new List<(string, double)>
                {
                    ("Scored",
                        double.TryParse(Get("totalScored"),
                            out var ts) ? ts : 0),
                    ("High Risk",
                        double.TryParse(Get("highRisk"),
                            out var hr) ? hr : 0),
                    ("Opened",
                        double.TryParse(Get("casesOpened"),
                            out var co) ? co : 0),
                    ("Resolved",
                        double.TryParse(Get("casesResolved"),
                            out var cr) ? cr : 0),
                },
                ReportScope.Regulatory => new List<(string, double)>
                {
                    ("Audit Logs",
                        double.TryParse(Get("totalLogs"),
                            out var tl) ? tl : 0),
                    ("Adjudications",
                        double.TryParse(Get("totalAdjudications"),
                            out var ta) ? ta : 0),
                },
                _ => new List<(string, double)>()
            };

            if (!bars.Any())
                return "<svg xmlns='http://www.w3.org/2000/svg' " +
                       "width='500' height='160'></svg>";

            var maxVal = bars.Max(b => b.Item2);
            if (maxVal == 0) maxVal = 1;

            var svgWidth = 500;
            var svgHeight = 160;
            var chartH = 110;
            var barWidth = Math.Min(60, (svgWidth - 40) / bars.Count - 20);
            var gap = (svgWidth - 40 - bars.Count * barWidth)
                            / (bars.Count + 1);

            var sb = new System.Text.StringBuilder();
            sb.Append($"<svg xmlns='http://www.w3.org/2000/svg' " +
                      $"width='{svgWidth}' height='{svgHeight}'>");

            // Background
            sb.Append($"<rect width='{svgWidth}' height='{svgHeight}' " +
                      $"fill='#fafafa' rx='4'/>");

            // Baseline
            sb.Append($"<line x1='20' y1='{chartH}' " +
                      $"x2='{svgWidth - 20}' y2='{chartH}' " +
                      $"stroke='#e0e0e0' stroke-width='1'/>");

            for (int i = 0; i < bars.Count; i++)
            {
                var (label, val) = bars[i];
                var barH = (int)(val / maxVal * (chartH - 20));
                if (barH < 2 && val > 0) barH = 2;
                var x = 20 + gap + i * (barWidth + gap);
                var y = chartH - barH;

                // Bar
                sb.Append($"<rect x='{x}' y='{y}' " +
                          $"width='{barWidth}' height='{barH}' " +
                          $"fill='{color}' opacity='0.85' rx='3'/>");

                // Value on top
                if (val > 0)
                {
                    sb.Append($"<text x='{x + barWidth / 2}' " +
                              $"y='{y - 4}' " +
                              $"text-anchor='middle' " +
                              $"font-family='Helvetica' " +
                              $"font-size='10' " +
                              $"font-weight='bold' " +
                              $"fill='{color}'>{val}</text>");
                }

                // Label below baseline
                sb.Append($"<text x='{x + barWidth / 2}' " +
                          $"y='{chartH + 14}' " +
                          $"text-anchor='middle' " +
                          $"font-family='Helvetica' " +
                          $"font-size='9' " +
                          $"fill='#9e9e9e'>{label}</text>");
            }

            sb.Append("</svg>");
            return sb.ToString();
        }
    }
}