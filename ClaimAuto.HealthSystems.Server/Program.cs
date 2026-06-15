using System.Reflection; // for loading XML comments into Swagger
using System.Text;
using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.Middleware;
using ClaimAuto.HealthSystems.Server.Repositories.Implementations;
using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;
using ClaimAuto.HealthSystems.Server.Services;
using ClaimAuto.HealthSystems.Server.Services.Interfaces;
using ClaimAuto.HealthSystems.Server.Services.Implementations;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
//using ClaimAuto.HealthSystems.Server.Services;
using ClaimAuto.HealthSystems.Server.Model;
using ClaimAuto.HealthSystems.Server.Services.RuleEngine;
using ClaimAuto.HealthSystems.Server.Services.RuleEngine.Strategies;
using Serilog;
using Serilog.Events;

namespace ClaimAuto.HealthSystems.Server
{
    public class Program
    {
        public static async Task Main(string[] args)
        {
            // Bootstrap logger captures startup errors before full Serilog is configured.
            Log.Logger = new LoggerConfiguration()
                .MinimumLevel.Override("Microsoft", LogEventLevel.Warning)
                .Enrich.FromLogContext()
                .WriteTo.Console(outputTemplate:
                    "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj}{NewLine}{Exception}")
                .CreateBootstrapLogger();

            try
            {
                Log.Information("Starting ClaimAuto Health Systems API");
                await RunAsync(args);// Calls the RunAsync method, which contains the main logic for configuring and running the web application. This method is awaited to ensure that the application runs asynchronously and can handle incoming HTTP requests without blocking the main thread.
            }
            catch (Exception ex)
            {
                Log.Fatal(ex, "Application terminated unexpectedly");// Logs a fatal error message if an unhandled exception occurs during the startup or execution of the application, providing details about the exception that caused the termination.
            }
            finally
            {
                await Log.CloseAndFlushAsync();
            }
        }

        
        private static async Task RunAsync(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);// Creates a new instance of the WebApplicationBuilder class, which is used to configure and build the web application. The builder provides methods for setting up services, middleware, and other configurations needed to run the application.

            // Replace the default .NET logger with Serilog, reading config from appsettings.json.
            builder.Host.UseSerilog((context, services, configuration) => configuration
                .ReadFrom.Configuration(context.Configuration)
                .ReadFrom.Services(services)
                .Enrich.FromLogContext());

            // Add services to the container.
            builder.Services.AddDbContext<ApplicationDbContext>(options =>
            options.UseSqlServer(builder.Configuration
                .GetConnectionString("DBConnection")));

            // Register Repository with DI
            builder.Services.AddScoped<IUserRepository, UserRepository>();
            builder.Services.AddScoped<IPolicyRepository, PolicyRepository>();
            builder.Services.AddScoped<IMemberRepository, MemberRepository>();
            builder.Services.AddScoped<INotificationRepository, NotificationRepository>();
            builder.Services.AddScoped<IReportRepository, ReportRepository>();
            builder.Services.AddScoped<IClaimRepository, ClaimRepository>();
            builder.Services.AddScoped<IRuleRepository, RuleRepository>();
            builder.Services.AddScoped<AdjudicationService>();
            builder.Services.AddScoped<IAdjudicationRepository, AdjudicationRepository>();
            builder.Services.AddScoped<IPaymentRepository, PaymentRepository>();
            builder.Services.AddScoped<IAuditLogRepository, AuditLogRepository>();
            builder.Services.AddScoped<ITotpRepository, TotpRepository>();
            builder.Services.AddScoped<IFraudRepository, FraudRepository>();
            builder.Services.AddScoped<IAppealRepository, AppealRepository>();
            builder.Services.AddScoped<ITaskRepository, TaskRepository>();
            builder.Services.AddScoped<IAuthRepository, AuthRepository>();
            builder.Services.AddScoped<IOrganizationRepository, OrganizationRepository>();

            // Register PDF generation service
            builder.Services.AddScoped<IRemittancePdfService, RemittancePdfService>();
            builder.Services.AddScoped<IAppealPdfRepository, AppealPdfRepository>();
            builder.Services.AddScoped<IReconciliationPdfService, ReconciliationPdfService>();
            builder.Services.AddScoped<IEmailServices, SmtpEmailService>();
            builder.Services.AddScoped<IReportPdfService, ReportPdfService>();
            builder.Services.AddScoped<IAuditPackagePdfService, AuditPackagePdfService>();

            // ── Rule Engine Strategies (Template-Based Adjudication) ──────────────
            builder.Services.AddSingleton<IRuleStrategy, PolicyActiveStrategy>();
            builder.Services.AddSingleton<IRuleStrategy, InNetworkStrategy>();
            builder.Services.AddSingleton<IRuleStrategy, WaitingPeriodStrategy>();
            builder.Services.AddSingleton<IRuleStrategy, CoverageRemainingStrategy>();
            builder.Services.AddSingleton<IRuleStrategy, AmountBelowStrategy>();
            builder.Services.AddSingleton<IRuleStrategy, AmountAboveStrategy>();
            builder.Services.AddSingleton<IRuleStrategy, AmountBetweenStrategy>();
            builder.Services.AddSingleton<IRuleStrategy, ClaimTypeDenyStrategy>();
            builder.Services.AddSingleton<IRuleStrategy, ClaimTypePassStrategy>();
            builder.Services.AddSingleton<IRuleStrategy, DuplicateCheckStrategy>();
            builder.Services.AddSingleton<IRuleStrategy, DeductibleStrategy>();
            builder.Services.AddSingleton<IRuleStrategy, CoPayStrategy>();
            builder.Services.AddSingleton<IRuleStrategy, RequireDocTypeStrategy>();
            builder.Services.AddSingleton<IRuleStrategy, RouteToReviewStrategy>();

            // Configure JSON Serialisation to handle cycles and enums as strings.
            builder.Services.AddControllers()
            .AddJsonOptions(options =>
            {
                options.JsonSerializerOptions.ReferenceHandler =
                    System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;// Added this line to configure the JSON serializer to ignore reference cycles, which can occur when serializing objects that reference each other, preventing infinite loops and stack overflow errors during serialization.

                options.JsonSerializerOptions.Converters.Add(
                    new System.Text.Json.Serialization.JsonStringEnumConverter());
            });



            var jwtKey = builder.Configuration["Jwt:Key"]!;

            builder.Services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;//Added this line to set the default authentication, which means that the application will use JWT tokens for authentication by default.
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme; //Added this line to set the default challenge scheme, which means that if authentication fails, the application will challenge the client using JWT tokens.
            })
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = builder.Configuration["Jwt:Issuer"],
                    ValidAudience = builder.Configuration["Jwt:Audience"],
                    IssuerSigningKey = new SymmetricSecurityKey(
                        Encoding.UTF8.GetBytes(jwtKey))
                };
            });

            builder.Services.AddAuthorization();

            builder.Services.AddEndpointsApiExplorer();// This line adds support for API endpoint exploration, which is used by tools like Swagger to discover and document the available API endpoints in the application.
            builder.Services.AddSwaggerGen(options =>
            {
                options.SwaggerDoc("v1", new OpenApiInfo
                {
                    Title = "ClaimAuto Health Systems API",
                    Version = "v1"
                });

                options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
                {
                    Name = "Authorization",
                    Type = SecuritySchemeType.Http,
                    Scheme = "Bearer",
                    BearerFormat = "JWT",
                    In = ParameterLocation.Header,
                    Description = "Enter your JWT token. Example: eyJhbGciOiJIUzI1NiIs..."
                });

                var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
                var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
                options.IncludeXmlComments(xmlPath);

                options.AddSecurityRequirement(new OpenApiSecurityRequirement
                {
                    {
                        new OpenApiSecurityScheme
                        {
                            Reference = new OpenApiReference
                            {
                                Type = ReferenceType.SecurityScheme,
                                Id = "Bearer"
                            }
                        },
                        Array.Empty<string>()
                    }
                });
            });

            builder.Services.AddCors(options =>
            {
                options.AddPolicy("AllowReactDev", policy =>
                    policy.WithOrigins("http://localhost:5173")   // ← MUST match Vite's URL
                          .AllowAnyHeader()
                          .AllowAnyMethod());
            });

            var app = builder.Build();//Build the application using the configured services and middleware.

            app.UseMiddleware<ExceptionHandlingMiddleware>();

            // Serilog request logging — replaces the default ASP.NET Core request log line.
            // Logs: method, path, status code, and elapsed time for every HTTP request.
            app.UseSerilogRequestLogging(options =>
            {
                options.MessageTemplate =
                    "HTTP {RequestMethod} {RequestPath} responded {StatusCode} in {Elapsed:0.0000} ms";

                // Degrade to Error for 5xx responses or exceptions; keep 4xx/2xx as Information.
                options.GetLevel = (httpContext, elapsed, ex) =>
                    ex != null || httpContext.Response.StatusCode >= 500
                        ? LogEventLevel.Error
                        : LogEventLevel.Information;

                // Attach extra properties to every request log entry.
                options.EnrichDiagnosticContext = (diagnosticContext, httpContext) =>
                {
                    diagnosticContext.Set("RequestHost", httpContext.Request.Host.Value);
                    diagnosticContext.Set("RequestScheme", httpContext.Request.Scheme);
                    diagnosticContext.Set("UserAgent",
                        httpContext.Request.Headers["User-Agent"].FirstOrDefault() ?? string.Empty);

                    if (httpContext.User.Identity?.IsAuthenticated == true)
                    {
                        diagnosticContext.Set("UserId",
                            httpContext.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? string.Empty);
                    }
                };
            });

            app.UseCors("AllowReactDev");

            if (app.Environment.IsDevelopment())//Added this condition to check if the application is running in the development environment, and if so, it enables Swagger for API documentation and testing.
            {
                app.UseSwagger();//Added this line to enable the generation of Swagger documentation for the API, which allows developers to understand and interact with the API endpoints.
                app.UseSwaggerUI();//Added this line to enable the Swagger UI, which provides a user-friendly interface for testing and exploring the API endpoints defined in the Swagger documentation.
            }

            app.UseAuthentication();//Added this line to enable authentication middleware, which allows the application to authenticate users based on the configured authentication scheme (in this case, JWT tokens).
            app.UseAuthorization();

            // Evict deactivated users before any other gate runs.
            // Returns 401 ACCOUNT_DEACTIVATED so the frontend can show the right message.
            app.UseMiddleware<UserStatusMiddleware>();

            // Security gate: invited users with MustChangePassword=true can ONLY
            // hit POST /api/auth/change-password — everything else is 403.
            // Must run AFTER auth (needs the user principal) and BEFORE controllers.
            app.UseMiddleware<MustChangePasswordMiddleware>();


            app.MapControllers();

            app.MapFallbackToFile("/index.html");//Added this line to configure a fallback route that serves the index.html file for any requests that do not match existing routes, which is useful for single-page applications (SPAs) that rely on client-side routing.

            await DbSeeder.SeedAsync(app);

            app.Run();//Added this line to start the application and listen for incoming HTTP requests, effectively running the web server and making the API available to clients.
        }
    }
}