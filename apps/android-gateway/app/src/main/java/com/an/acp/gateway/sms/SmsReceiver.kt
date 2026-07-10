package com.an.acp.gateway.sms

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.util.Log
import com.an.acp.gateway.network.ActiveGateway
import java.time.Instant

/**
 * Receives inbound SMS on the gateway device and forwards each message to the
 * ACP backend over the live gateway WebSocket (sms_received), via
 * ActiveGateway.client set by GatewayConnectionService. If no connection is
 * currently active the message is logged only - there is no local queue for
 * inbound SMS (only outbound messages have an offline outbox).
 */
class SmsReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) {
            return
        }

        val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
        for (message in messages) {
            val from = message.originatingAddress ?: continue
            val body = message.messageBody ?: ""
            Log.i("SmsReceiver", "Inbound SMS from $from")

            val client = ActiveGateway.client
            if (client != null) {
                client.sendSmsReceived(from, body, Instant.now().toString())
            } else {
                Log.w("SmsReceiver", "No active gateway connection; inbound SMS from $from dropped")
            }
        }
    }
}
