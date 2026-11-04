// SPDX-License-Identifier: MIT
using System.Text;
using MediaBrowser.Controller;
using MediaBrowser.Controller.Plugins;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Primitives;

namespace Jellyfin.Plugin.AdvancedFilters;

public sealed class Registration : IPluginServiceRegistrator
{
    public void RegisterServices(IServiceCollection services, IServerApplicationHost host)
        => services.AddTransient<IStartupFilter, WebStartup>();
}

public sealed class WebStartup : IStartupFilter
{
    public Action<IApplicationBuilder> Configure(Action<IApplicationBuilder> next) => app =>
    {
        app.UseMiddleware<WebInjection>();
        next(app);
    };
}

// Only the web entry response is buffered. No files on disk are modified.
public sealed class WebInjection(RequestDelegate next)
{
    private static readonly string[] HeaderNames = ["Accept-Encoding", "Range", "If-Range", "If-None-Match", "If-Modified-Since"];
    private static readonly Lazy<byte[]> Script = new(() =>
    {
        using var source = typeof(Plugin).Assembly.GetManifestResourceStream("AdvancedFilters.client.js")
            ?? throw new InvalidOperationException("Missing embedded script; run npm run build before dotnet build.");
        using var output = new MemoryStream();
        source.CopyTo(output);
        return output.ToArray();
    });

    public async Task InvokeAsync(HttpContext context)
    {
        if (Plugin.Instance?.Configuration.Enabled != true)
        {
            await next(context);
            return;
        }
        var path = context.Request.Path.Value ?? "";
        var isGet = HttpMethods.IsGet(context.Request.Method);
        var isHead = HttpMethods.IsHead(context.Request.Method);
        // This endpoint serves only public static code, never metadata or credentials.
        if ((isGet || isHead) && path.EndsWith("/AdvancedFilters/client.js", StringComparison.OrdinalIgnoreCase))
        {
            context.Response.ContentType = "text/javascript; charset=utf-8";
            context.Response.Headers.CacheControl = "no-store";
            context.Response.Headers["X-Content-Type-Options"] = "nosniff";
            context.Response.ContentLength = Script.Value.Length;
            if (isGet) await context.Response.Body.WriteAsync(Script.Value, context.RequestAborted);
            return;
        }
        if (!isGet || !(path.EndsWith("/web/", StringComparison.OrdinalIgnoreCase)
            || path.EndsWith("/web/index.html", StringComparison.OrdinalIgnoreCase)))
        {
            await next(context);
            return;
        }
        var saved = HeaderNames.ToDictionary(name => name, name => context.Request.Headers[name]);
        foreach (var name in HeaderNames) context.Request.Headers.Remove(name);
        var original = context.Response.Body;
        using var buffer = new MemoryStream();
        context.Response.Body = buffer;
        try { await next(context); }
        finally
        {
            context.Response.Body = original;
            foreach (var (name, value) in saved)
            {
                if (StringValues.IsNullOrEmpty(value)) context.Request.Headers.Remove(name);
                else context.Request.Headers[name] = value;
            }
        }
        var bytes = buffer.ToArray();
        if (context.Response.StatusCode == 200
            && string.IsNullOrEmpty(context.Response.Headers.ContentEncoding)
            && context.Response.ContentType?.StartsWith("text/html", StringComparison.OrdinalIgnoreCase) == true)
        {
            var html = Encoding.UTF8.GetString(bytes);
            var end = html.LastIndexOf("</body>", StringComparison.OrdinalIgnoreCase);
            if (end >= 0 && !html.Contains("advanced-filters-loader", StringComparison.Ordinal))
            {
                // Relative URL preserves reverse-proxy BaseUrl and never trusts the Host header.
                html = html.Insert(end, "<script id='advanced-filters-loader' defer src='../AdvancedFilters/client.js'></script>");
                bytes = Encoding.UTF8.GetBytes(html);
                context.Response.Headers.Remove("ETag");
                context.Response.Headers.Remove("Last-Modified");
                context.Response.Headers.CacheControl = "no-store";
                context.Response.ContentLength = bytes.Length;
            }
        }
        await original.WriteAsync(bytes, context.RequestAborted);
    }
}
