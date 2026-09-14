import Foundation

func url(_ value: String) -> URL { URL(string: value)! }
assert(LinkPolicy.isInternal(url("https://daedongmap.com/?store=original")))
assert(LinkPolicy.isInternal(url("https://preview.daedongmap.com/")))
assert(!LinkPolicy.isInternal(url("https://daedongmap.com.attacker.example/")))
assert(!LinkPolicy.isInternal(url("custom://daedongmap.com/")))
for host in ["mukkebi.com", "www.mukkebi.com", "yogiyo.co.kr", "www.yogiyo.co.kr", "yogiyo.airbridge.io"] {
    let original = url("https://\(host)/detail?id=123&return=kept")
    assert(LinkPolicy.isOrder(original))
    assert(ExternalOrderDestination(url: original).url == original)
}
assert(!LinkPolicy.isOrder(url("https://mukkebi.com.attacker.example/")))
assert(!LinkPolicy.isOrder(url("https://other.airbridge.io/")))
for scheme in ["tel", "sms", "mailto", "mukkebi", "yogiyoapp", "itms-apps", "https"] {
    assert(LinkPolicy.canOpenExternally(url("\(scheme)://example")))
}
for scheme in ["javascript", "data", "file", "blob", "about", "intent"] {
    assert(!LinkPolicy.canOpenExternally(url("\(scheme)://example")))
}
print("PASS iOS exact-host routing, original URLs, app schemes and unsafe schemes")
