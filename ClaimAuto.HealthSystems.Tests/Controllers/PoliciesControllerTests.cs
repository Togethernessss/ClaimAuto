using System.Security.Claims;
using ClaimAuto.HealthSystems.Server.Controllers;
using ClaimAuto.HealthSystems.Server.DTOs;
using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;

[TestFixture]
public class PoliciesControllerTests
{
    private Mock<IPolicyRepository> _mockPolicyRepo;
    private PoliciesController _controller;

    [SetUp]
    public void Setup()
    {
        _mockPolicyRepo = new Mock<IPolicyRepository>();
        _controller = new PoliciesController(_mockPolicyRepo.Object);

        // Admin user
        var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "1"),
            new Claim(ClaimTypes.Role, "Admin")
        }, "TestAuth"));

        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };
    }

    [Test]
    public async Task GetPolicyById_WhenExists_Returns200()
    {
        var fakePolicy = new PolicyResponseDto
        {
            PolicyID = 1,
            PlanName = "Family Gold",
            Status = "Active",
            MemberCount = 3
        };

        _mockPolicyRepo
            .Setup(r => r.GetPolicyByIdAsync(1))
            .ReturnsAsync(fakePolicy);

        var result = await _controller.GetPolicyById(1);

        var ok = result as OkObjectResult;
        Assert.That(ok, Is.Not.Null);
        Assert.That(((PolicyResponseDto)ok!.Value!).PlanName, Is.EqualTo("Family Gold"));
    }

    [Test]
    public async Task CreatePolicy_DuplicatePlanCode_Returns409Conflict()
    {
        var dto = new CreatePolicyDto { PlanCode = "FAMILY-GOLD-2024" };

        // Simulate PlanCode already exists
        _mockPolicyRepo
            .Setup(r => r.PlanCodeExistsAsync("FAMILY-GOLD-2024"))
            .ReturnsAsync(true);

        var result = await _controller.CreatePolicy(dto);

        var conflict = result as ConflictObjectResult;
        Assert.That(conflict, Is.Not.Null);
        Assert.That(conflict!.StatusCode, Is.EqualTo(409));
    }
}