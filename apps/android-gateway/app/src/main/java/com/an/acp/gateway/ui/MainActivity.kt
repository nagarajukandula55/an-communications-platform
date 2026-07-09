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
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import com.an.acp.gateway.network.GatewayConnectionService
import com.an.acp.gateway.work.WorkScheduler

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
            if (results.values.all { it }) {
                startGatewayService()
            }
        }

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
            startGatewayService()
        } else {
            permissionLauncher.launch(missing.toTypedArray())
        }
    }

    private fun startGatewayService() {
        ContextCompat.startForegroundService(this, Intent(this, GatewayConnectionService::class.java))
        WorkScheduler.scheduleSendPendingMessages(this)
    }
}

@Composable
private fun GatewayScreen() {
    // In a complete build this would be a StateFlow<GatewayEvent> collected
    // from a bound GatewayConnectionService, not a static placeholder.
    val status = remember { mutableStateOf("Requesting permissions and connecting...") }

    Column(modifier = Modifier.padding(24.dp)) {
        Text(text = "AN Communications Platform")
        Text(text = "Android Gateway")
        Text(text = status.value)
    }
}
