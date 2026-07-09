package com.an.acp.gateway.network

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import com.an.acp.gateway.AcpGatewayApplication
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

private const val NOTIFICATION_CHANNEL_ID = "acp_gateway_status"
private const val NOTIFICATION_ID = 1
private const val HEARTBEAT_INTERVAL_MS = 30_000L

class GatewayConnectionService : Service() {
    private val scope = CoroutineScope(Dispatchers.IO)
    private val heartbeatHandler = Handler(Looper.getMainLooper())
    private var client: GatewayWebSocketClient? = null

    private val heartbeatRunnable = object : Runnable {
        override fun run() {
            client?.sendHeartbeat()
            heartbeatHandler.postDelayed(this, HEARTBEAT_INTERVAL_MS)
        }
    }

    override fun onCreate() {
        super.onCreate()
        startForeground(NOTIFICATION_ID, buildNotification())
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val app = application as AcpGatewayApplication
        scope.launch {
            val token = app.credentials.currentToken() ?: return@launch
            val baseUrl = app.credentials.apiBaseUrl.first() ?: return@launch

            client = GatewayWebSocketClient(baseWsUrl = baseUrl) { _ -> /* surfaced via UI state in a real build */ }
            client?.connect(token)
            heartbeatHandler.post(heartbeatRunnable)
        }
        return START_STICKY
    }

    override fun onDestroy() {
        heartbeatHandler.removeCallbacks(heartbeatRunnable)
        client?.disconnect()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun buildNotification(): Notification {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                "Gateway status",
                NotificationManager.IMPORTANCE_LOW,
            )
            getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }

        return NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
            .setContentTitle("ACP Gateway")
            .setContentText("Connected to communications platform")
            .setSmallIcon(android.R.drawable.stat_sys_upload_done)
            .setOngoing(true)
            .build()
    }
}
