"""Build a deterministic install ZIP and Jellyfin repository manifest."""
from pathlib import Path
import hashlib, json, zipfile
root = Path(__file__).resolve().parent.parent
version = "0.1.1.0"
name = "Jellyfin.Plugin.AdvancedFilters"
dll = root / "server/bin/Release/net10.0" / (name + ".dll")
if not dll.is_file():
    raise SystemExit("Missing DLL: compile with dotnet build first")
out = root / "release"
out.mkdir(exist_ok=True)
archive = out / (name + "_" + version + ".zip")
with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as z:
    for filename, data in [(dll.name, dll.read_bytes()), ("LICENSE", (root / "LICENSE").read_bytes())]:
        info = zipfile.ZipInfo(filename, (2026, 1, 1, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o644 << 16
        z.writestr(info, data)
blob = archive.read_bytes()
manifest = [{"guid":"30c729c4-633d-48a4-a31e-e6680b8c643a","name":"Advanced Filters","description":"Advanced metadata filtering for Jellyfin Web. Experimental 0.1 release.","overview":"高级组合筛选：人物、标签、类型、年份、播放状态及其他原生条件。","owner":"polaris-piglet","category":"General","versions":[{"version":version,"changelog":"Add fuzzy person keyword search with explicit ID selection.","targetAbi":"12.2.0.0","sourceUrl":"https://github.com/polaris-piglet/jellyfin-plugin-advanced-filters/releases/download/v"+version+"/"+archive.name,"checksum":hashlib.md5(blob).hexdigest(),"timestamp":"2026-11-05T00:00:00Z"}]}]
(out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+"\n")
(out / "SHA256SUMS").write_text(hashlib.sha256(blob).hexdigest()+"  "+archive.name+"\n")
print("Packaged", archive.name, "and manifest.json")
