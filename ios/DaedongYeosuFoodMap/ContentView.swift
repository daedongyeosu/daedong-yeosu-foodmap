import SwiftUI
import UIKit

struct ContentView: View {
    @StateObject private var store = WebViewStore()
    @State private var shareItems: [Any] = []
    @State private var isSharing = false

    var body: some View {
        VStack(spacing: 0) {
            ZStack {
                DaedongWebView(store: store)

                if let message = store.errorMessage {
                    OfflineView(message: message) {
                        store.reload()
                    }
                }
            }

            Divider()

            HStack {
                ToolbarButton(title: "홈", systemImage: "house.fill") {
                    store.goHome()
                }

                ToolbarButton(title: "뒤로", systemImage: "chevron.left", disabled: !store.canGoBack) {
                    store.goBack()
                }

                ToolbarButton(title: "새로고침", systemImage: "arrow.clockwise") {
                    store.reload()
                }

                ToolbarButton(title: "공유", systemImage: "square.and.arrow.up") {
                    shareItems = [store.currentURL ?? WebViewStore.homeURL]
                    isSharing = true
                }

                ToolbarButton(title: "Safari", systemImage: "safari") {
                    UIApplication.shared.open(store.currentURL ?? WebViewStore.homeURL)
                }
            }
            .padding(.horizontal, 6)
            .padding(.top, 7)
            .padding(.bottom, 4)
            .background(.ultraThinMaterial)
        }
        .ignoresSafeArea(.container, edges: .top)
        .sheet(isPresented: $isSharing) {
            ShareSheet(items: shareItems)
        }
    }
}

private struct ToolbarButton: View {
    let title: String
    let systemImage: String
    var disabled = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 3) {
                Image(systemName: systemImage)
                    .font(.system(size: 17, weight: .semibold))
                Text(title)
                    .font(.caption2)
            }
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(.plain)
        .foregroundStyle(disabled ? Color.secondary.opacity(0.45) : Color.accentColor)
        .disabled(disabled)
        .accessibilityLabel(title)
    }
}

private struct OfflineView: View {
    let message: String
    let retry: () -> Void

    var body: some View {
        VStack(spacing: 14) {
            Image(systemName: "wifi.exclamationmark")
                .font(.system(size: 34))
                .foregroundStyle(.orange)
            Text("인터넷 연결을 확인해 주세요")
                .font(.headline)
            Text(message)
                .font(.footnote)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            Button("다시 시도", action: retry)
                .buttonStyle(.borderedProminent)
        }
        .padding(24)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 18))
        .padding(28)
    }
}

private struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}


