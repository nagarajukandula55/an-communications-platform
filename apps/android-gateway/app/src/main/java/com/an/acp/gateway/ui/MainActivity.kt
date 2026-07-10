package com.an.acp.gateway.ui

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import com.an.acp.gateway.AcpGatewayApplication
import com.an.acp.gateway.network.GatewayConnectionService
import com.an.acp.gateway.network.GatewayEvent
import com.an.acp.gateway.work.WorkScheduler
import kotlinx.coroutines.launch

private val REQUIRED_PERMISSIONS = buildList {
    add(Manifest.permission.SEND_SMS)
    add(Manifest.permission.RECEIVE_SMS)
    add(Manifest.permission.READ_SMS)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        add(Manifest.permission.POST_NOTIFICATIONS)
    }
}

class MainActivity : ComponentActivity() {

    private val permissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { results ->
            hasPermissions = results.values.all { it }
        }

    var hasPermissions = false
        private set

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    GatewayScreen()
                }
            }
        }
        ensurePermissions()
    }

    private fun ensurePermissions() {
        val missing = REQUIRED_PERMISSIONS.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
        if (missing.isEmpty()) {
            hasPermissions = true
        } else {
            permissionLauncher.launch(missing.toTypedArray())
        }
    }

    fun startGatewayServiceIfPaired() {
        if (!hasPermissions) return
        ContextCompat.startForegroundService(this, Intent(this, GatewayConnectionService::class.java))
        WorkScheduler.scheduleSendPendingMessages(this)
    }
}

/**
 * Manual pairing entry: the user pastes the deviceId/token/apiBaseUrl issued
 * by an admin (e.g. via the dashboard's device-registration flow) instead of
 * scanning a QR code. A QR-based flow is out of scope here but this makes
 * DeviceCredentialsStore actually get populated by a real user action.
 */
@Composable
private fun GatewayScreen() {
    val context = LocalContext.current
    val app = context.applicationContext as AcpGatewayApplication
    val scope = rememberCoroutineScope()

    var deviceId by remember { mutableStateOf("") }
    var token by remember { mutableStateOf("") }
    var apiBaseUrl by remember { mutableStateOf("wss://") }
    var paired by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        paired = app.credentials.currentToken() != null
        if (paired) {
            (context as? MainActivity)?.startGatewayServiceIfPaired()
        }
    }

    if (!paired) {
        Column(modifier = Modifier.padding(24.dp)) {
            Text(text = "AN Communications Platform")
            Text(text = "Pair this device")
            OutlinedTextField(value = deviceId, onValueChange = { deviceId = it }, label = { Text("Device ID") })
            OutlinedTextField(value = token, onValueChange = { token = it }, label = { Text("Device token") })
            OutlinedTextField(value = apiBaseUrl, onValueChange = { apiBaseUrl = it }, label = { Text("Gateway URL") })
            Button(onClick = {
                scope.launch {
                    app.credentials.save(deviceId, token, apiBaseUrl)
                    paired = true
                    (context as? MainActivity)?.startGatewayServiceIfPaired()
                }
            }) {
                Text("Pair device")
            }
        }
        return
    }

    val event by GatewayConnectionService.events.collectAsState()
    val status = when (val current = event) {
        null -> "Connecting..."
        is GatewayEvent.Authenticated -> "Connected (device ${current.deviceId})"
        GatewayEvent.HeartbeatAck -> "Connected (heartbeat ok)"
        is GatewayEvent.Error -> "Error: ${current.message}"
        GatewayEvent.Disconnected -> "Disconnected"
        is GatewayEvent.SendSms -> "Sending SMS to ${current.to}"
    }

    Column(modifier = Modifier.padding(24.dp)) {
        Text(text = "AN Communications Platform")
        Text(text = "Android Gateway")
        Text(text = status)
    }
}
