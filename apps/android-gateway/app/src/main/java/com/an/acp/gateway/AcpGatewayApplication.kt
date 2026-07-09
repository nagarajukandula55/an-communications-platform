package com.an.acp.gateway

import android.app.Application
import com.an.acp.gateway.data.AppDatabase
import com.an.acp.gateway.data.DeviceCredentialsStore

class AcpGatewayApplication : Application() {

    lateinit var database: AppDatabase
        private set

    lateinit var credentials: DeviceCredentialsStore
        private set

    override fun onCreate() {
        super.onCreate()
        database = AppDatabase.build(this)
        credentials = DeviceCredentialsStore(this)
    }
}
