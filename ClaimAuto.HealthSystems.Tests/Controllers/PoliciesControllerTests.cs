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
    public class PoliciesControllerTests
    {
        private Mock<IPolicyRepository> _mockRepo;
        private PoliciesController      _controller;

        [SetUp]
        public void SetUp()
        {
            _mockRepo   = new Mock<IPolicyRepository>();
            _controller = new PoliciesController(_mockRepo.Object);

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
        public async Task GetPolicyById_WhenPolicyExists_Returns200()
        {
            // ── ARRANGE ──────────────────────────────────────────────────────
            var fakePolicy = new PolicyResponseDto
            {
                PolicyID = 1,
                PlanCode = "GOLD-001",
                PlanName = "Gold Plan",
                Status   = "Active"
            };
            _mockRepo
                .Setup(r => r.GetPolicyByIdAsync(1, It.IsAny<int?>()))
                .ReturnsAsync(fakePolicy);

            // ── ACT ───────────────────────────────────────────────────────────
            var result = await _controller.GetPolicyById(1);

            // ── ASSERT ────────────────────────────────────────────────────────
            var ok = result as OkObjectResult;
            Assert.That(ok,             Is.Not.Null);
            Assert.That(ok!.StatusCode, Is.EqualTo(200));
            _mockRepo.Verify(r => r.GetPolicyByIdAsync(1, It.IsAny<int?>()), Times.Once);
        }

        // ── TEST 2 ────────────────────────────────────────────────────────────
        [Test]
        public async Task GetPolicyById_WhenPolicyNotFound_Returns404()
        {
            // ── ARRANGE ──────────────────────────────────────────────────────
            _mockRepo
                .Setup(r => r.GetPolicyByIdAsync(99, It.IsAny<int?>()))
                .ReturnsAsync((PolicyResponseDto?)null);

            // ── ACT ───────────────────────────────────────────────────────────
            var result = await _controller.GetPolicyById(99);

            // ── ASSERT ────────────────────────────────────────────────────────
            var notFound = result as NotFoundObjectResult;
            Assert.That(notFound,             Is.Not.Null);
            Assert.That(notFound!.StatusCode, Is.EqualTo(404));
            _mockRepo.Verify(r => r.GetPolicyByIdAsync(99, It.IsAny<int?>()), Times.Once);
        }

        // ── TEST 3 ────────────────────────────────────────────────────────────
        [Test]
        public async Task CreatePolicy_WhenPlanCodeExists_Returns409Conflict()
        {
            // ── ARRANGE ──────────────────────────────────────────────────────
            var dto = new CreatePolicyDto { PlanCode = "GOLD-001", PlanName = "Gold Plan" };
            _mockRepo
                .Setup(r => r.PlanCodeExistsAsync("GOLD-001"))
                .ReturnsAsync(true);

            // ── ACT ───────────────────────────────────────────────────────────
            var result = await _controller.CreatePolicy(dto);

            // ── ASSERT ────────────────────────────────────────────────────────
            var conflict = result as ConflictObjectResult;
            Assert.That(conflict,             Is.Not.Null);
            Assert.That(conflict!.StatusCode, Is.EqualTo(409));
            _mockRepo.Verify(r => r.PlanCodeExistsAsync("GOLD-001"), Times.Once);
        }

        // ── TEST 4 ────────────────────────────────────────────────────────────
        [Test]
        public async Task CreatePolicy_WhenPlanCodeIsNew_Returns201Created()
        {
            // ── ARRANGE ──────────────────────────────────────────────────────
            var dto = new CreatePolicyDto { PlanCode = "SILVER-001", PlanName = "Silver Plan" };
            var created = new PolicyResponseDto { PolicyID = 5, PlanCode = "SILVER-001", PlanName = "Silver Plan" };

            _mockRepo
                .Setup(r => r.PlanCodeExistsAsync("SILVER-001"))
                .ReturnsAsync(false);
            _mockRepo
                .Setup(r => r.CreatePolicyAsync(dto, It.IsAny<int>(), It.IsAny<int?>()))
                .ReturnsAsync(created);

            // ── ACT ───────────────────────────────────────────────────────────
            var result = await _controller.CreatePolicy(dto);

            // ── ASSERT ────────────────────────────────────────────────────────
            var createdResult = result as CreatedAtActionResult;
            Assert.That(createdResult,             Is.Not.Null);
            Assert.That(createdResult!.StatusCode, Is.EqualTo(201));
            _mockRepo.Verify(r => r.CreatePolicyAsync(dto, It.IsAny<int>(), It.IsAny<int?>()), Times.Once);
        }
    }
}
