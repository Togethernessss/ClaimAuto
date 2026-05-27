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
    /// Compiles all files uploaded with an appeal into a single professionally formatted PDF.
    ///   • Image files (PNG/JPG/etc.)  → embedded as full pages
    ///   • Non-image files (PDF/DOC/…) → listed on the cover with file metadata
    /// </summary>
    public class AppealPdfRepository : IAppealPdfRepository
    {
        // ── Theme colors (match the web app's purple gradient) ──
        private const string PrimaryColor = "#667eea";
        private const string LightBg = "#f8f9ff";
        private const string SoftBorder = "#e9ecef";
        private const string MutedText = "#6c757d";
        private const string DarkText = "#212529";
        private const string HeaderRowBg = "#f0f0f7";
        private const string SuccessGreen = "#27ae60";
        private const string WarnBg = "#fff8e6";
        private const string WarnBorder = "#ffd966";
        private const string WarnText = "#92400e";

        private static readonly string[] ImageExtensions =
            { ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp" };


        public byte[] CompileDocumentsPdf(
            Appeal appeal,
            string filedByName,
            List<IFormFile> files)
        {
            QuestPDF.Settings.License = LicenseType.Community;

            var imageFiles = files.Where(IsImage).ToList();
            var nonImageFiles = files.Where(f => !IsImage(f)).ToList();

            return Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(40);
                    page.PageColor(Colors.White);
                    page.DefaultTextStyle(x => x.FontSize(10).FontColor(DarkText));

                    // ════════════════════════════════════════════════════
                    //  HEADER
                    // ════════════════════════════════════════════════════
                    page.Header().PaddingBottom(15).BorderBottom(2).BorderColor(PrimaryColor)
                        .Row(row =>
                        {
                            row.RelativeItem().Column(col =>
                            {
                                col.Item().Text("CLAIMAUTO HEALTH SYSTEMS")
                                    .FontSize(9).FontColor(PrimaryColor).Bold().LetterSpacing(2);

                                col.Item().PaddingTop(2).Text("Appeal Document Package")
                                    .FontSize(20).Bold().FontColor(DarkText);

                                col.Item().PaddingTop(2).Text($"APL-{appeal.AppealID}  •  Claim CLM-{appeal.ClaimID}")
                                    .FontSize(11).FontColor(MutedText);
                            });

                            row.ConstantItem(110).AlignRight().Column(col =>
                            {
                                col.Item().Border(1).BorderColor(PrimaryColor).Background(LightBg).Padding(6)
                                    .Column(badge =>
                                    {
                                        badge.Item().AlignCenter().Text("CONFIDENTIAL")
                                            .FontSize(8).Bold().FontColor(PrimaryColor).LetterSpacing(1);
                                        badge.Item().AlignCenter().Text("FOR INTERNAL USE")
                                            .FontSize(7).FontColor(MutedText);
                                    });

                                col.Item().PaddingTop(4).AlignRight()
                                    .Text(DateTime.UtcNow.ToString("dd MMM yyyy"))
                                    .FontSize(8).FontColor(MutedText);
                            });
                        });


                    // ════════════════════════════════════════════════════
                    //  CONTENT
                    // ════════════════════════════════════════════════════
                    page.Content().PaddingTop(20).Column(col =>
                    {
                        // ─── Section 1: Appeal Details ──────────────────
                        col.Item().BorderBottom(1).BorderColor(PrimaryColor).PaddingBottom(4)
                            .Text("1.  APPEAL DETAILS")
                            .FontSize(11).Bold().FontColor(PrimaryColor).LetterSpacing(0.5f);

                        col.Item().PaddingTop(8).Border(1).BorderColor(SoftBorder).Table(table =>
                        {
                            table.ColumnsDefinition(cols =>
                            {
                                cols.ConstantColumn(140);
                                cols.RelativeColumn();
                            });

                            // Row: Appeal ID
                            table.Cell().Background(LightBg).BorderBottom(1).BorderColor(SoftBorder).Padding(8)
                                .Text("Appeal ID").FontSize(9).Bold().FontColor(MutedText);
                            table.Cell().BorderBottom(1).BorderColor(SoftBorder).Padding(8)
                                .Text($"APL-{appeal.AppealID}").FontSize(10).FontColor(DarkText);

                            // Row: Claim ID
                            table.Cell().Background(LightBg).BorderBottom(1).BorderColor(SoftBorder).Padding(8)
                                .Text("Claim ID").FontSize(9).Bold().FontColor(MutedText);
                            table.Cell().BorderBottom(1).BorderColor(SoftBorder).Padding(8)
                                .Text($"CLM-{appeal.ClaimID}").FontSize(10).FontColor(DarkText);

                            // Row: Filed By
                            table.Cell().Background(LightBg).BorderBottom(1).BorderColor(SoftBorder).Padding(8)
                                .Text("Filed By").FontSize(9).Bold().FontColor(MutedText);
                            table.Cell().BorderBottom(1).BorderColor(SoftBorder).Padding(8)
                                .Text(filedByName ?? "—").FontSize(10).FontColor(DarkText);

                            // Row: Filed At
                            table.Cell().Background(LightBg).BorderBottom(1).BorderColor(SoftBorder).Padding(8)
                                .Text("Filed At").FontSize(9).Bold().FontColor(MutedText);
                            table.Cell().BorderBottom(1).BorderColor(SoftBorder).Padding(8)
                                .Text(appeal.FiledAt.ToString("dd MMM yyyy, HH:mm 'UTC'"))
                                .FontSize(10).FontColor(DarkText);

                            // Row: Status
                            table.Cell().Background(LightBg).BorderBottom(1).BorderColor(SoftBorder).Padding(8)
                                .Text("Status").FontSize(9).Bold().FontColor(MutedText);
                            table.Cell().BorderBottom(1).BorderColor(SoftBorder).Padding(8)
                                .Text(appeal.Status.ToString()).FontSize(10).FontColor(DarkText);

                            // Conditional rows for Decided appeals
                            if (appeal.Status == AppealStatus.Decided)
                            {
                                table.Cell().Background(LightBg).BorderBottom(1).BorderColor(SoftBorder).Padding(8)
                                    .Text("Decided At").FontSize(9).Bold().FontColor(MutedText);
                                table.Cell().BorderBottom(1).BorderColor(SoftBorder).Padding(8)
                                    .Text(appeal.DecisionAt?.ToString("dd MMM yyyy, HH:mm 'UTC'") ?? "—")
                                    .FontSize(10).FontColor(DarkText);

                                table.Cell().Background(LightBg).Padding(8)
                                    .Text("Outcome").FontSize(9).Bold().FontColor(MutedText);
                                table.Cell().Padding(8)
                                    .Text(appeal.Outcome?.ToString() ?? "—").FontSize(10).FontColor(DarkText);
                            }
                        });


                        // ─── Section 2: Reason ──────────────────────────
                        col.Item().PaddingTop(20).BorderBottom(1).BorderColor(PrimaryColor).PaddingBottom(4)
                            .Text("2.  REASON FOR APPEAL")
                            .FontSize(11).Bold().FontColor(PrimaryColor).LetterSpacing(0.5f);

                        col.Item().PaddingTop(8).Background(LightBg).Border(1).BorderColor(SoftBorder).Padding(12)
                            .Text(string.IsNullOrWhiteSpace(appeal.Reason) ? "—" : appeal.Reason)
                            .FontSize(10).LineHeight(1.4f);


                        // ─── Section 3: Documents Table ─────────────────
                        col.Item().PaddingTop(20).BorderBottom(1).BorderColor(PrimaryColor).PaddingBottom(4)
                            .Text($"3.  ATTACHED DOCUMENTS  ({files.Count} {(files.Count == 1 ? "file" : "files")})")
                            .FontSize(11).Bold().FontColor(PrimaryColor).LetterSpacing(0.5f);

                        if (files.Count == 0)
                        {
                            col.Item().PaddingTop(8).Background(LightBg).Border(1).BorderColor(SoftBorder).Padding(12)
                                .AlignCenter().Text("No documents were attached to this appeal.")
                                .Italic().FontColor(MutedText);
                        }
                        else
                        {
                            col.Item().PaddingTop(8).Border(1).BorderColor(SoftBorder).Table(table =>
                            {
                                table.ColumnsDefinition(cols =>
                                {
                                    cols.ConstantColumn(30);
                                    cols.RelativeColumn(3);
                                    cols.ConstantColumn(60);
                                    cols.ConstantColumn(70);
                                    cols.ConstantColumn(80);
                                });

                                // Header row
                                table.Header(header =>
                                {
                                    header.Cell().Background(HeaderRowBg).BorderBottom(1).BorderColor(SoftBorder)
                                        .Padding(6).Text("#").FontSize(9).Bold().FontColor(DarkText);
                                    header.Cell().Background(HeaderRowBg).BorderBottom(1).BorderColor(SoftBorder)
                                        .Padding(6).Text("File Name").FontSize(9).Bold().FontColor(DarkText);
                                    header.Cell().Background(HeaderRowBg).BorderBottom(1).BorderColor(SoftBorder)
                                        .Padding(6).Text("Type").FontSize(9).Bold().FontColor(DarkText);
                                    header.Cell().Background(HeaderRowBg).BorderBottom(1).BorderColor(SoftBorder)
                                        .Padding(6).Text("Size").FontSize(9).Bold().FontColor(DarkText);
                                    header.Cell().Background(HeaderRowBg).BorderBottom(1).BorderColor(SoftBorder)
                                        .Padding(6).Text("Embedded").FontSize(9).Bold().FontColor(DarkText);
                                });

                                // Body rows
                                int index = 1;
                                foreach (var file in files)
                                {
                                    var ext = Path.GetExtension(file.FileName).ToLowerInvariant().TrimStart('.').ToUpper();
                                    var size = FormatBytes(file.Length);
                                    var isImg = IsImage(file);

                                    table.Cell().BorderBottom(1).BorderColor(SoftBorder).Padding(6)
                                        .Text(index.ToString()).FontSize(9);

                                    table.Cell().BorderBottom(1).BorderColor(SoftBorder).Padding(6)
                                        .Text(file.FileName).FontSize(9).Bold();

                                    table.Cell().BorderBottom(1).BorderColor(SoftBorder).Padding(6)
                                        .Text(string.IsNullOrEmpty(ext) ? "—" : ext).FontSize(9);

                                    table.Cell().BorderBottom(1).BorderColor(SoftBorder).Padding(6)
                                        .Text(size).FontSize(9);

                                    table.Cell().BorderBottom(1).BorderColor(SoftBorder).Padding(6)
                                        .Text(isImg ? "Yes" : "No").FontSize(9)
                                        .FontColor(isImg ? SuccessGreen : MutedText);

                                    index++;
                                }
                            });
                        }


                        // ─── Warning for non-image files ────────────────
                        if (nonImageFiles.Count > 0)
                        {
                            col.Item().PaddingTop(10).Background(WarnBg).Border(1).BorderColor(WarnBorder).Padding(10)
                                .Row(row =>
                                {
                                    row.ConstantItem(20).Text("i").FontSize(14).Bold().FontColor("#d97706");
                                    row.RelativeItem().Text(txt =>
                                    {
                                        txt.Span("Note: ").Bold().FontColor(WarnText);
                                        txt.Span(
                                            $"{nonImageFiles.Count} non-image " +
                                            $"{(nonImageFiles.Count == 1 ? "file is" : "files are")} stored as " +
                                            "original uploads but cannot be embedded into this PDF directly. " +
                                            "Use the View / Download buttons in the Appeals interface to access them.")
                                            .FontColor(WarnText).FontSize(9);
                                    });
                                });
                        }


                        // ─── Section 4: Embedded Images ─────────────────
                        if (imageFiles.Count > 0)
                        {
                            col.Item().PaddingTop(25).BorderBottom(1).BorderColor(PrimaryColor).PaddingBottom(4)
                                .Text($"4.  EMBEDDED IMAGES  ({imageFiles.Count})")
                                .FontSize(11).Bold().FontColor(PrimaryColor).LetterSpacing(0.5f);

                            int imgNum = 1;
                            foreach (var file in imageFiles)
                            {
                                try
                                {
                                    using var ms = new MemoryStream();
                                    file.CopyTo(ms);
                                    var bytes = ms.ToArray();

                                    col.Item().PaddingTop(15).Column(imgBlock =>
                                    {
                                        // Image caption header
                                        imgBlock.Item().Background(LightBg).Padding(6).Row(captionRow =>
                                        {
                                            captionRow.RelativeItem().Text(txt =>
                                            {
                                                txt.Span($"Image {imgNum} of {imageFiles.Count}  •  ")
                                                    .FontSize(8).FontColor(MutedText);
                                                txt.Span(file.FileName).FontSize(9).Bold().FontColor(DarkText);
                                            });
                                            captionRow.ConstantItem(80).AlignRight()
                                                .Text(FormatBytes(file.Length)).FontSize(8).FontColor(MutedText);
                                        });

                                        // The image itself
                                        imgBlock.Item().Border(1).BorderColor(SoftBorder).Padding(4)
                                            .AlignCenter().Image(bytes).FitWidth();
                                    });

                                    imgNum++;
                                }
                                catch
                                {
                                    col.Item().PaddingTop(10).Background("#fff0f0").Border(1).BorderColor("#fca5a5").Padding(8)
                                        .Text($"Could not embed image: {file.FileName}")
                                        .FontColor("#991b1b").FontSize(9);
                                }
                            }
                        }
                    });


                    // ════════════════════════════════════════════════════
                    //  FOOTER
                    // ════════════════════════════════════════════════════
                    page.Footer().PaddingTop(10).BorderTop(1).BorderColor(SoftBorder).PaddingTop(8)
                        .Row(row =>
                        {
                            row.RelativeItem().AlignLeft()
                                .Text("ClaimAuto Health Systems  •  Confidential")
                                .FontSize(8).FontColor(MutedText);

                            row.ConstantItem(120).AlignCenter().Text(txt =>
                            {
                                txt.Span("Page ").FontSize(8).FontColor(MutedText);
                                txt.CurrentPageNumber().FontSize(8).FontColor(MutedText).Bold();
                                txt.Span(" of ").FontSize(8).FontColor(MutedText);
                                txt.TotalPages().FontSize(8).FontColor(MutedText).Bold();
                            });

                            row.RelativeItem().AlignRight()
                                .Text($"Generated {DateTime.UtcNow:dd MMM yyyy HH:mm} UTC")
                                .FontSize(8).FontColor(MutedText);
                        });
                });
            }).GeneratePdf();
        }


        // ═══════════════════════════════════════════════════════════════
        //  Utility methods
        // ═══════════════════════════════════════════════════════════════
        private static bool IsImage(IFormFile file)
        {
            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            return ImageExtensions.Contains(ext);
        }

        private static string FormatBytes(long bytes)
        {
            if (bytes < 1024) return $"{bytes} B";
            if (bytes < 1024 * 1024) return $"{bytes / 1024.0:F1} KB";
            if (bytes < 1024L * 1024 * 1024) return $"{bytes / (1024.0 * 1024.0):F1} MB";
            return $"{bytes / (1024.0 * 1024.0 * 1024.0):F2} GB";
        }
    }
}