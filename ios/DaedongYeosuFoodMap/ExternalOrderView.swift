import SwiftUI
import WebKit

@MainActor
final class ExternalOrderState: ObservableObject {
    weak var webView: WKWebView?
    @Published var message: String?
    @Published var canGoBack = false
}

struct ExternalOrderView: View {
    let destination: ExternalOrderDestination
    @Environment(\.dismiss) private var dismiss
    @StateObject private var state = ExternalOrderState()

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                if let message = state.message {
                    Text(message).font(.callout).padding()
                        .frame(maxWidth: .infinity)
                        .background(Color.orange.opacity(0.12))
                        .accessibilityIdentifier("orderLinkMessage")
                }
                OrderWebView(url: destination.url, state: state)
            }
            .navigationTitle("주문앱 연결")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("닫기") { dismiss() }
                }
                ToolbarItemGroup(placement: .navigationBarTrailing) {
                    Button("뒤로") { state.webView?.goBack() }.disabled(!state.canGoBack)
                    Button("새로고침") {
                        state.message = nil
                        state.webView?.reload()
                    }
                }
            }
        }
    }
}

private struct OrderWebView: UIViewRepresentable {
    let url: URL
    @ObservedObject var state: ExternalOrderState

    func makeCoordinator() -> Coordinator { Coordinator(state: state) }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        let view = WKWebView(frame: .zero, configuration: configuration)
        view.navigationDelegate = context.coordinator
        view.uiDelegate = context.coordinator
        view.allowsBackForwardNavigationGestures = true
        state.webView = view
        view.load(URLRequest(url: url))
        return view
    }

    func updateUIView(_ view: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        let state: ExternalOrderState
        init(state: ExternalOrderState) { self.state = state }

        func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = action.request.url else { decisionHandler(.cancel); return }
            if LinkPolicy.isWeb(url) {
                // Web fallback stays here; closing never reloads the original store.
                if url.host?.lowercased() == "apps.apple.com" {
                    decisionHandler(.cancel)
                    openApp(url)
                } else if action.targetFrame == nil {
                    decisionHandler(.cancel)
                    webView.load(action.request)
                } else {
                    decisionHandler(.allow)
                }
            } else if url.absoluteString == "about:blank" {
                decisionHandler(.allow)
            } else {
                decisionHandler(.cancel)
                if LinkPolicy.canOpenExternally(url) { openApp(url) }
            }
        }

        private func openApp(_ url: URL) {
            UIApplication.shared.open(url, options: [:]) { [weak self] opened in
                DispatchQueue.main.async {
                    self?.state.message = opened ? nil :
                        "주문앱을 열지 못했습니다. 앱이 설치되어 있는지 확인하거나, 닫기를 눌러 다른 주문방법을 선택해 주세요."
                }
            }
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            state.canGoBack = webView.canGoBack
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            failed(error)
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            failed(error)
        }

        private func failed(_ error: Error) {
            guard (error as NSError).code != NSURLErrorCancelled else { return }
            state.message = "연결 페이지를 불러오지 못했습니다. 새로고침하거나 닫기를 눌러 다른 주문방법을 선택해 주세요."
        }

        func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                     for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
            nil // handled once by decidePolicyFor
        }
    }
}
