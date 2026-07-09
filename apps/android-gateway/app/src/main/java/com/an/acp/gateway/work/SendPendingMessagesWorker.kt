package com.an.acp.gateway.work

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.an.acp.gateway.AcpGatewayApplication
import com.an.acp.gateway.sms.SmsSender

/**
 * Periodically flushes any outbox messages that were queued while the
 * device was offline. The realtime path (message arrives while the
 * WebSocket connection is live) is handled directly by
 * GatewayConnectionService in a complete build; this worker is the
 * catch-up/retry path.
 */
class SendPendingMessagesWorker(
    context: Context,
    params: WorkerParameters,
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val app = applicationContext as AcpGatewayApplication
        val dao = app.database.outboxDao()
        val sender = SmsSender(applicationContext)

        val pending = dao.pending()
        for (message in pending) {
            sender.send(message.id, message.to, message.body)
        }

        return Result.success()
    }
}
