using System.Text;
using ClaimAuto.HealthSystems.Server.Data;
using ClaimAuto.HealthSystems.Server.Repositories.Implementations;
using ClaimAuto.HealthSystems.Server.Repositories.Interfaces;
using ClaimAuto.HealthSystems.Server.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

namespace ClaimAuto.HealthSystems.Server
{
    public class Program
    {
        public static async Task Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);//Create a WebApplicationBuilder instance to configure the application and its services.

            // Add services to the container.
            builder.Services.AddDbContext<ApplicationDbContext>(options =>
            options.UseSqlServer(builder.Configuration
                .GetConnectionString("DBConnection")));

            
            // Scoped means one instance per HTTP request
            builder.Services.AddScoped<IUserRepository, UserRepository>();//Added this line to register IUserRepository with its implementation UserRepository
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



            builder.Services.AddControllers()//Added this line to register controllers with the dependency injection container, enabling the application to handle HTTP requests using controller classes.
            .AddJsonOptions(options =>
            {
                options.JsonSerializerOptions.ReferenceHandler =
                    System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;

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

            builder.Services.AddEndpointsApiExplorer();
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

            var app = builder.Build();//Build the application using the configured services and middleware.


            await DbSeeder.SeedAsync(app);//Called the SeedAsync method of the DbSeeder class to populate
        

           

            if (app.Environment.IsDevelopment())//Added this condition to check if the application is running in the development environment, and if so, it enables Swagger for API documentation and testing.
            {
                app.UseSwagger();//Added this line to enable the generation of Swagger documentation for the API, which allows developers to understand and interact with the API endpoints.
                app.UseSwaggerUI();//Added this line to enable the Swagger UI, which provides a user-friendly interface for testing and exploring the API endpoints defined in the Swagger documentation.
            }

            app.UseAuthentication();//Added this line to enable authentication middleware, which allows the application to authenticate users based on the configured authentication scheme (in this case, JWT tokens).
            app.UseAuthorization();

            app.MapControllers();

            app.MapFallbackToFile("/index.html");//Added this line to configure a fallback route that serves the index.html file for any requests that do not match existing routes, which is useful for single-page applications (SPAs) that rely on client-side routing.

            app.Run();//Added this line to start the application and listen for incoming HTTP requests, effectively running the web server and making the API available to clients.
        }
    }
}