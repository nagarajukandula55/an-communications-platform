package com.an.acp.gateway.data

import androidx.room.Entity
import androidx.room.PrimaryKey

enum class OutboxStatus {
    PENDING,
    SENT,
    FAILED,
}

@Entity(tableName = "outbox_messages")
data class OutboxMessage(
    @PrimaryKey val id: String,
    val to: String,
    val body: String,
    val status: OutboxStatus,
    val createdAt: Long,
    val providerMessageId: String? = null,
    val errorMessage: String? = null,
)
