import Foundation

enum LinkPolicy {
    static func isWeb(_ url: URL) -> Bool {
        ["https", "http"].contains(url.scheme?.lowercased() ?? "") && url.host != nil
    }

    static func isInternal(_ url: URL) -> Bool {
        guard isWeb(url), let host = url.host?.lowercased() else { return false }
        return host == "daedongmap.com" || host.hasSuffix(".daedongmap.com")
    }

    static func isOrder(_ url: URL) -> Bool {
        guard isWeb(url), let host = url.host?.lowercased() else { return false }
        return ["mukkebi.com", "yogiyo.co.kr", "yogiyo.airbridge.io"].contains {
            host == $0 || host.hasSuffix("." + $0)
        }
    }

    static func canOpenExternally(_ url: URL) -> Bool {
        guard let scheme = url.scheme?.lowercased() else { return false }
        return !["javascript", "data", "file", "blob", "about", "intent"].contains(scheme)
    }
}

struct ExternalOrderDestination: Identifiable {
    let id = UUID()
    let url: URL
}
