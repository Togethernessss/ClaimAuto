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
    public class MembersControllerTests
    {
        private Mock<IMemberRepository> _mockRepo;
        private MembersController       _controller;

        [SetUp]
        public void SetUp()
        {
            _mockRepo   = new Mock<IMemberRepository>();
            _controller = new MembersController(_mockRepo.Object);

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
        public async Task GetMemberById_WhenMemberExists_Returns200()
        {
            // ── ARRANGE ──────────────────────────────────────────────────────
            var fakeMember = new MemberResponseDto
            {
                MemberID = 1,
                Name     = "Priya Mehta",
                Status   = "Active"
            };
            _mockRepo
                .Setup(r => r.GetMemberByIdAsync(1, It.IsAny<int?>()))
                .ReturnsAsync(fakeMember);

            // ── ACT ───────────────────────────────────────────────────────────
            var result = await _controller.GetMemberById(1);

            // ── ASSERT ────────────────────────────────────────────────────────
            var ok = result as OkObjectResult;
            Assert.That(ok,             Is.Not.Null);
            Assert.That(ok!.StatusCode, Is.EqualTo(200));
            _mockRepo.Verify(r => r.GetMemberByIdAsync(1, It.IsAny<int?>()), Times.Once);
        }

        // ── TEST 2 ────────────────────────────────────────────────────────────
        [Test]
        public async Task GetMemberById_WhenMemberNotFound_Returns404()
        {
            // ── ARRANGE ──────────────────────────────────────────────────────
            _mockRepo
                .Setup(r => r.GetMemberByIdAsync(99, It.IsAny<int?>()))
                .ReturnsAsync((MemberResponseDto?)null);

            // ── ACT ───────────────────────────────────────────────────────────
            var result = await _controller.GetMemberById(99);

            // ── ASSERT ────────────────────────────────────────────────────────
            var notFound = result as NotFoundObjectResult;
            Assert.That(notFound,             Is.Not.Null);
            Assert.That(notFound!.StatusCode, Is.EqualTo(404));
            _mockRepo.Verify(r => r.GetMemberByIdAsync(99, It.IsAny<int?>()), Times.Once);
        }

        // ── TEST 3 ────────────────────────────────────────────────────────────
        [Test]
        public async Task CreateMember_WhenAlreadyEnrolled_Returns409Conflict()
        {
            // ── ARRANGE ──────────────────────────────────────────────────────
            var dto = new CreateMemberDto
            {
                PolicyholderUserID = 5,
                PolicyID           = 2,
                Name               = "Ravi Kumar",
                Gender             = "Male",
                DOB                = new DateTime(1990, 1, 1),
                CoverageStart      = DateTime.Today
            };
            _mockRepo
                .Setup(r => r.IsEnrolledInPolicyAsync(5, 2, It.IsAny<int?>()))
                .ReturnsAsync(true);

            // ── ACT ───────────────────────────────────────────────────────────
            var result = await _controller.CreateMember(dto);

            // ── ASSERT ────────────────────────────────────────────────────────
            var conflict = result as ConflictObjectResult;
            Assert.That(conflict,             Is.Not.Null);
            Assert.That(conflict!.StatusCode, Is.EqualTo(409));
            _mockRepo.Verify(r => r.IsEnrolledInPolicyAsync(5, 2, It.IsAny<int?>()), Times.Once);
        }

        // ── TEST 4 ────────────────────────────────────────────────────────────
        [Test]
        public async Task CreateMember_WhenValidAndNotEnrolled_Returns201Created()
        {
            // ── ARRANGE ──────────────────────────────────────────────────────
            var dto = new CreateMemberDto
            {
                PolicyholderUserID = 5,
                PolicyID           = 2,
                Name               = "Ravi Kumar",
                Gender             = "Male",
                DOB                = new DateTime(1990, 1, 1),
                CoverageStart      = DateTime.Today
            };
            var createdMember = new MemberResponseDto { MemberID = 10, Name = "Ravi Kumar", Status = "Active" };

            _mockRepo
                .Setup(r => r.IsEnrolledInPolicyAsync(5, 2, It.IsAny<int?>()))
                .ReturnsAsync(false);
            _mockRepo
                .Setup(r => r.CreateMemberAsync(dto, It.IsAny<int>(), It.IsAny<int?>()))
                .ReturnsAsync(createdMember);

            // ── ACT ───────────────────────────────────────────────────────────
            var result = await _controller.CreateMember(dto);

            // ── ASSERT ────────────────────────────────────────────────────────
            var createdResult = result as CreatedAtActionResult;
            Assert.That(createdResult,             Is.Not.Null);
            Assert.That(createdResult!.StatusCode, Is.EqualTo(201));
            _mockRepo.Verify(r => r.CreateMemberAsync(dto, It.IsAny<int>(), It.IsAny<int?>()), Times.Once);
        }
    }
}
