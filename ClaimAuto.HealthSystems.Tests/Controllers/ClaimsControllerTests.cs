using System.Security.Claims;
using ClaimAuto.HealthSystems.Server.Controllers;
using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace ClaimAuto.HealthSystems.Tests.Controllers
{
    [TestFixture]
    public class ClaimsControllerTests
    {
        private Mock<IClaimRepository>        _mockClaimRepo;
        private Mock<IAdjudicationRepository> _mockAdjRepo;
        private Mock<IFraudRepository>        _mockFraudRepo;
        private ClaimsController              _controller;

        [SetUp]
        public void SetUp()
        {
            _mockClaimRepo = new Mock<IClaimRepository>();
            _mockAdjRepo   = new Mock<IAdjudicationRepository>();
            _mockFraudRepo = new Mock<IFraudRepository>();

            _controller = new ClaimsController(
                _mockClaimRepo.Object,
                _mockAdjRepo.Object,
                _mockFraudRepo.Object);

            // Fake JWT — Admin, UserID = 1, OrgID = 1
            _controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                    {
                        new Claim(ClaimTypes.NameIdentifier, "1"),
                        new Claim(ClaimTypes.Role,           "Admin"),
                        new Claim("org_id",                  "1"),
                    }, "TestAuth"))
                }
            };
        }

        // ── TEST 1 ────────────────────────────────────────────────────────────
        [Test]
        public async Task GetClaimById_WhenClaimExists_Returns200()
        {
            // ── ARRANGE ──────────────────────────────────────────────────────
            var fakeClaim = new ClaimDetailResponseDto
            {
                ClaimID    = 1,
                MemberName = "Arjun Sharma",
                Status     = "Submitted"
            };
            _mockClaimRepo
                .Setup(r => r.GetClaimByIdAsync(1, It.IsAny<int?>()))
                .ReturnsAsync(fakeClaim);

            // ── ACT ───────────────────────────────────────────────────────────
            var result = await _controller.GetClaimById(1);

            // ── ASSERT ────────────────────────────────────────────────────────
            var ok = result as OkObjectResult;
            Assert.That(ok,             Is.Not.Null);
            Assert.That(ok!.StatusCode, Is.EqualTo(200));
            _mockClaimRepo.Verify(r => r.GetClaimByIdAsync(1, It.IsAny<int?>()), Times.Once);
        }

        // ── TEST 2 ────────────────────────────────────────────────────────────
        [Test]
        public async Task GetClaimById_WhenClaimNotFound_Returns404()
        {
            // ── ARRANGE ──────────────────────────────────────────────────────
            _mockClaimRepo
                .Setup(r => r.GetClaimByIdAsync(99, It.IsAny<int?>()))
                .ReturnsAsync((ClaimDetailResponseDto?)null);

            // ── ACT ───────────────────────────────────────────────────────────
            var result = await _controller.GetClaimById(99);

            // ── ASSERT ────────────────────────────────────────────────────────
            var notFound = result as NotFoundObjectResult;
            Assert.That(notFound,             Is.Not.Null);
            Assert.That(notFound!.StatusCode, Is.EqualTo(404));
            _mockClaimRepo.Verify(r => r.GetClaimByIdAsync(99, It.IsAny<int?>()), Times.Once);
        }

        // ── TEST 3 ────────────────────────────────────────────────────────────
        [Test]
        public async Task GetAllClaims_WhenCalled_Returns200WithList()
        {
            // ── ARRANGE ──────────────────────────────────────────────────────
            var fakeClaims = new List<ClaimResponseDto>
            {
                new() { ClaimID = 1, Status = "Submitted" },
                new() { ClaimID = 2, Status = "Approved"  }
            };
            _mockClaimRepo
                .Setup(r => r.GetAllClaimsAsync(
                    It.IsAny<string?>(), It.IsAny<string?>(),
                    It.IsAny<int?>(),    It.IsAny<string?>(),
                    It.IsAny<int?>(),    It.IsAny<int?>(),
                    It.IsAny<int?>()))
                .ReturnsAsync(fakeClaims);

            // ── ACT ───────────────────────────────────────────────────────────
            var result = await _controller.GetAllClaims(null, null);

            // ── ASSERT ────────────────────────────────────────────────────────
            var ok = result as OkObjectResult;
            Assert.That(ok,             Is.Not.Null);
            Assert.That(ok!.StatusCode, Is.EqualTo(200));
        }
    }
}
