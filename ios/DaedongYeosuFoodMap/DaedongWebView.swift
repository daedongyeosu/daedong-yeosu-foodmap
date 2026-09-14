import Combine
import SwiftUI
import UIKit
import WebKit

@MainActor
final class WebViewStore: ObservableObject {
    static let homeURL = URL(string: "https://daedongmap.com/?source=ios-app")!

    @Published var canGoBack = false
    @Published var currentURL: URL?
    @Published var errorMessage: String?
    @Published var linkMessage: String?
    @Published var externalOrder: ExternalOrderDestination?

    weak var webView: WKWebView?

    func goHome() {
        webView?.load(URLRequest(url: Self.homeURL))
    }

    func goBack() {
        guard webView?.canGoBack == true else { return }
        webView?.goBack()
    }

    func reload() {
        errorMessage = nil
        if let webView, webView.url != nil {
            webView.reload()
        } else {
            goHome()
        }
    }

    func synchronizeNavigationState() {
        canGoBack = webView?.canGoBack ?? false
        currentURL = webView?.url
    }
}

struct DaedongWebView: UIViewRepresentable {
    @ObservedObject var store: WebViewStore

    func makeCoordinator() -> Coordinator {
        Coordinator(store: store)
    }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.applicationNameForUserAgent = "DaedongYeosuFoodMap/1.0 iOS"
        configuration.defaultWebpagePreferences.allowsContentJavaScript = true
        configuration.websiteDataStore = .default()

        let appMarkerScript = WKUserScript(
            source: "window.__DAEDONG_IOS_APP__ = true; document.documentElement.classList.add('daedong-ios-app');",
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        )
        configuration.userContentController.addUserScript(appMarkerScript)

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        webView.scrollView.keyboardDismissMode = .interactive
        webView.scrollView.contentInsetAdjustmentBehavior = .never

        let refreshControl = UIRefreshControl()
        refreshControl.addTarget(context.coordinator, action: #selector(Coordinator.refresh(_:)), for: .valueChanged)
        webView.scrollView.refreshControl = refreshControl

        store.webView = webView
        webView.load(URLRequest(url: WebViewStore.homeURL))
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        store.webView = webView
    }

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        private let store: WebViewStore

        init(store: WebViewStore) {
            self.store = store
        }

        @objc func refresh(_ sender: UIRefreshControl) {
            store.webView?.reload()
        }

        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            store.errorMessage = nil
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            webView.scrollView.refreshControl?.endRefreshing()
            store.errorMessage = nil
            store.synchronizeNavigationState()
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            handle(error, webView: webView)
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            handle(error, webView: webView)
        }

        private func handle(_ error: Error, webView: WKWebView) {
            webView.scrollView.refreshControl?.endRefreshing()
            let nsError = error as NSError
            if nsError.code == NSURLErrorCancelled { return }
            store.errorMessage = error.localizedDescription
            store.synchronizeNavigationState()
        }

        func webView(
            _ webView: WKWebView,
            decidePolicyFor navigationAction: WKNavigationAction,
            decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
        ) {
            guard let url = navigationAction.request.url else {
                decisionHandler(.cancel)
                return
            }

            if navigationAction.targetFrame?.isMainFrame == false {
                decisionHandler(LinkPolicy.isWeb(url) || url.absoluteString == "about:blank" ? .allow : .cancel)
                return
            }

            if LinkPolicy.isInternal(url) {
                if navigationAction.targetFrame == nil {
                    decisionHandler(.cancel)
                    webView.load(navigationAction.request)
                } else {
                    decisionHandler(.allow)
                }
                return
            }
            decisionHandler(.cancel)
            openExternal(url)
        }

        private func openExternal(_ url: URL) {
            guard LinkPolicy.canOpenExternally(url) else { return }
            if LinkPolicy.isOrder(url) {
                // Prefer an installed app. If absent, keep redirects in a dismissible
                // child web view so unsupported schemes never reach Safari.
                UIApplication.shared.open(url, options: [.universalLinksOnly: true]) { [weak self] opened in
                    guard !opened else { return }
                    DispatchQueue.main.async {
                        self?.store.externalOrder = ExternalOrderDestination(url: url)
                    }
                }
            } else {
                UIApplication.shared.open(url, options: [:]) { [weak self] opened in
                    guard !opened else { return }
                    DispatchQueue.main.async {
                        self?.store.linkMessage = "연결할 앱이 없거나 링크를 열 수 없습니다. 다른 주문방법을 선택해 주세요."
                    }
                }
            }
        }

        func webView(
            _ webView: WKWebView,
            createWebViewWith configuration: WKWebViewConfiguration,
            for navigationAction: WKNavigationAction,
            windowFeatures: WKWindowFeatures
        ) -> WKWebView? {
            // target=_blank is handled once in decidePolicyFor.
            return nil
        }
    }
}


