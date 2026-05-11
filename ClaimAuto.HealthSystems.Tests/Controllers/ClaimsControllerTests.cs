using Moq;
using NUnit.Framework;
using Microsoft.AspNetCore.Mvc;
using ClaimAuto.HealthSystems.Server.Controllers;
using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;
using ClaimAuto.HealthSystems.Server.DTOs;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;

namespace ClaimAuto.HealthSystems.Tests.Controllers
{
    [TestFixture]  // this class has tests
    public class ClaimsControllerTests
    {

        private Mock<IClaimRepository> _mockClaimRepo;
        private ClaimsController _controller;

        // Setup runs BEFORE every test 
        [SetUp]
        public void Setup()
        {
            // mock dependency
            _mockClaimRepo = new Mock<IClaimRepository>();

            // controller with mock injected
            _controller = new ClaimsController(_mockClaimRepo.Object);

            // logged-in user (JWT token)
            var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.NameIdentifier, "3"),
                new Claim(ClaimTypes.Role, "InsuranceStaff")
            }, "TestAuth"));

            _controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = user }
            };
        }

        // TEST 1 — GetClaimById returns 200 OK when claim exists
        [Test]
        public async Task GetClaimById_WhenClaimExists_Returns200OK()
        {
            // ARRANGE 
            var fakeClaim = new ClaimDetailResponseDto
            {
                ClaimID = 1,
                MemberName = "Arjun Sharma",
                Status = "Submitted",
                TotalBilledAmount = 25000
            };

            _mockClaimRepo
                .Setup(r => r.GetClaimByIdAsync(1))
                .ReturnsAsync(fakeClaim);

            // ACT 
            var result = await _controller.GetClaimById(10);

            // ASSERT 
            var okResult = result as OkObjectResult;
            Assert.That(okResult, Is.Not.Null);              // is it 200?
            Assert.That(okResult!.StatusCode, Is.EqualTo(200));

            // Check the data is correct
            var returnedClaim = okResult.Value as ClaimDetailResponseDto;
            Assert.That(returnedClaim!.ClaimID, Is.EqualTo(1));
            Assert.That(returnedClaim.MemberName, Is.EqualTo("Arjun Sharma"));
        }

        // TEST 2 — GetClaimById returns 404 when claim doesn't exist
        [Test]
        public async Task GetClaimById_WhenClaimNotFound_Returns404()
        {
            // ARRANGE
            _mockClaimRepo
                .Setup(r => r.GetClaimByIdAsync(999))
                .ReturnsAsync((ClaimDetailResponseDto?)null);

            // ACT
            var result = await _controller.GetClaimById(999);

            // ASSERT
            var notFoundResult = result as NotFoundObjectResult;
            Assert.That(notFoundResult, Is.Not.Null);
            Assert.That(notFoundResult!.StatusCode, Is.EqualTo(404));
        }

        // TEST 3 — GetClaimById calls the repository exactly once
        [Test]
        public async Task GetClaimById_Always_CallsRepositoryOnce()
        {
            // ARRANGE
            _mockClaimRepo
                .Setup(r => r.GetClaimByIdAsync(It.IsAny<int>()))
                .ReturnsAsync((ClaimDetailResponseDto?)null);

            // ACT
            await _controller.GetClaimById(5);

            // ASSERT
            _mockClaimRepo.Verify(
                r => r.GetClaimByIdAsync(5),
                Times.Once
            );
        }

        // TEST 4 — SubmitClaim returns 201 Created on success
        [Test]
        public async Task SubmitClaim_WithValidData_Returns201Created()
        {
            // ARRANGE
            var dto = new CreateClaimDto
            {
                ProviderID = 2,
                MemberID = 1,
                PolicyID = 1,
                ClaimType = "Inpatient",
                TotalBilledAmount = 25000,
                Currency = "INR",
                SourceChannel = "Portal"
            };

            var fakeCreatedClaim = new ClaimResponseDto
            {
                ClaimID = 10,
                ProviderName = "Sunrise Hospital",
                MemberName = "Arjun Sharma",
                Status = "Submitted"
            };

            _mockClaimRepo
                .Setup(r => r.SubmitClaimAsync(dto, 3))
                .ReturnsAsync(fakeCreatedClaim);

            // ACT
            var result = await _controller.SubmitClaim(dto);

            // ASSERT
            var createdResult = result as CreatedAtActionResult;
            Assert.That(createdResult, Is.Not.Null);
            Assert.That(createdResult!.StatusCode, Is.EqualTo(201));
        }

        // TEST 5 — SubmitClaim returns 400 when validation fails
        [Test]
        public async Task SubmitClaim_WhenValidationFails_Returns400()
        {
            // ARRANGE
            var dto = new CreateClaimDto { ProviderID = 99 };

            _mockClaimRepo
                .Setup(r => r.SubmitClaimAsync(It.IsAny<CreateClaimDto>(), It.IsAny<int>()))
                .ReturnsAsync((ClaimResponseDto?)null);

            // ACT
            var result = await _controller.SubmitClaim(dto);

            // ASSERT
            var badRequest = result as BadRequestObjectResult;
            Assert.That(badRequest, Is.Not.Null);
            Assert.That(badRequest!.StatusCode, Is.EqualTo(400));
        }

        // ── TearDown runs AFTER every test ─────────
        [TearDown]
        public void TearDown()
        {
            // Clean up if needed (optional here)
        }
    }
}