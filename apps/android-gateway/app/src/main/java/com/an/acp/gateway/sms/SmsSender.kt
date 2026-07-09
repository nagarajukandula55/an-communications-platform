package com.an.acp.gateway.sms

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.telephony.SmsManager

class SmsSender(private val context: Context) {
    private val smsManager: SmsManager
        get() = context.getSystemService(SmsManager::class.java)

    fun send(outboxMessageId: String, to: String, body: String) {
        val sentIntent = Intent(context, SmsDeliveryReceiver::class.java).apply {
            putExtra(EXTRA_OUTBOX_MESSAGE_ID, outboxMessageId)
        }
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            outboxMessageId.hashCode(),
            sentIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val parts = smsManager.divideMessage(body)
        if (parts.size > 1) {
            val sentIntents = ArrayList<PendingIntent>().apply {
                repeat(parts.size) { add(pendingIntent) }
            }
            smsManager.sendMultipartTextMessage(to, null, parts, sentIntents, null)
        } else {
            smsManager.sendTextMessage(to, null, body, pendingIntent, null)
        }
    }
}
