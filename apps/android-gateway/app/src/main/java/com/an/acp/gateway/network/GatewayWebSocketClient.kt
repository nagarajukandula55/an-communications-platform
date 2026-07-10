package com.an.acp.gateway.network

import com.squareup.moshi.JsonAdapter
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import okhttp3.Response as OkHttpResponse

/**
 * Mirrors the message protocol in apps/api/src/gateway.ts:
 * client sends {type:"auth"|"heartbeat"}, server replies
 * {type:"authenticated"|"heartbeat_ack"|"error"}.
 */
sealed class GatewayEvent {
    data class Authenticated(val deviceId: String) : GatewayEvent()
    object HeartbeatAck : GatewayEvent()
    data class Error(val message: String) : GatewayEvent()
    object Disconnected : GatewayEvent()
    data class SendSms(val messageId: String, val to: String, val body: String) : GatewayEvent()
}

class GatewayWebSocketClient(
    private val baseWsUrl: String,
    private val onEvent: (GatewayEvent) -> Unit,
) {
    private val moshi = Moshi.Builder().add(KotlinJsonAdapterFactory()).build()
    private val inboundAdapter: JsonAdapter<InboundEnvelope> =
        moshi.adapter(InboundEnvelope::class.java)

    private val client = OkHttpClient.Builder().build()
    private var socket: WebSocket? = null

    fun connect(deviceToken: String) {
        val request = Request.Builder().url("$baseWsUrl/gateway/ws").build()
        socket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: OkHttpResponse) {
                webSocket.send("""{"type":"auth","token":"$deviceToken"}""")
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                val envelope = runCatching { inboundAdapter.fromJson(text) }.getOrNull()
                when (envelope?.type) {
                    "authenticated" -> envelope.deviceId?.let {
                        onEvent(GatewayEvent.Authenticated(it))
                    }
                    "heartbeat_ack" -> onEvent(GatewayEvent.HeartbeatAck)
                    "error" -> onEvent(GatewayEvent.Error(envelope.message ?: "Unknown error"))
                    "send_sms" -> if (
                        envelope.messageId != null &&
                        envelope.to != null &&
                        envelope.body != null
                    ) {
                        onEvent(GatewayEvent.SendSms(envelope.messageId, envelope.to, envelope.body))
                    }
                }
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                onEvent(GatewayEvent.Disconnected)
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: OkHttpResponse?) {
                onEvent(GatewayEvent.Error(t.message ?: "Connection failed"))
            }
        })
    }

    fun sendHeartbeat() {
        socket?.send("""{"type":"heartbeat"}""")
    }

    fun sendSmsResult(messageId: String, accepted: Boolean, providerRef: String? = null, error: String? = null) {
        val outbound = OutboundSmsResult("sms_result", messageId, accepted, providerRef, error)
        socket?.send(outboundSmsResultAdapter.toJson(outbound))
    }

    fun sendSmsReceived(from: String, body: String, receivedAt: String) {
        val outbound = OutboundSmsReceived("sms_received", from, body, receivedAt)
        socket?.send(outboundSmsReceivedAdapter.toJson(outbound))
    }

    fun disconnect() {
        socket?.close(1000, "client_disconnect")
        socket = null
    }

    private val outboundSmsResultAdapter: JsonAdapter<OutboundSmsResult> =
        moshi.adapter(OutboundSmsResult::class.java)
    private val outboundSmsReceivedAdapter: JsonAdapter<OutboundSmsReceived> =
        moshi.adapter(OutboundSmsReceived::class.java)
}

private data class InboundEnvelope(
    val type: String,
    val deviceId: String? = null,
    val message: String? = null,
    val messageId: String? = null,
    val to: String? = null,
    val body: String? = null,
)

private data class OutboundSmsResult(
    val type: String,
    val messageId: String,
    val accepted: Boolean,
    val providerRef: String?,
    val error: String?,
)

private data class OutboundSmsReceived(
    val type: String,
    val from: String,
    val body: String,
    val receivedAt: String,
)
