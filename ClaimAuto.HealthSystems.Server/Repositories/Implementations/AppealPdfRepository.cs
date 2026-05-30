using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;
using ClaimAuto.HealthSystems.Server.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace ClaimAuto.HealthSystems.Server.Repositories.Implementations
{
    /// <summary>
    /// Renders a multi-section, audit-ready PDF for a filed appeal.
    /// Layout:
    ///   • Branded header with insurer name + report title
    ///   • Status banner (filed date, status badge)
    ///   • Two-column "Appellant Details" / "Claim Under Appeal" cards
    ///   • Full-width "Reason for Appeal" block
    ///   • Supporting documents table (filename, type, size)
    ///   • Embedded image previews on subsequent pages
    ///   • Footer with confidentiality notice + page numbers
    /// </summary>
    public class AppealPdfRepository : IAppealPdfRepository
    {
        // India Standard Time — used for displaying user-facing timestamps.
        // Backend stores UTC; we convert on render only.
        private static readonly TimeZoneInfo IstTz =
            TryGetIst() ?? TimeZoneInfo.CreateCustomTimeZone(
                "IST", TimeSpan.FromHours(5.5), "India Standard Time", "India Standard Time");

        private static TimeZoneInfo? TryGetIst()
        {
            try { return TimeZoneInfo.FindSystemTimeZoneById("India Standard Time"); }
            catch
            {
                try { return TimeZoneInfo.FindSystemTimeZoneById("Asia/Kolkata"); }
                catch { return null; }
            }
        }

        private static string FormatIst(DateTime utc) =>
            $"{TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utc, DateTimeKind.Utc), IstTz):dd MMM yyyy, hh:mm tt} IST";

        private static readonly string[] ImageExtensions = { ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp" };

        // Brand colors — matches the app's gradient theme
        private const string BrandPrimary   = "#667eea";
        private const string BrandSecondary = "#764ba2";
        private const string TextDark       = "#1e2a3a";
        private const string TextMuted      = "#6c757d";
        private const string CardBg         = "#f8f9fa";
        private const string CardBorder     = "#e9ecef";
        private const string StatusFiled    = "#0d6efd";

        public byte[] CompileDocumentsPdf(
            Appeal appeal,
            AppealPdfContext ctx,
            List<IFormFile> files)
        {
            QuestPDF.Settings.License = LicenseType.Community;

            // Precompute file lists once so multi-page rendering doesn't re-iterate.
            var fileEntries = (files ?? new List<IFormFile>())
                .Where(f => f.Length > 0)
                .Select(f => new FileEntry(
                    f.FileName,
                    Path.GetExtension(f.FileName).ToLowerInvariant(),
                    f.Length,
                    f.ContentType ?? "application/octet-stream"))
                .ToList();

            // Read image bytes ahead of time so they can be embedded on inner pages.
            var imageBytes = new List<(string Name, byte[] Data)>();
            foreach (var f in files ?? new List<IFormFile>())
            {
                if (f.Length == 0) continue;
                var ext = Path.GetExtension(f.FileName).ToLowerInvariant();
                if (!ImageExtensions.Contains(ext)) continue;

                using var ms = new MemoryStream();
                f.CopyTo(ms);
                imageBytes.Add((f.FileName, ms.ToArray()));
            }

            return Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(36);
                    page.PageColor(Colors.White);
                    page.DefaultTextStyle(t => t.FontFamily("Calibri").FontSize(10).FontColor(TextDark));

                    page.Header().Element(c => ComposeHeader(c, ctx));
                    page.Content().Element(c => ComposeContent(c, appeal, ctx, fileEntries, imageBytes));
                    page.Footer().Element(ComposeFooter);
                });
            }).GeneratePdf();
        }

        // ══════════════════════════════════════════════════════════════════
        //  HEADER — branded bar with org name + report title
        // ══════════════════════════════════════════════════════════════════
        private void ComposeHeader(IContainer container, AppealPdfContext ctx)
        {
            container.Column(col =>
            {
                // Brand strip
                col.Item().Background(BrandPrimary).Padding(12).Row(row =>
                {
                    row.RelativeItem().Column(left =>
                    {
                        left.Item().Text(ctx.OrganizationName ?? "ClaimAuto Health Systems")
                            .FontSize(14).Bold().FontColor(Colors.White);
                        left.Item().Text("Claims Appeal Documentation")
                            .FontSize(9).FontColor(Colors.White.WithAlpha(220));
                    });
                    row.ConstantItem(140).AlignRight().AlignMiddle()
                        .Text("CONFIDENTIAL")
                        .FontSize(9).Bold().FontColor(Colors.White.WithAlpha(220)).Italic();
                });

                // Sub-bar with date
                col.Item().Background(BrandSecondary).Padding(6).AlignRight()
                    .Text($"Generated: {FormatIst(DateTime.UtcNow)}")
                    .FontSize(8).FontColor(Colors.White.WithAlpha(230));
            });
        }

        // ══════════════════════════════════════════════════════════════════
        //  CONTENT — main body
        // ══════════════════════════════════════════════════════════════════
        private void ComposeContent(
            IContainer container,
            Appeal appeal,
            AppealPdfContext ctx,
            List<FileEntry> fileEntries,
            List<(string Name, byte[] Data)> imageBytes)
        {
            container.PaddingVertical(14).Column(col =>
            {
                // ── Title + status banner ──
                col.Item().Row(row =>
                {
                    row.RelativeItem().Column(left =>
                    {
                        left.Item().Text($"Appeal {AppealRef(appeal)}")
                            .FontSize(20).Bold().FontColor(TextDark);
                        left.Item().Text("Audit-ready submission record")
                            .FontSize(9).FontColor(TextMuted).Italic();
                    });
                    row.ConstantItem(140).AlignRight().AlignTop().Element(c =>
                        StatusBadge(c, appeal.Status.ToString()));
                });

                col.Item().PaddingTop(12).LineHorizontal(0.5f).LineColor(CardBorder);

                // ── Filed date row ──
                col.Item().PaddingTop(8).Row(row =>
                {
                    row.RelativeItem().Element(c =>
                        Pair(c, "Filed On", FormatIst(appeal.FiledAt)));
                    row.RelativeItem().Element(c =>
                        Pair(c, "Appeal Reference", AppealRef(appeal)));
                });

                col.Item().PaddingTop(14);

                // ── Two-column cards: Appellant + Claim under appeal ──
                col.Item().Row(row =>
                {
                    row.RelativeItem().PaddingRight(6).Element(c =>
                        InfoCard(c, "APPELLANT", new (string, string)[]
                        {
                            ("Name", ctx.FilerName ?? "—"),
                            ("Role", ctx.FilerRole ?? "—"),
                        }));

                    row.RelativeItem().PaddingLeft(6).Element(c =>
                        InfoCard(c, "CLAIM UNDER APPEAL", new (string, string)[]
                        {
                            ("Claim Reference", ctx.ClaimReference ?? AppealRef(appeal).Replace("APL-", "CLM-")),
                            ("Member",          ctx.MemberName    ?? "—"),
                            ("Provider",        ctx.ProviderName  ?? "—"),
                            ("Claim Type",      ctx.ClaimTypeDisplay ?? "—"),
                            ("Billed Amount",   ctx.ClaimAmount.HasValue ? $"₹{ctx.ClaimAmount.Value:N2}" : "—"),
                            ("Current Status",  ctx.ClaimStatusDisplay ?? "—"),
                        }));
                });

                col.Item().PaddingTop(14);

                // ── Reason block ──
                col.Item().Element(c => SectionCard(c, "REASON FOR APPEAL", inner =>
                {
                    inner.Item().Text(string.IsNullOrWhiteSpace(appeal.Reason) ? "(No reason provided)" : appeal.Reason)
                        .FontSize(10).LineHeight(1.4f).FontColor(TextDark);
                }));

                col.Item().PaddingTop(14);

                // ── Documents table ──
                col.Item().Element(c => SectionCard(c, $"SUPPORTING DOCUMENTS ({fileEntries.Count})", inner =>
                {
                    if (fileEntries.Count == 0)
                    {
                        inner.Item().Text("No documents were uploaded with this appeal.")
                            .FontSize(10).Italic().FontColor(TextMuted);
                        return;
                    }

                    inner.Item().Table(table =>
                    {
                        table.ColumnsDefinition(c =>
                        {
                            c.ConstantColumn(28);     // #
                            c.RelativeColumn(5);       // file name
                            c.ConstantColumn(80);      // type
                            c.ConstantColumn(80);      // size
                        });

                        // Header row
                        table.Header(h =>
                        {
                            h.Cell().Element(HeaderCell).Text("#");
                            h.Cell().Element(HeaderCell).Text("File");
                            h.Cell().Element(HeaderCell).Text("Type");
                            h.Cell().Element(HeaderCell).AlignRight().Text("Size");
                        });

                        // Data rows
                        for (int i = 0; i < fileEntries.Count; i++)
                        {
                            var f = fileEntries[i];
                            table.Cell().Element(BodyCell).Text((i + 1).ToString());
                            table.Cell().Element(BodyCell).Text(f.Name).WrapAnywhere();
                            table.Cell().Element(BodyCell).Text(FriendlyTypeFor(f.Extension, f.ContentType));
                            table.Cell().Element(BodyCell).AlignRight().Text(FormatSize(f.Size));
                        }
                    });

                    inner.Item().PaddingTop(6).Text("Image attachments are previewed on the following pages.")
                        .FontSize(8).Italic().FontColor(TextMuted);
                }));

                // ── Embedded image previews on inner pages ──
                if (imageBytes.Count > 0)
                {
                    col.Item().PageBreak();

                    col.Item().PaddingBottom(10).Text("DOCUMENT PREVIEWS")
                        .FontSize(13).Bold().FontColor(BrandSecondary).LetterSpacing(0.05f);
                    col.Item().LineHorizontal(0.5f).LineColor(CardBorder);

                    foreach (var img in imageBytes)
                    {
                        col.Item().PaddingTop(10).Text(img.Name)
                            .FontSize(10).Bold().FontColor(TextDark);
                        col.Item().PaddingTop(4).PaddingBottom(14)
                            .Border(0.5f).BorderColor(CardBorder)
                            .Padding(4)
                            .Image(img.Data).FitWidth();
                    }
                }
            });
        }

        // ══════════════════════════════════════════════════════════════════
        //  FOOTER
        // ══════════════════════════════════════════════════════════════════
        private void ComposeFooter(IContainer container)
        {
            container.Column(col =>
            {
                col.Item().LineHorizontal(0.5f).LineColor(CardBorder);
                col.Item().PaddingTop(6).Row(row =>
                {
                    row.RelativeItem().Text("CONFIDENTIAL · For internal review and audit only")
                        .FontSize(8).Italic().FontColor(TextMuted);
                    row.ConstantItem(80).AlignRight().Text(t =>
                    {
                        t.DefaultTextStyle(s => s.FontSize(8).FontColor(TextMuted));
                        t.Span("Page ");
                        t.CurrentPageNumber();
                        t.Span(" of ");
                        t.TotalPages();
                    });
                });
            });
        }

        // ══════════════════════════════════════════════════════════════════
        //  Reusable presentation helpers
        // ══════════════════════════════════════════════════════════════════
        private void InfoCard(IContainer container, string title, IEnumerable<(string Label, string Value)> rows)
        {
            container
                .Background(CardBg)
                .Border(0.5f).BorderColor(CardBorder)
                .Padding(10)
                .Column(col =>
                {
                    col.Item().PaddingBottom(6).Text(title)
                        .FontSize(8).Bold().LetterSpacing(0.1f).FontColor(BrandSecondary);

                    foreach (var (label, value) in rows)
                    {
                        col.Item().PaddingVertical(2).Row(r =>
                        {
                            r.ConstantItem(90).Text(label).FontSize(9).FontColor(TextMuted);
                            r.RelativeItem().Text(value).FontSize(10).Bold().FontColor(TextDark);
                        });
                    }
                });
        }

        private void SectionCard(IContainer container, string title, Action<ColumnDescriptor> innerBuilder)
        {
            container
                .Background(CardBg)
                .Border(0.5f).BorderColor(CardBorder)
                .Padding(10)
                .Column(col =>
                {
                    col.Item().PaddingBottom(8).Text(title)
                        .FontSize(8).Bold().LetterSpacing(0.1f).FontColor(BrandSecondary);
                    col.Item().Column(innerBuilder);
                });
        }

        private void Pair(IContainer container, string label, string value)
        {
            container.Column(col =>
            {
                col.Item().Text(label).FontSize(8).FontColor(TextMuted).LetterSpacing(0.05f);
                col.Item().Text(value).FontSize(10).Bold().FontColor(TextDark);
            });
        }

        private void StatusBadge(IContainer container, string status)
        {
            var (bg, fg) = status switch
            {
                "Filed"          => ("#e3f2fd", StatusFiled),
                "UnderReview"    => ("#fff3e0", "#e65100"),
                "Decided"        => ("#d1f2eb", "#085041"),
                "Withdrawn"      => ("#f5f5f5", "#757575"),
                _                => ("#e2e3e5", "#41464b"),
            };
            container
                .Background(bg)
                .PaddingVertical(4).PaddingHorizontal(10)
                .AlignCenter()
                .Text(status.ToUpperInvariant())
                .FontSize(9).Bold().FontColor(fg).LetterSpacing(0.1f);
        }

        private static IContainer HeaderCell(IContainer c) =>
            c.Background("#eef0fa").PaddingVertical(5).PaddingHorizontal(6)
             .DefaultTextStyle(t => t.FontSize(9).Bold().FontColor(BrandSecondary));

        private static IContainer BodyCell(IContainer c) =>
            c.BorderBottom(0.25f).BorderColor(CardBorder)
             .PaddingVertical(5).PaddingHorizontal(6)
             .DefaultTextStyle(t => t.FontSize(9).FontColor(TextDark));

        // ══════════════════════════════════════════════════════════════════
        //  Format helpers
        // ══════════════════════════════════════════════════════════════════
        private static string AppealRef(Appeal a) => $"APL-{a.AppealID}";

        private static string FormatSize(long bytes)
        {
            if (bytes <= 0)                 return "—";
            if (bytes < 1024)               return $"{bytes} B";
            if (bytes < 1024 * 1024)        return $"{bytes / 1024.0:F1} KB";
            return $"{bytes / 1024.0 / 1024.0:F2} MB";
        }

        private static string FriendlyTypeFor(string ext, string contentType)
        {
            switch (ext)
            {
                case ".pdf":  return "PDF";
                case ".png":
                case ".jpg":
                case ".jpeg":
                case ".gif":
                case ".bmp":
                case ".webp": return "Image";
                case ".doc":
                case ".docx": return "Word";
                case ".xls":
                case ".xlsx": return "Excel";
                case ".txt":  return "Text";
                default:
                    if (contentType.StartsWith("image/")) return "Image";
                    if (contentType.Contains("pdf"))      return "PDF";
                    return "File";
            }
        }

        private record FileEntry(string Name, string Extension, long Size, string ContentType);
    }
}
