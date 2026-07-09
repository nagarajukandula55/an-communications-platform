package com.an.acp.gateway.sms

import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

const val EXTRA_OUTBOX_MESSAGE_ID = "outbox_message_id"

/**
 * Receives the SmsManager sent-status PendingIntent result. Real delivery
 * (device-to-carrier) reports arrive via a separate PendingIntent registered
 * in SmsSender; this receiver only covers the "handed to radio" result.
 */
class SmsDeliveryReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val messageId = intent.getStringExtra(EXTRA_OUTBOX_MESSAGE_ID) ?: return
        val delivered = resultCode == Activity.RESULT_OK

        Log.i("SmsDeliveryReceiver", "Message $messageId sent=$delivered resultCode=$resultCode")
        // TODO(M09 SMS Transport): update OutboxDao status and report to backend.
    }
}
