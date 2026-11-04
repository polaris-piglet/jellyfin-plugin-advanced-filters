// SPDX-License-Identifier: MIT
using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;

namespace Jellyfin.Plugin.AdvancedFilters;

public sealed class Configuration : BasePluginConfiguration
{
    public bool Enabled { get; set; } = true;
}

public sealed class Plugin : BasePlugin<Configuration>, IHasWebPages
{
    public static Plugin? Instance { get; private set; }
    public Plugin(IApplicationPaths paths, IXmlSerializer serializer) : base(paths, serializer)
    {
        Instance = this;
    }
    public override Guid Id => new("30c729c4-633d-48a4-a31e-e6680b8c643a");
    public override string Name => "Advanced Filters";
    public override string Description => "Permission-aware advanced filters for Jellyfin Web. Experimental.";
    public IEnumerable<PluginPageInfo> GetPages() => new[]
    {
        new PluginPageInfo { Name = "AdvancedFilters", EmbeddedResourcePath = "AdvancedFilters.config.html" }
    };
}
