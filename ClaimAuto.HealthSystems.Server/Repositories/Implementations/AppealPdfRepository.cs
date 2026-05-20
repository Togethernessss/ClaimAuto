using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;
using ClaimAuto.HealthSystems.Server.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace ClaimAuto.HealthSystems.Server.Repositories.Implementations
{
    public class AppealPdfRepository : IAppealPdfRepository
    {
        public byte[] CompileDocumentsPdf(Appeal appeal, string filedByName, List<IFormFile> files)
        {
            QuestPDF.Settings.License = LicenseType.Community;

            var imageExtensions = new[] { ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp" };
            var pdfExtensions = new[] { ".pdf" };

            return Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(40);

                    // ── Cover Page ──
                    page.Header().Column(col =>
                    {
                        col.Item().Text($"Appeal Documents — APL-{appeal.AppealID}")
                            .FontSize(20).Bold().FontColor(Colors.Indigo.Medium);

                        col.Item().PaddingTop(8).Text(txt =>
                        {
                            txt.Span("Claim ID: ").Bold();
                            txt.Span($"CLM-{appeal.ClaimID}");
                        });
                        col.Item().Text(txt =>
                        {
                            txt.Span("Filed By: ").Bold();
                            txt.Span(filedByName);
                        });
                        col.Item().Text(txt =>
                        {
                            txt.Span("Filed At: ").Bold();
                            txt.Span(appeal.FiledAt.ToString("dd-MMM-yyyy HH:mm"));
                        });
                        col.Item().Text(txt =>
                        {
                            txt.Span("Reason: ").Bold();
                            txt.Span(appeal.Reason);
                        });

                        col.Item().PaddingTop(12)
                            .LineHorizontal(1).LineColor(Colors.Grey.Lighten2);

                        col.Item().PaddingTop(8).Text($"Attached Files: {files.Count}")
                            .FontSize(12).Italic();

                        // List non-image files on cover page
                        var nonImageFiles = files.Where(f =>
                        {
                            var ext = Path.GetExtension(f.FileName).ToLowerInvariant();
                            return !imageExtensions.Contains(ext);
                        }).ToList();

                        if (nonImageFiles.Any())
                        {
                            col.Item().PaddingTop(8).Text("Non-image files (attached separately):")
                                .FontSize(10).Italic().FontColor(Colors.Grey.Medium);

                            foreach (var nf in nonImageFiles)
                            {
                                col.Item().Text($"  • {nf.FileName} ({nf.Length / 1024.0:F1} KB)")
                                    .FontSize(9);
                            }
                        }
                    });

                    // ── Embed each image ──
                    page.Content().PaddingTop(20).Column(col =>
                    {
                        foreach (var file in files)
                        {
                            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
                            if (!imageExtensions.Contains(ext))
                                continue;

                            using var ms = new MemoryStream();
                            file.CopyTo(ms);
                            var bytes = ms.ToArray();

                            col.Item().PaddingBottom(8).Text(file.FileName)
                                .FontSize(10).Bold().FontColor(Colors.Grey.Darken1);

                            col.Item().PaddingBottom(16)
                                .Image(bytes)
                                .FitWidth();
                        }
                    });

                    page.Footer().AlignCenter()
                        .Text(txt =>
                        {
                            txt.Span("Page ");
                            txt.CurrentPageNumber();
                            txt.Span(" of ");
                            txt.TotalPages();
                        });
                });
            }).GeneratePdf();
        }
    }
}