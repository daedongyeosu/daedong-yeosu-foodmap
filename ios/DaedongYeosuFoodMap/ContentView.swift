import SwiftUI
import UIKit

struct ContentView: View {
    @StateObject private var store = WebViewStore()

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

        }
        // SwiftUI owns the safe area; the website owns the single navigation bar.
        .sheet(item: $store.externalOrder) { destination in
            ExternalOrderView(destination: destination)
        }
        .alert("연결 안내", isPresented: Binding(
            get: { store.linkMessage != nil },
            set: { if !$0 { store.linkMessage = nil } }
        )) {
            Button("확인", role: .cancel) { store.linkMessage = nil }
        } message: {
            Text(store.linkMessage ?? "")
        }
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



