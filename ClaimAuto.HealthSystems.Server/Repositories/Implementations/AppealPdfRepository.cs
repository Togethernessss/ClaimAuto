using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Services.Interfaces;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace ClaimAuto.HealthSystems.Server.Repositories.Implementations
{
    public class AppealPdfRepository : IAppealPdfRepository
    {
        public byte[] CompileDocumentsPdf(
            Appeal appeal,
            string filedByName,
            List<IFormFile> files)
        {
            QuestPDF.Settings.License = LicenseType.Community;

            var imageExtensions = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                ".png", ".jpg", ".jpeg"
            };

            // Read files — separate images from non-images
            var imagePages = new List<(string Name, byte[] Data)>();
            var otherFiles = new List<string>();

            foreach (var file in files)
            {
                var ext = Path.GetExtension(file.FileName).ToLowerInvariant();

                if (imageExtensions.Contains(ext))
                {
                    using var ms = new MemoryStream();
                    file.CopyTo(ms);
                    imagePages.Add((file.FileName, ms.ToArray()));
                }
                else
                {
                    // PDF, DOC, etc. — list on cover page, not embedded
                    otherFiles.Add(file.FileName);
                }
            }

            var purple = "#667eea";
            var darkText = "#1e2a3a";
            var grayText = "#9e9e9e";
            var lightGray = "#e0e0e0";

            return Document.Create(container =>
            {
                // ── PAGE 1: Cover Page ──────────────────────────
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(40);
                    page.DefaultTextStyle(x =>
                        x.FontSize(11).FontFamily("Helvetica").FontColor(darkText));

                    page.Content().Column(col =>
                    {
                        // Header
                        col.Item().Row(row =>
                        {
                            row.RelativeItem().Row(r =>
                            {
                                r.ConstantItem(32).Height(32)
                                    .Background(purple)
                                    .AlignCenter().AlignMiddle()
                                    .Text("C").FontSize(16).Bold().FontColor("#ffffff");
                                r.ConstantItem(8);
                                r.RelativeItem().Column(inner =>
                                {
                                    inner.Item().Text("ClaimAuto")
                                        .FontSize(16).Bold().FontColor(purple);
                                    inner.Item().Text("Health Insurance")
                                        .FontSize(9).FontColor(grayText);
                                });
                            });

                            row.ConstantItem(130).Column(c =>
                            {
                                c.Item().AlignRight()
                                    .Text("Appeal No.").FontSize(9).FontColor(grayText);
                                c.Item().AlignRight()
                                    .Text($"#APL-{appeal.AppealID}")
                                    .FontSize(15).Bold().FontColor(darkText);
                                c.Item().AlignRight()
                                    .Text(appeal.FiledAt.ToString("dd MMM yyyy"))
                                    .FontSize(9).FontColor(grayText);
                            });
                        });

                        col.Item().Height(10);
                        col.Item().Height(2).Background(purple);
                        col.Item().Height(2);
                        col.Item().Height(0.5f).Background(lightGray);
                        col.Item().Height(20);

                        col.Item().AlignCenter()
                            .Text("Appeal — Supporting Documents")
                            .FontSize(18).Bold().FontColor(darkText);
                        col.Item().Height(24);

                        // Detail helper
                        void DetailRow(string label, string value)
                        {
                            col.Item().Row(r =>
                            {
                                r.RelativeItem()
                                    .Text(label).FontSize(10).FontColor(grayText);
                                r.RelativeItem().AlignRight()
                                    .Text(value).FontSize(10).Bold().FontColor(darkText);
                            });
                            col.Item().Height(5);
                        }

                        col.Item()
                            .BorderBottom(1).BorderColor(lightGray)
                            .PaddingBottom(5)
                            .Text("Appeal Information")
                            .FontSize(10).Bold().FontColor(purple);
                        col.Item().Height(8);

                        DetailRow("Appeal ID", $"#APL-{appeal.AppealID}");
                        DetailRow("Claim ID", $"CLM-{appeal.ClaimID}");
                        DetailRow("Filed By", filedByName);
                        DetailRow("Filed At", appeal.FiledAt.ToString("dd MMM yyyy, HH:mm"));
                        DetailRow("Status", appeal.Status.ToString());

                        col.Item().Height(14);

                        // Reason
                        col.Item()
                            .BorderBottom(1).BorderColor(lightGray)
                            .PaddingBottom(5)
                            .Text("Reason for Appeal")
                            .FontSize(10).Bold().FontColor(purple);
                        col.Item().Height(6);
                        col.Item()
                            .BorderLeft(3).BorderColor(purple)
                            .Background("#fafafa")
                            .Padding(8)
                            .Text(appeal.Reason)
                            .FontSize(10).Italic().FontColor("#555555");

                        col.Item().Height(18);

                        // File listing
                        int totalFiles = imagePages.Count + otherFiles.Count;
                        col.Item()
                            .BorderBottom(1).BorderColor(lightGray)
                            .PaddingBottom(5)
                            .Text($"Attached Documents ({totalFiles})")
                            .FontSize(10).Bold().FontColor(purple);
                        col.Item().Height(6);

                        int idx = 1;
                        foreach (var img in imagePages)
                        {
                            int num = idx++;
                            col.Item().PaddingVertical(2).Row(r =>
                            {
                                r.ConstantItem(20)
                                    .Text($"{num}.").FontSize(9).FontColor(purple);
                                r.RelativeItem()
                                    .Text(img.Name).FontSize(9).FontColor(darkText);
                                r.ConstantItem(100).AlignRight()
                                    .Text("Image — see next pages")
                                    .FontSize(8).FontColor(grayText);
                            });
                        }
                        foreach (var name in otherFiles)
                        {
                            int num = idx++;
                            col.Item().PaddingVertical(2).Row(r =>
                            {
                                r.ConstantItem(20)
                                    .Text($"{num}.").FontSize(9).FontColor(purple);
                                r.RelativeItem()
                                    .Text(name).FontSize(9).FontColor(darkText);
                                r.ConstantItem(100).AlignRight()
                                    .Text("File attached separately")
                                    .FontSize(8).FontColor(grayText);
                            });
                        }

                        col.Item().Height(20);

                        // Footer
                        col.Item().Height(0.5f).Background(lightGray);
                        col.Item().Height(2);
                        col.Item().Height(2).Background(purple);
                        col.Item().Height(10);
                        col.Item()
                            .Text($"System-generated document · DOC-APL-{appeal.AppealID}-{appeal.FiledAt:yyyyMMdd}")
                            .FontSize(9).Italic().FontColor("#bbbbbb");
                    });
                });

                // ── ONE PAGE PER IMAGE ──────────────────────────
                foreach (var entry in imagePages)
                {
                    container.Page(imgPage =>
                    {
                        imgPage.Size(PageSizes.A4);
                        imgPage.Margin(30);
                        imgPage.DefaultTextStyle(x =>
                            x.FontSize(11).FontFamily("Helvetica").FontColor(darkText));

                        imgPage.Header().Column(hdr =>
                        {
                            hdr.Item().Row(r =>
                            {
                                r.RelativeItem()
                                    .Text($"Appeal #APL-{appeal.AppealID}")
                                    .FontSize(9).Bold().FontColor(purple);
                                r.RelativeItem().AlignRight()
                                    .Text(entry.Name)
                                    .FontSize(9).FontColor(grayText);
                            });
                            hdr.Item().Height(4);
                            hdr.Item().Height(1).Background(lightGray);
                            hdr.Item().Height(8);
                        });

                        imgPage.Content()
                            .AlignCenter()
                            .AlignMiddle()
                            .Image(entry.Data)
                            .FitArea();

                        imgPage.Footer().AlignCenter()
                            .Text(text =>
                            {
                                text.Span("Page ").FontSize(8).FontColor(grayText);
                                text.CurrentPageNumber().FontSize(8).FontColor(grayText);
                                text.Span(" of ").FontSize(8).FontColor(grayText);
                                text.TotalPages().FontSize(8).FontColor(grayText);
                            });
                    });
                }
            }).GeneratePdf();
        }
    }
}