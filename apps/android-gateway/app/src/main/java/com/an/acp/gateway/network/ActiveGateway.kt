package com.an.acp.gateway.network

import com.an.acp.gateway.data.OutboxDao

/**
 * Holds a reference to the currently-connected GatewayWebSocketClient and the
 * Room outbox DAO so SmsReceiver/SmsDeliveryReceiver - which are instantiated
 * fresh by the OS on each broadcast, not by us - can reach the live socket
 * and outbox without a bound-service round trip. Set by
 * GatewayConnectionService on connect/disconnect.
 */
object ActiveGateway {
    @Volatile
    var client: GatewayWebSocketClient? = null

    @Volatile
    var outboxDao: OutboxDao? = null
}
