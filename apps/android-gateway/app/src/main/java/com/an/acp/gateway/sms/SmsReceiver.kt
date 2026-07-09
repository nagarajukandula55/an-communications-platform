package com.an.acp.gateway.sms

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.util.Log

/**
 * Receives inbound SMS on the gateway device. In a complete build this would
 * forward each message to the ACP backend (e.g. via GatewayWebSocketClient
 * or a dedicated HTTP endpoint) instead of just logging it.
 */
class SmsReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) {
            return
        }

        val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
        for (message in messages) {
            Log.i(
                "SmsReceiver",
                "Inbound SMS from ${message.originatingAddress}: ${message.messageBody}",
            )
            // TODO(M09 SMS Transport): forward to backend via /messages/inbound webhook.
        }
    }
}
