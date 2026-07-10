package com.an.acp.gateway.sms

import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.an.acp.gateway.data.OutboxStatus
import com.an.acp.gateway.network.ActiveGateway
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

const val EXTRA_OUTBOX_MESSAGE_ID = "outbox_message_id"

/**
 * Receives the SmsManager sent-status PendingIntent result, updates the local
 * outbox row, and reports the outcome back to the ACP backend over the
 * gateway WebSocket (sms_result). Real delivery (device-to-carrier) reports
 * arrive via a separate PendingIntent registered in SmsSender; this receiver
 * only covers the "handed to radio" result.
 */
class SmsDeliveryReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val messageId = intent.getStringExtra(EXTRA_OUTBOX_MESSAGE_ID) ?: return
        val delivered = resultCode == Activity.RESULT_OK
        val errorMessage = if (delivered) null else "resultCode=$resultCode"

        Log.i("SmsDeliveryReceiver", "Message $messageId sent=$delivered resultCode=$resultCode")

        val pendingResult = goAsync()
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val dao = ActiveGateway.outboxDao
                val existing = dao?.pending()?.firstOrNull { it.id == messageId }
                if (dao != null && existing != null) {
                    dao.update(
                        existing.copy(
                            status = if (delivered) OutboxStatus.SENT else OutboxStatus.FAILED,
                            errorMessage = errorMessage,
                        ),
                    )
                }

                ActiveGateway.client?.sendSmsResult(
                    messageId = messageId,
                    accepted = delivered,
                    error = errorMessage,
                )
            } finally {
                pendingResult.finish()
            }
        }
    }
}
